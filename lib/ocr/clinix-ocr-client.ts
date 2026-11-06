/**
 * Client for the clinix-ocr Cloud Run sidecar (GCP Document AI).
 * Server-only — never expose OCR_SERVICE_KEY to the browser.
 */

export type ClinixOcrPage = {
  page: number;
  text: string;
  label: string;
};

export type ClinixOcrTable = {
  page: number;
  index: number;
  rows: string[][];
};

export type ClinixOcrFormField = {
  name: string;
  value: string;
  confidence?: number;
};

export type ClinixOcrResult = {
  success: boolean;
  text: string;
  method_used: string;
  page_count: number;
  partial: boolean;
  failed_pages: number[];
  failed_chunks: number[];
  processing_ms: number;
  content_sha256?: string;
  error?: string | null;
  pages?: ClinixOcrPage[];
  tables?: ClinixOcrTable[];
  page_labels?: { page: number; label: string }[];
  form_fields?: ClinixOcrFormField[];
};

export function isOcrConfigured() {
  return Boolean((process.env.OCR_SERVICE_URL || "").trim() && (process.env.OCR_SERVICE_KEY || "").trim());
}

export async function callClinixOcr(
  fileBuffer: Buffer,
  filename: string,
  options: { structured?: boolean; mode?: "default" | "onboard" } = {},
): Promise<ClinixOcrResult | null> {
  const base = (process.env.OCR_SERVICE_URL || "").trim().replace(/\/$/, "");
  const key = (process.env.OCR_SERVICE_KEY || "").trim();
  if (!base) return null;
  if (!key) {
    console.warn("[clinixOcrClient] OCR_SERVICE_URL set but OCR_SERVICE_KEY missing");
    return null;
  }

  const form = new FormData();
  const bytes = Uint8Array.from(fileBuffer);
  const lower = filename.toLowerCase();
  const isImage = /\.(jpe?g|png|webp|tiff?)$/.test(lower);
  const mime = isImage
    ? lower.endsWith(".png")
      ? "image/png"
      : lower.endsWith(".webp")
        ? "image/webp"
        : lower.endsWith(".tif") || lower.endsWith(".tiff")
          ? "image/tiff"
          : "image/jpeg"
    : "application/pdf";
  const name = filename || (isImage ? "card.jpg" : "import.pdf");
  const file =
    typeof File !== "undefined"
      ? new File([bytes], name, { type: mime })
      : new Blob([bytes], { type: mime });
  form.append("file", file, name);

  const params = new URLSearchParams();
  if (options.structured || options.mode === "onboard") params.set("structured", "1");
  if (options.mode === "onboard") params.set("mode", "onboard");
  const qs = params.toString();

  const controller = new AbortController();
  const timeoutMs = Number(process.env.OCR_SERVICE_TIMEOUT_MS || 180_000);
  const timer = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const res = await fetch(`${base}/v1/ocr/extract${qs ? `?${qs}` : ""}`, {
      method: "POST",
      headers: { "X-OCR-Service-Key": key },
      body: form,
      signal: controller.signal,
    });
    const json = (await res.json().catch(() => null)) as ClinixOcrResult | null;
    if (!json || typeof json !== "object") {
      console.error("[clinixOcrClient] invalid response", res.status);
      return null;
    }
    if (!json.success) {
      console.warn("[clinixOcrClient] OCR unsuccessful", res.status, json.error, json.method_used);
    }
    return {
      success: Boolean(json.success),
      text: typeof json.text === "string" ? json.text : "",
      method_used: typeof json.method_used === "string" ? json.method_used : "clinix-ocr",
      page_count: Number(json.page_count) || 0,
      partial: Boolean(json.partial),
      failed_pages: Array.isArray(json.failed_pages) ? json.failed_pages : [],
      failed_chunks: Array.isArray(json.failed_chunks) ? json.failed_chunks : [],
      processing_ms: Number(json.processing_ms) || 0,
      content_sha256: typeof json.content_sha256 === "string" ? json.content_sha256 : undefined,
      error: typeof json.error === "string" ? json.error : null,
      pages: Array.isArray(json.pages) ? json.pages : undefined,
      tables: Array.isArray(json.tables) ? json.tables : undefined,
      page_labels: Array.isArray(json.page_labels) ? json.page_labels : undefined,
      form_fields: Array.isArray(json.form_fields) ? json.form_fields : undefined,
    };
  } catch (e) {
    console.error("[clinixOcrClient]", e);
    return null;
  } finally {
    clearTimeout(timer);
  }
}
