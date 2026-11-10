import { resolveOcrActor } from "@/lib/ocr/auth";
import { callClinixOcr, isOcrConfigured, type ClinixOcrResult } from "@/lib/ocr/clinix-ocr-client";
import { downloadOcrInboxFile, isOcrInboxPath, removeOcrInboxFile } from "@/lib/ocr/inbox";
import { mineOnboardDraftSectioned, type OnboardDraft } from "@/lib/ocr/onboard-draft";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_FILES = 6;
const MAX_BYTES = 50 * 1024 * 1024;

function mergeOcr(results: ClinixOcrResult[]): ClinixOcrResult {
  const pages = results.flatMap((item) => item.pages ?? []);
  const tables = results.flatMap((item) => item.tables ?? []);
  const labels = results.flatMap((item) => item.page_labels ?? []);
  const formFields = results.flatMap((item) => item.form_fields ?? []);
  const text = results
    .map((item, index) => (item.text ? `=== FILE ${index + 1} (${item.method_used}) ===\n${item.text}` : ""))
    .filter(Boolean)
    .join("\n\n");
  return {
    success: results.some((item) => item.success),
    text,
    method_used: results.map((item) => item.method_used).filter(Boolean).join(" + ") || "clinix-ocr",
    page_count: results.reduce((sum, item) => sum + (item.page_count || 0), 0),
    partial: results.some((item) => item.partial),
    failed_pages: results.flatMap((item) => item.failed_pages),
    failed_chunks: results.flatMap((item) => item.failed_chunks),
    processing_ms: results.reduce((sum, item) => sum + (item.processing_ms || 0), 0),
    pages,
    tables,
    page_labels: labels,
    form_fields: formFields,
    error: results.find((item) => item.error)?.error ?? null,
  };
}

type StagedFile = { buffer: Buffer; name: string; path?: string };

async function collectFiles(request: Request): Promise<{ files: StagedFile[] } | { error: string; status: number }> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) {
    let body: { paths?: unknown };
    try {
      body = (await request.json()) as { paths?: unknown };
    } catch {
      return { error: "Send JSON with staged upload paths, or multipart files.", status: 400 };
    }
    const paths = Array.isArray(body.paths)
      ? body.paths.filter((item): item is string => typeof item === "string" && isOcrInboxPath(item)).slice(0, MAX_FILES)
      : [];
    if (!paths.length) return { error: "Stage files with /api/ocr/onboard/prepare first.", status: 400 };
    const files: StagedFile[] = [];
    for (const path of paths) {
      const downloaded = await downloadOcrInboxFile(path);
      if (!downloaded.ok) return { error: downloaded.message, status: 400 };
      if (downloaded.buffer.length > MAX_BYTES) {
        return { error: `${downloaded.name} is larger than 50MB.`, status: 413 };
      }
      files.push({ buffer: downloaded.buffer, name: downloaded.name, path });
    }
    return { files };
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return { error: "Send multipart form data or staged upload paths.", status: 400 };
  }
  const uploaded = form
    .getAll("files")
    .concat(form.getAll("file"))
    .filter((item): item is File => typeof File !== "undefined" && item instanceof File);
  if (!uploaded.length) return { error: "Attach at least one PDF or image.", status: 400 };
  if (uploaded.length > MAX_FILES) return { error: `Upload at most ${MAX_FILES} files per import.`, status: 400 };
  const files: StagedFile[] = [];
  for (const file of uploaded) {
    if (file.size > MAX_BYTES) return { error: `${file.name} is larger than 50MB.`, status: 413 };
    files.push({ buffer: Buffer.from(await file.arrayBuffer()), name: file.name || "import.pdf" });
  }
  return { files };
}

export async function POST(request: Request) {
  const actor = await resolveOcrActor(request);
  if (!actor) {
    return Response.json({ message: "Sign in or open a valid intake link to import records." }, { status: 401 });
  }
  if (!(await isOcrConfigured())) {
    return Response.json(
      {
        message:
          "OCR is not configured. Set OCR_SERVICE_URL and OCR_SERVICE_KEY, or seed service_config id=ocr.",
      },
      { status: 503 },
    );
  }

  const collected = await collectFiles(request);
  if ("error" in collected) {
    return Response.json({ message: collected.error }, { status: collected.status });
  }

  const ocrResults: ClinixOcrResult[] = [];
  const stagedPaths: string[] = [];
  const retainInbox = actor.kind !== "staff";
  try {
    for (const file of collected.files) {
      if (file.path) stagedPaths.push(file.path);
      const result = await callClinixOcr(file.buffer, file.name, {
        structured: true,
        mode: "onboard",
      });
      if (!result) {
        return Response.json({ message: `OCR service failed for ${file.name}.` }, { status: 502 });
      }
      ocrResults.push(result);
    }

    const merged = mergeOcr(ocrResults);
    const fingerprints = [
      ...new Set(
        ocrResults
          .map((item) => (typeof item.content_sha256 === "string" ? item.content_sha256.trim().toLowerCase() : ""))
          .filter((item) => /^[a-f0-9]{64}$/.test(item)),
      ),
    ];
    if (!merged.success || !merged.text.trim()) {
      const message = merged.error || "OCR could not extract text from those files.";
      const tooLarge = /too large|file size|413/i.test(message);
      return Response.json(
        {
          message,
          ocr: merged,
          fingerprints,
        },
        { status: tooLarge ? 413 : 422 },
      );
    }

    const { draft, corpus }: { draft: OnboardDraft; corpus: string } = await mineOnboardDraftSectioned({
      text: merged.text,
      pages: merged.pages,
      tables: merged.tables,
      formFields: merged.form_fields,
    });

    return Response.json({
      draft,
      fingerprints,
      corpus,
      corpusChars: corpus.length,
      retainedPaths: retainInbox ? stagedPaths : [],
      ocr: {
        success: merged.success,
        method_used: merged.method_used,
        page_count: merged.page_count,
        partial: merged.partial,
        processing_ms: merged.processing_ms,
        page_labels: merged.page_labels ?? [],
        failed_pages: merged.failed_pages ?? [],
        form_field_count: merged.form_fields?.length ?? 0,
      },
    });
  } finally {
    if (!retainInbox) {
      await Promise.all(stagedPaths.map((path) => removeOcrInboxFile(path)));
    }
  }
}
