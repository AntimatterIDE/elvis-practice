import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const bucket = "chart-files";
const prefix = "ocr-inbox";
const maxBytes = 50 * 1024 * 1024;

const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/tiff",
  "application/octet-stream",
]);

function safeSegment(value: string) {
  return /^[A-Za-z0-9_-]{1,80}$/.test(value);
}

export function isOcrInboxPath(path: string) {
  const parts = path.split("/");
  return parts.length === 3 && parts[0] === prefix && safeSegment(parts[1]) && Boolean(parts[2]);
}

async function readyBucket() {
  const supabase = createSupabaseAdminClient();
  const existing = await supabase.storage.getBucket(bucket);
  if (existing.data) return supabase;
  const created = await supabase.storage.createBucket(bucket, { public: false, fileSizeLimit: maxBytes });
  if (created.error && !/already exists/i.test(created.error.message)) {
    throw new Error(created.error.message);
  }
  return supabase;
}

export async function prepareOcrInboxUpload(input: {
  staffId: string;
  contentType: string;
  byteSize: number;
  fileName?: string;
}) {
  if (!safeSegment(input.staffId)) return { ok: false as const, message: "Sign in as staff to upload." };
  if (!allowedTypes.has(input.contentType)) {
    return { ok: false as const, message: "Upload a PDF or image (JPEG/PNG/WebP)." };
  }
  if (!Number.isFinite(input.byteSize) || input.byteSize < 1 || input.byteSize > maxBytes) {
    return { ok: false as const, message: "Each file has to be 50 MB or smaller." };
  }
  const rawName = (input.fileName || "import.pdf").replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 80);
  const path = `${prefix}/${input.staffId}/${Date.now()}_${crypto.randomUUID().slice(0, 8)}_${rawName}`;
  const supabase = await readyBucket();
  const signed = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (signed.error || !signed.data) {
    return { ok: false as const, message: signed.error?.message || "That file could not be staged." };
  }
  return { ok: true as const, path, signedUrl: signed.data.signedUrl };
}

export async function downloadOcrInboxFile(path: string) {
  if (!isOcrInboxPath(path)) return { ok: false as const, message: "Invalid OCR upload path." };
  const supabase = await readyBucket();
  const downloaded = await supabase.storage.from(bucket).download(path);
  if (downloaded.error || !downloaded.data) {
    return { ok: false as const, message: downloaded.error?.message || "Staged file not found." };
  }
  const buffer = Buffer.from(await downloaded.data.arrayBuffer());
  const name = path.split("/").pop() || "import.pdf";
  return { ok: true as const, buffer, name };
}

export async function removeOcrInboxFile(path: string) {
  if (!isOcrInboxPath(path)) return;
  try {
    const supabase = await readyBucket();
    await supabase.storage.from(bucket).remove([path]);
  } catch {
    // best-effort cleanup
  }
}
