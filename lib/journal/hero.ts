import "server-only";
import { cache } from "react";
import { journalCoverKind, journalPhotoIsScan, searchJournalPhoto, type JournalPhoto } from "@/lib/journal/photo";
import { publishedJournalArticles } from "@/lib/journal/store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

const bucket = "journal-covers";
const maxScans = 2;

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
  kind: "photo" | "scan" | null;
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
  const url = objectUrl(slug, "jpg");
  const metaUrl = objectUrl(slug, "json");
  if (!url || !metaUrl) return null;
  try {
    const [image, meta] = await Promise.all([
      fetch(url, { method: "HEAD", cache: "no-store", signal: AbortSignal.timeout(8000) }),
      fetch(metaUrl, { cache: "no-store", signal: AbortSignal.timeout(8000) }),
    ]);
    if (!image.ok) return null;
    let credit: string | null = null;
    let source: string | null = null;
    let version = "1";
    let kind: StoredCover["kind"] = null;
    if (meta.ok) {
      const payload = (await meta.json()) as { credit?: string; source?: string; version?: string; kind?: string };
      credit = payload.credit?.trim() || null;
      source = payload.source?.trim() || null;
      version = payload.version?.trim() || "1";
      kind = payload.kind === "photo" || payload.kind === "scan" ? payload.kind : null;
    }
    return {
      url: `${url}?v=${encodeURIComponent(version).slice(0, 48)}`,
      credit,
      source,
      kind,
    };
  } catch {
    return null;
  }
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

export async function prepareJournalCovers(articles: CoverArticle[]) {
  const stored = await Promise.all(articles.map((article) => readStoredCover(article.slug)));
  const used = new Set<string>();
  let scans = 0;
  const covers = new Map<string, JournalHero | null>();

  for (let index = 0; index < articles.length; index += 1) {
    const article = articles[index];
    const current = stored[index];
    const source = current?.source ?? "";
    const kind = current?.kind;
    const duplicate = Boolean(source) && used.has(source);
    const keep = Boolean(current && kind && !duplicate && (kind === "photo" || (kind === "scan" && scans < maxScans)));
    if (keep && current && kind) {
      if (kind === "scan") scans += 1;
      if (source) used.add(source);
      covers.set(article.slug, { url: current.url, credit: current.credit });
      continue;
    }
    try {
      const wantScan = scans < maxScans && index % 3 === 2;
      const photo = await searchJournalPhoto([article.title, article.summary].filter((part) => part.trim()).join(". "), {
        used: [...used],
        preferPhoto: !wantScan,
      });
      if (!photo) {
        covers.set(article.slug, current ? { url: current.url, credit: current.credit } : null);
        if (source) used.add(source);
        continue;
      }
      const saved = await saveJournalHero(article.slug, photo);
      if (!saved) {
        covers.set(article.slug, current ? { url: current.url, credit: current.credit } : null);
        continue;
      }
      used.add(saved.source);
      if (saved.kind === "scan" || journalCoverKind(saved.source) === "scan") scans += 1;
      covers.set(article.slug, { url: saved.url, credit: saved.credit });
    } catch {
      covers.set(article.slug, current ? { url: current.url, credit: current.credit } : null);
    }
  }

  return covers;
}

export const publishedJournalCovers = cache(async () => {
  const articles = await publishedJournalArticles();
  const covers = await prepareJournalCovers(articles);
  return { articles, covers };
});

export const ensureJournalHero = cache(async (article: CoverArticle) => {
  try {
    if (article.reviewStatus === "approved") {
      const { covers } = await publishedJournalCovers();
      return covers.get(article.slug) ?? null;
    }
    const existing = await findJournalHero(article.slug);
    if (existing) return existing;
    return await createJournalHero(article.summary, article.title, article.slug);
  } catch {
    return null;
  }
});
