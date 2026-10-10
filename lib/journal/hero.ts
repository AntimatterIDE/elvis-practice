import "server-only";
import { cache } from "react";
import { searchJournalPhoto } from "@/lib/journal/photo";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const bucket = "journal-covers";

export type JournalHero = {
  url: string;
  credit: string | null;
};

function objectUrl(slug: string, name: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");
  if (!base) return null;
  return `${base}/storage/v1/object/public/${bucket}/${slug}.${name}`;
}

async function readyBucket() {
  const supabase = createSupabaseAdminClient();
  const existing = await supabase.storage.getBucket(bucket);
  if (!existing.data) {
    const created = await supabase.storage.createBucket(bucket, {
      public: true,
      fileSizeLimit: 8_000_000,
      allowedMimeTypes: ["image/jpeg", "image/png", "application/json"],
    });
    if (created.error && !/already exists/i.test(created.error.message)) {
      throw new Error(created.error.message);
    }
  } else {
    await supabase.storage.updateBucket(bucket, {
      public: true,
      fileSizeLimit: 8_000_000,
      allowedMimeTypes: ["image/jpeg", "image/png", "application/json"],
    });
  }
  return supabase;
}

async function storedCredit(slug: string) {
  const url = objectUrl(slug, "json");
  if (!url) return null;
  try {
    const response = await fetch(url, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    const payload = (await response.json()) as { credit?: string };
    return payload.credit?.trim() || null;
  } catch {
    return null;
  }
}

export async function findJournalHero(slug: string): Promise<JournalHero | null> {
  const url = objectUrl(slug, "jpg");
  if (!url) return null;
  try {
    const response = await fetch(url, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!response.ok) return null;
    return { url, credit: await storedCredit(slug) };
  } catch {
    return null;
  }
}

export async function createJournalHero(topic: string, title: string, slug: string) {
  const photo = await searchJournalPhoto(topic.trim() || title);
  if (!photo) return null;
  const file = await fetch(photo.thumbUrl, {
    headers: { "user-agent": "TheAlignmentClinic/1.0 (https://thealignmentclinic.com; admin@thealignmentclinic.com)" },
    signal: AbortSignal.timeout(15000),
  });
  if (!file.ok) return null;
  const bytes = new Uint8Array(await file.arrayBuffer());
  if (bytes.byteLength < 8000 || bytes.byteLength > 7_000_000) return null;
  const supabase = await readyBucket();
  const uploaded = await supabase.storage.from(bucket).upload(`${slug}.jpg`, bytes, {
    contentType: "image/jpeg",
    cacheControl: "31536000",
    upsert: true,
  });
  if (uploaded.error) return null;
  await supabase.storage.from(bucket).upload(
    `${slug}.json`,
    new TextEncoder().encode(JSON.stringify({ credit: photo.credit, source: photo.pageUrl })),
    { contentType: "application/json", upsert: true },
  );
  await supabase.storage.from(bucket).remove([`${slug}.png`]);
  const url = objectUrl(slug, "jpg");
  return url ? { url, credit: photo.credit } : null;
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
