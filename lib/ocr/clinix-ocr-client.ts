/**
 * Client for the clinix-ocr Cloud Run sidecar (GCP Document AI).
 * Server-only — never expose OCR_SERVICE_KEY to the browser.
 *
 * Credentials: process.env first, else Supabase `service_config` row id=ocr
 * (so production works without Vercel env access).
 */

import { createSupabaseAdminClient } from "@/lib/supabase/admin";

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

type OcrCreds = { url: string; key: string };

let cachedCreds: OcrCreds | null = null;
let cachedAt = 0;
const CACHE_MS = 60_000;

async function loadCredsFromSupabase(): Promise<OcrCreds | null> {
  try {
    const supabase = createSupabaseAdminClient();
    // Table added in 20261106021500_service_config; not yet in generated Database types.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { data, error } = await (supabase as any).from("service_config").select("value").eq("id", "ocr").maybeSingle();
    if (error || !data) return null;
    const value = (data as { value?: unknown }).value;
    if (!value || typeof value !== "object") return null;
    const row = value as Record<string, unknown>;
    const url = typeof row.url === "string" ? row.url.trim().replace(/\/$/, "") : "";
    const key = typeof row.key === "string" ? row.key.trim() : "";
    if (!url || !key) return null;
    return { url, key };
  } catch (e) {
    console.warn("[clinixOcrClient] service_config read failed", e);
    return null;
  }
}

export async function resolveOcrCreds(): Promise<OcrCreds | null> {
  const envUrl = (process.env.OCR_SERVICE_URL || "").trim().replace(/\/$/, "");
  const envKey = (process.env.OCR_SERVICE_KEY || "").trim();
  if (envUrl && envKey) return { url: envUrl, key: envKey };

  const now = Date.now();
  if (cachedCreds && now - cachedAt < CACHE_MS) return cachedCreds;
  const fromDb = await loadCredsFromSupabase();
  cachedCreds = fromDb;
  cachedAt = now;
  return fromDb;
}

export async function isOcrConfigured() {
  return Boolean(await resolveOcrCreds());
}

export async function callClinixOcr(
  fileBuffer: Buffer,
  filename: string,
  options: { structured?: boolean; mode?: "default" | "onboard" } = {},
): Promise<ClinixOcrResult | null> {
  const creds = await resolveOcrCreds();
  if (!creds) {
    console.warn("[clinixOcrClient] OCR credentials missing (env and service_config)");
    return null;
  }
  const { url: base, key } = creds;

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
    const json = (await res.json().catch(() => null)) as (ClinixOcrResult & { detail?: unknown }) | null;
    if (!json || typeof json !== "object") {
      console.error("[clinixOcrClient] invalid response", res.status);
      return null;
    }
    const detailError = (() => {
      const detail = json.detail;
      if (typeof detail === "string" && detail.trim()) return detail.trim();
      if (Array.isArray(detail) && detail[0] && typeof detail[0] === "object") {
        const msg = (detail[0] as { msg?: unknown }).msg;
        if (typeof msg === "string" && msg.trim()) return msg.trim();
      }
      return null;
    })();
    const error =
      (typeof json.error === "string" && json.error.trim() ? json.error.trim() : null) ||
      (!res.ok ? detailError : null);
    if (!json.success || !res.ok) {
      console.warn("[clinixOcrClient] OCR unsuccessful", res.status, error, json.method_used);
    }
    return {
      success: Boolean(json.success) && res.ok,
      text: typeof json.text === "string" ? json.text : "",
      method_used: typeof json.method_used === "string" ? json.method_used : "clinix-ocr",
      page_count: Number(json.page_count) || 0,
      partial: Boolean(json.partial),
      failed_pages: Array.isArray(json.failed_pages) ? json.failed_pages : [],
      failed_chunks: Array.isArray(json.failed_chunks) ? json.failed_chunks : [],
      processing_ms: Number(json.processing_ms) || 0,
      content_sha256: typeof json.content_sha256 === "string" ? json.content_sha256 : undefined,
      error,
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
