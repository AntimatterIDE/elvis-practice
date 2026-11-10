import type { OnboardDraft } from "@/lib/ocr/onboard-draft";

export type OnboardExtractOcrMeta = {
  method_used: string;
  page_count: number;
  partial: boolean;
  processing_ms: number;
  page_labels: { page: number; label: string }[];
  /** Pages that contributed little/no text after OCR (1-indexed). */
  failed_pages?: number[];
};

export type OnboardExtractResult = {
  ok: true;
  draft: OnboardDraft;
  fingerprints: string[];
  ocr: OnboardExtractOcrMeta | null;
};

export type OnboardExtractFailure = {
  ok: false;
  message: string;
  status: number;
};

const DIRECT_LIMIT = 3.5 * 1024 * 1024;

async function sha256Hex(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

async function stageLargeFile(file: File, headers: HeadersInit) {
  const prepared = await fetch("/api/ocr/onboard/prepare", {
    method: "POST",
    headers: { "content-type": "application/json", ...headers },
    body: JSON.stringify({
      fileName: file.name,
      contentType: file.type || "application/pdf",
      byteSize: file.size,
    }),
  });
  const preparedJson = (await prepared.json().catch(() => null)) as
    | { path?: string; signedUrl?: string; message?: string }
    | null;
  if (!prepared.ok || !preparedJson?.path || !preparedJson.signedUrl) {
    throw new Error(preparedJson?.message || "Could not stage that file for OCR.");
  }
  const uploaded = await fetch(preparedJson.signedUrl, {
    method: "PUT",
    headers: { "content-type": file.type || "application/pdf" },
    body: file,
  });
  if (!uploaded.ok) throw new Error(`Upload failed for ${file.name} (${uploaded.status}).`);
  return preparedJson.path;
}

/** Browser helper: stage large PDFs, then call onboard extract. */
export async function extractOnboardFromFiles(
  files: File[],
  options: { headers?: HeadersInit } = {},
): Promise<OnboardExtractResult | OnboardExtractFailure> {
  if (!files.length) return { ok: false, message: "Choose at least one file.", status: 400 };
  const headers = options.headers ?? {};
  try {
    const localHashes = await Promise.all(files.map((file) => sha256Hex(file)));
    const large = files.filter((file) => file.size > DIRECT_LIMIT);
    const small = files.filter((file) => file.size <= DIRECT_LIMIT);

    let res: Response;
    if (large.length) {
      const paths = await Promise.all(large.map((file) => stageLargeFile(file, headers)));
      for (const file of small) paths.push(await stageLargeFile(file, headers));
      res = await fetch("/api/ocr/onboard/extract", {
        method: "POST",
        headers: { "content-type": "application/json", ...headers },
        body: JSON.stringify({ paths }),
      });
    } else {
      const body = new FormData();
      small.forEach((file) => body.append("files", file));
      res = await fetch("/api/ocr/onboard/extract", { method: "POST", headers, body });
    }

    const json = (await res.json().catch(() => null)) as {
      draft?: OnboardDraft;
      fingerprints?: string[];
      ocr?: OnboardExtractOcrMeta;
      message?: string;
    } | null;
    if (!res.ok || !json?.draft) {
      return { ok: false, message: json?.message || `OCR import failed (${res.status}).`, status: res.status };
    }
    const fingerprints = [
      ...new Set([...(json.fingerprints ?? []), ...localHashes].map((item) => item.toLowerCase())),
    ];
    return {
      ok: true,
      draft: json.draft,
      fingerprints,
      ocr: json.ocr ?? null,
    };
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    return {
      ok: false,
      message: message || "Could not reach the OCR import API.",
      status: 0,
    };
  }
}
