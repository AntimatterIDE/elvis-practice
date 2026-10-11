import "server-only";
import { cache } from "react";
import { journalPhotoIsScan, searchJournalPhoto, type JournalPhoto } from "@/lib/journal/photo";
import { publishedJournalArticles } from "@/lib/journal/store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const bucket = "journal-covers";

export type JournalHero = {
  url: string;
  credit: string | null;
};

type CoverArticle = {
  slug: string;
  title: string;
  summary: string;
  reviewStatus?: string;
};

type StoredCover = JournalHero & {
  source: string | null;
  kind: "photo" | "scan" | "upload" | null;
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

async function readStoredCover(slug: string): Promise<StoredCover | null> {
  const metaUrl = objectUrl(slug, "json");
  if (!metaUrl) return null;
  let credit: string | null = null;
  let source: string | null = null;
  let version = "1";
  let kind: StoredCover["kind"] = null;
  let ext: "jpg" | "png" = "jpg";
  try {
    const meta = await fetch(metaUrl, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (meta.ok) {
      const payload = (await meta.json()) as { credit?: string; source?: string; version?: string; kind?: string; ext?: string };
      credit = payload.credit?.trim() || null;
      source = payload.source?.trim() || null;
      version = payload.version?.trim() || "1";
      kind = payload.kind === "photo" || payload.kind === "scan" || payload.kind === "upload" ? payload.kind : null;
      if (payload.ext === "png") ext = "png";
    }
  } catch {
    credit = null;
  }
  const primary = objectUrl(slug, ext);
  const fallback = objectUrl(slug, ext === "png" ? "jpg" : "png");
  for (const url of [primary, fallback]) {
    if (!url) continue;
    try {
      const image = await fetch(url, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(8000) });
      if (!image.ok) continue;
      return { url: `${url}?v=${encodeURIComponent(version).slice(0, 48)}`, credit, source, kind };
    } catch {
      continue;
    }
  }
  return null;
}

async function saveJournalHero(slug: string, photo: JournalPhoto) {
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
  const version = String(Date.now());
  const kind = journalPhotoIsScan(photo) ? "scan" : "photo";
  await supabase.storage.from(bucket).upload(
    `${slug}.json`,
    new TextEncoder().encode(JSON.stringify({ credit: photo.credit, source: photo.pageUrl, version, kind })),
    { contentType: "application/json", upsert: true },
  );
  await supabase.storage.from(bucket).remove([`${slug}.png`]);
  const url = objectUrl(slug, "jpg");
  if (!url) return null;
  return { url: `${url}?v=${version}`, credit: photo.credit, source: photo.pageUrl, kind };
}

export async function findJournalHero(slug: string): Promise<JournalHero | null> {
  const stored = await readStoredCover(slug);
  return stored ? { url: stored.url, credit: stored.credit } : null;
}

export async function createJournalHero(
  topic: string,
  title: string,
  slug: string,
  choice?: { used?: string[]; preferPhoto?: boolean },
) {
  const photo = await searchJournalPhoto([title, topic].filter((part) => part.trim()).join(". "), choice);
  if (!photo) return null;
  return saveJournalHero(slug, photo);
}

export async function saveJournalCoverFile(slug: string, bytes: Uint8Array, mime: "image/jpeg" | "image/png") {
  if (bytes.byteLength < 1000 || bytes.byteLength > 7_000_000) return null;
  const ext = mime === "image/png" ? "png" : "jpg";
  const supabase = await readyBucket();
  const uploaded = await supabase.storage.from(bucket).upload(`${slug}.${ext}`, bytes, {
    contentType: mime,
    cacheControl: "31536000",
    upsert: true,
  });
  if (uploaded.error) return null;
  const version = String(Date.now());
  await supabase.storage.from(bucket).upload(
    `${slug}.json`,
    new TextEncoder().encode(JSON.stringify({ credit: "Photo · The Alignment Clinic", source: "upload", version, kind: "upload", ext })),
    { contentType: "application/json", upsert: true },
  );
  await supabase.storage.from(bucket).remove([ext === "png" ? `${slug}.jpg` : `${slug}.png`]);
  const url = objectUrl(slug, ext);
  return url ? { url: `${url}?v=${version}`, credit: "Photo · The Alignment Clinic" } : null;
}

export const publishedJournalCovers = cache(async () => {
  const articles = await publishedJournalArticles();
  const stored = await Promise.all(articles.map((article) => readStoredCover(article.slug).catch(() => null)));
  const covers = new Map<string, JournalHero | null>();
  articles.forEach((article, index) => {
    const current = stored[index];
    covers.set(article.slug, current ? { url: current.url, credit: current.credit } : null);
  });
  return { articles, covers };
});

export const ensureJournalHero = cache(async (article: CoverArticle) => {
  try {
    const existing = await findJournalHero(article.slug);
    if (existing || article.reviewStatus === "approved") return existing;
    return await createJournalHero(article.summary, article.title, article.slug);
  } catch {
    return null;
  }
});
