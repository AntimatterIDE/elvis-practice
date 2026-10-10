import "server-only";
import { cache } from "react";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { practice } from "@/lib/site";

const bucket = "journal-covers";

function publicUrl(slug: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucket}/${slug}.png`;
}

async function readyBucket() {
  const supabase = createSupabaseAdminClient();
  const existing = await supabase.storage.getBucket(bucket);
  if (!existing.data) {
    const created = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 4_000_000,
      allowedMimeTypes: ["image/png"],
    });
    if (created.error && !/already exists/i.test(created.error.message)) {
      throw new Error(created.error.message);
    }
  } else if (!existing.data.public) {
    const updated = await supabase.storage.updateBucket(bucket, { public: true });
    if (updated.error) throw new Error(updated.error.message);
  }
  return supabase;
}

async function onePng(apiKey: string, body: Record<string, unknown>, timeoutMs: number) {
  const response = await fetch("https://api.openai.com/v1/images/generations", {
    method: "POST",
    headers: { authorization: `Bearer ${apiKey}`, "content-type": "application/json" },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(timeoutMs),
  });
  const payload = (await response.json()) as {
    data?: { b64_json?: string; url?: string }[];
  };
  if (!response.ok) return null;
  const item = payload.data?.[0];
  if (item?.b64_json) return Buffer.from(item.b64_json, "base64");
  if (!item?.url) return null;
  const file = await fetch(item.url, { signal: AbortSignal.timeout(15000) });
  return file.ok ? Buffer.from(await file.arrayBuffer()) : null;
}

async function openaiPng(prompt: string) {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) return null;
  const primary = await onePng(
    apiKey,
    { model: "gpt-image-1", prompt, size: "1536x1024", quality: "medium", n: 1 },
    30000,
  ).catch(() => null);
  if (primary) return primary;
  return onePng(
    apiKey,
    { model: "dall-e-3", prompt, size: "1792x1024", response_format: "b64_json", n: 1 },
    20000,
  ).catch(() => null);
}

export async function findJournalHero(slug: string) {
  const url = publicUrl(slug);
  if (!url) return null;
  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(8000) });
    return response.ok ? url : null;
  } catch {
    return null;
  }
}

export async function createJournalHero(topic: string, title: string, slug: string) {
  const subject = topic.trim() || title;
  const prompt = `Original editorial photograph for a clinic article about ${subject}. ${practice.name} specializes in this part of orthopedic spine care. Show a calm, dignified, wide view related to that anatomy: a tasteful medical illustration or quiet clinical still life, navy and teal light, no text, no letters, no logo, no watermark, no identifiable person, no blood, and no graphic surgery.`;
  const bytes = await openaiPng(prompt);
  if (!bytes) return null;
  const supabase = await readyBucket();
  const uploaded = await supabase.storage.from(bucket).upload(`${slug}.png`, new Uint8Array(bytes), {
    contentType: "image/png",
    cacheControl: "31536000",
    upsert: true,
  });
  if (uploaded.error) return null;
  return publicUrl(slug);
}

export const ensureJournalHero = cache(async (article: { slug: string; title: string; summary: string }) => {
  try {
    const existing = await findJournalHero(article.slug);
    if (existing) return existing;
    return await createJournalHero(article.summary, article.title, article.slug);
  } catch {
    return null;
  }
});
