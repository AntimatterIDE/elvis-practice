const extensionTypes: Record<string, string> = {
  heic: "image/heic",
  heif: "image/heif",
  pdf: "application/pdf",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  mp4: "video/mp4",
  mov: "video/quicktime",
  webm: "video/webm",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  gif: "image/gif",
  webp: "image/webp",
};

export function chartFileType(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase() ?? "";
  const fromName = extensionTypes[extension] ?? "";
  if (file.type && file.type !== "application/octet-stream") return file.type;
  return fromName;
}

async function failureMessage(response: Response) {
  let text = "";
  try {
    const payload = (await response.json()) as { message?: string; error?: string };
    text = `${payload.message ?? ""} ${payload.error ?? ""}`;
  } catch {
    text = "";
  }
  if (/mime|content type/i.test(text)) return "Store a photo, a PDF, a Word file, or a video.";
  if (/too large|payload|entity/i.test(text)) return "Each file has to be 50 MB or smaller.";
  if (/bucket/i.test(text)) return "Chart files are not available yet.";
  return "That file could not be stored.";
}

export async function putSignedChartFile(signedUrl: string, file: File, contentType: string) {
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!anon) return { ok: false as const, message: "The practice database is not connected." };
  const named = file.name || "upload";
  const typed = file.type === contentType ? file : new File([file], named, { type: contentType });
  const body = new FormData();
  body.append("cacheControl", "3600");
  body.append("", typed);
  try {
    const response = await fetch(signedUrl, {
      method: "PUT",
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      body,
    });
    if (!response.ok) return { ok: false as const, message: await failureMessage(response) };
  } catch {
    return { ok: false as const, message: "That file could not be stored. Check the connection and try again." };
  }
  return { ok: true as const };
}
