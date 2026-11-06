import { callClinixOcr, isOcrConfigured, type ClinixOcrResult } from "@/lib/ocr/clinix-ocr-client";
import { buildMinerCorpus, mineOnboardDraft, type OnboardDraft } from "@/lib/ocr/onboard-draft";
import { getStaffSession } from "@/lib/supabase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MAX_FILES = 6;
const MAX_BYTES = 20 * 1024 * 1024;

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

export async function POST(request: Request) {
  if (!(await getStaffSession())) {
    return Response.json({ message: "Sign in as staff to import outside records." }, { status: 401 });
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

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return Response.json({ message: "Send multipart form data with PDF or card images." }, { status: 400 });
  }

  const files = form
    .getAll("files")
    .concat(form.getAll("file"))
    .filter((item): item is File => typeof File !== "undefined" && item instanceof File);
  if (files.length === 0) {
    return Response.json({ message: "Attach at least one PDF or image." }, { status: 400 });
  }
  if (files.length > MAX_FILES) {
    return Response.json({ message: `Upload at most ${MAX_FILES} files per import.` }, { status: 400 });
  }

  const ocrResults: ClinixOcrResult[] = [];
  for (const file of files) {
    if (file.size > MAX_BYTES) {
      return Response.json({ message: `${file.name} is larger than 20MB.` }, { status: 413 });
    }
    const buffer = Buffer.from(await file.arrayBuffer());
    const result = await callClinixOcr(buffer, file.name || "import.pdf", {
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
    return Response.json(
      {
        message: merged.error || "OCR could not extract text from those files.",
        ocr: merged,
        fingerprints,
      },
      { status: 422 },
    );
  }

  const corpus = buildMinerCorpus({
    text: merged.text,
    pages: merged.pages,
    tables: merged.tables,
    formFields: merged.form_fields,
  });
  const draft: OnboardDraft = await mineOnboardDraft(corpus);

  return Response.json({
    draft,
    fingerprints,
    ocr: {
      success: merged.success,
      method_used: merged.method_used,
      page_count: merged.page_count,
      partial: merged.partial,
      processing_ms: merged.processing_ms,
      page_labels: merged.page_labels ?? [],
      form_field_count: merged.form_fields?.length ?? 0,
    },
  });
}
