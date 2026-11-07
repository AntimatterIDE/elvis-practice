import "server-only";
import { objectKey, storedFileName } from "@/lib/chart-files/names";
import type { ChartFile } from "@/lib/chart-files/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export type { ChartFile };

const bucket = "chart-files";
const maxBytes = 50 * 1024 * 1024;

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/heic",
  "image/heif",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "video/mp4",
  "video/quicktime",
  "video/webm",
]);

function client() {
  try {
    return createSupabaseAdminClient();
  } catch {
    return null;
  }
}

function safeId(value: string) {
  return /^[A-Za-z0-9_-]{1,80}$/.test(value);
}

function ownedPath(patientId: string, path: string) {
  const parts = path.split("/");
  return parts.length === 3 && parts[0] === patientId && safeId(parts[1]) && storedFileName(parts[2]) !== null;
}

async function ready(supabase: NonNullable<ReturnType<typeof client>>) {
  const existing = await supabase.storage.getBucket(bucket);
  if (existing.data) return true;
  const created = await supabase.storage.createBucket(bucket, { public: false, fileSizeLimit: maxBytes });
  return !created.error || /already exists/i.test(created.error.message);
}

function labelOf(name: string, contentType: string) {
  const stored = storedFileName(name);
  if (stored) return stored;
  if (contentType.startsWith("image/")) return "Photo";
  if (contentType.startsWith("video/")) return "Video";
  if (contentType === "application/pdf") return "PDF";
  if (contentType === "application/msword" || contentType.includes("wordprocessingml")) return "Word document";
  return "File";
}

export async function listChartFiles(patientId: string): Promise<{ ok: true; files: ChartFile[] } | { ok: false; message: string }> {
  const supabase = client();
  if (!supabase) return { ok: false, message: "The practice database is not connected." };
  if (!safeId(patientId)) return { ok: false, message: "That chart could not be opened." };
  if (!(await ready(supabase))) return { ok: false, message: "Chart files are not available yet." };
  const folder = await supabase.storage.from(bucket).list(patientId, { limit: 100 });
  if (folder.error) return { ok: false, message: "The chart files could not be opened." };
  const slots = (folder.data ?? []).filter((item) => item.id === null).map((item) => item.name).filter(safeId);
  const files: ChartFile[] = [];
  for (const slotId of slots) {
    const children = await supabase.storage.from(bucket).list(`${patientId}/${slotId}`, { limit: 40 });
    if (children.error) continue;
    for (const file of children.data ?? []) {
      if (!file.id || storedFileName(file.name) === null) continue;
      const path = `${patientId}/${slotId}/${file.name}`;
      const signed = await supabase.storage.from(bucket).createSignedUrl(path, 600);
      const contentType = file.metadata?.mimetype ?? "";
      files.push({
        slotId,
        path,
        label: labelOf(file.name, contentType),
        contentType,
        size: Number(file.metadata?.size) || 0,
        createdAt: file.created_at ?? "",
        url: signed.data?.signedUrl ?? "",
      });
    }
  }
  return { ok: true, files };
}

export async function prepareChartUpload(input: {
  patientId: string;
  slotId: string;
  contentType: string;
  byteSize: number;
  fileName?: string;
}) {
  const supabase = client();
  if (!supabase) return { ok: false as const, message: "The practice database is not connected." };
  if (!safeId(input.patientId) || !safeId(input.slotId)) return { ok: false as const, message: "That file could not be stored." };
  if (!allowedTypes.has(input.contentType)) return { ok: false as const, message: "Store a photo, a PDF, a Word file, or a video." };
  if (!Number.isFinite(input.byteSize) || input.byteSize < 1 || input.byteSize > maxBytes) {
    return { ok: false as const, message: "Each file has to be 50 MB or smaller." };
  }
  if (!(await ready(supabase))) return { ok: false as const, message: "Chart files are not available yet." };
  const path = `${input.patientId}/${input.slotId}/${objectKey(typeof input.fileName === "string" ? input.fileName : "")}`;
  const signed = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (signed.error || !signed.data) {
    const detail = signed.error?.message ?? "";
    if (/bucket/i.test(detail)) return { ok: false as const, message: "Chart files are not available yet." };
    return { ok: false as const, message: "That file could not be stored." };
  }
  return { ok: true as const, path, signedUrl: signed.data.signedUrl };
}

export async function removeChartFile(patientId: string, path: string) {
  const supabase = client();
  if (!supabase) return { ok: false as const, message: "The practice database is not connected." };
  if (!ownedPath(patientId, path)) return { ok: false as const, message: "That file could not be removed." };
  const removed = await supabase.storage.from(bucket).remove([path]);
  if (removed.error) return { ok: false as const, message: "That file could not be removed." };
  return { ok: true as const };
}

/** Store generated bytes on a chart slot and return a short-lived signed URL. */
export async function storeChartBytes(input: {
  patientId: string;
  slotId: string;
  fileName: string;
  contentType: string;
  bytes: Buffer | Uint8Array;
}) {
  const supabase = client();
  if (!supabase) return { ok: false as const, message: "The practice database is not connected." };
  if (!safeId(input.patientId) || !safeId(input.slotId)) {
    return { ok: false as const, message: "That file could not be stored." };
  }
  if (!allowedTypes.has(input.contentType)) {
    return { ok: false as const, message: "Store a photo, a PDF, a Word file, or a video." };
  }
  if (!Number.isFinite(input.bytes.byteLength) || input.bytes.byteLength < 1 || input.bytes.byteLength > maxBytes) {
    return { ok: false as const, message: "Each file has to be 50 MB or smaller." };
  }
  if (!(await ready(supabase))) return { ok: false as const, message: "Chart files are not available yet." };
  const path = `${input.patientId}/${input.slotId}/${objectKey(input.fileName)}`;
  const uploaded = await supabase.storage.from(bucket).upload(path, input.bytes, {
    contentType: input.contentType,
    upsert: false,
  });
  if (uploaded.error) {
    const detail = uploaded.error.message ?? "";
    if (/bucket/i.test(detail)) return { ok: false as const, message: "Chart files are not available yet." };
    return { ok: false as const, message: "That file could not be stored." };
  }
  const signed = await supabase.storage.from(bucket).createSignedUrl(path, 600);
  return {
    ok: true as const,
    path,
    url: signed.data?.signedUrl ?? "",
    label: labelOf(path.split("/").pop() ?? input.fileName, input.contentType),
  };
}
