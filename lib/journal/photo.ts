export type JournalPhoto = {
  title: string;
  mime: string;
  width: number;
  height: number;
  license: string;
  categories: string;
  credit: string;
  thumbUrl: string;
  pageUrl: string;
};

const stopWords = new Set([
  "the",
  "and",
  "at",
  "of",
  "a",
  "an",
  "for",
  "with",
  "from",
  "this",
  "that",
  "into",
  "its",
  "understanding",
  "alignment",
  "clinic",
  "specializes",
  "insights",
  "based",
  "recent",
  "research",
  "about",
  "what",
  "they",
  "found",
]);

const anatomy = /spin(e|al)|vertebr|skeleton|lumbar|cervical|thoracic|sacrum|pelvis|disc/;
const banned =
  /3d|render|reconstruction|blender|\bcgi\b|animation|diagram|drawing|illustration|schematic|blausen|generated|midjourney|dall-?e|engraving|painting|cartoon|malignant|tumou?r|\bblood\b|fracture|tulip|wolf|urchin|fossil|nude|portrait/;

export function journalPhotoWords(topic: string) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 6);
}

export function chooseJournalPhoto(candidates: JournalPhoto[], topic: string) {
  const words = journalPhotoWords(topic);
  let best: JournalPhoto | null = null;
  let bestScore = 0;
  for (const candidate of candidates) {
    const title = candidate.title.toLowerCase();
    const label = `${title} ${candidate.categories.toLowerCase()}`;
    const license = candidate.license.toLowerCase();
    if (!/jpe?g/.test(candidate.mime)) continue;
    if (banned.test(label) || /illustration|diagram|drawing/.test(label)) continue;
    if (!anatomy.test(title)) continue;
    if (/non-?commercial|\bnc\b|no derivatives/.test(license)) continue;
    if (!/cc0|cc by|public domain|no restrictions/.test(license)) continue;
    if (candidate.width < 1000 || !candidate.thumbUrl) continue;
    const hits = words.filter((word) => title.includes(word)).length;
    if (words.length > 0 && hits === 0) continue;
    let score = hits * 10 + 1;
    if (candidate.width >= candidate.height) score += 4;
    if (candidate.height > 0 && candidate.width / candidate.height >= 1.2) score += 3;
    if (/x-ray|radiograph|mri|photograph/.test(label)) score += 3;
    if (/model|skeleton/.test(title)) score += 2;
    if (score > bestScore) {
      best = candidate;
      bestScore = score;
    }
  }
  return best;
}

function plainText(value: string) {
  return value
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
}

type CommonsPage = {
  title?: string;
  imageinfo?: {
    mime?: string;
    width?: number;
    height?: number;
    thumburl?: string;
    extmetadata?: Record<string, { value?: string }>;
  }[];
};

async function searchCommons(query: string) {
  const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("generator", "search");
  endpoint.searchParams.set("gsrsearch", query);
  endpoint.searchParams.set("gsrnamespace", "6");
  endpoint.searchParams.set("gsrlimit", "20");
  endpoint.searchParams.set("prop", "imageinfo");
  endpoint.searchParams.set("iiprop", "url|mime|size|extmetadata");
  endpoint.searchParams.set("iiurlwidth", "1400");
  const response = await fetch(endpoint, {
    headers: { "user-agent": "TheAlignmentClinic/1.0 (https://thealignmentclinic.com; admin@thealignmentclinic.com)" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { query?: { pages?: Record<string, CommonsPage> } };
  return Object.values(payload.query?.pages ?? {}).flatMap((page) => {
    const info = page.imageinfo?.[0];
    const title = page.title ?? "";
    if (!info?.thumburl || !title) return [];
    const artist = plainText(info.extmetadata?.Artist?.value ?? "");
    const credit = artist ? `Photo · ${artist} · Wikimedia Commons` : "Photo · Wikimedia Commons";
    return [
      {
        title,
        mime: info.mime ?? "",
        width: info.width ?? 0,
        height: info.height ?? 0,
        license: info.extmetadata?.LicenseShortName?.value ?? "",
        categories: plainText(info.extmetadata?.Categories?.value ?? ""),
        credit: credit.slice(0, 140),
        thumbUrl: info.thumburl,
        pageUrl: `https://commons.wikimedia.org/wiki/${title.replace(/ /g, "_")}`,
      } satisfies JournalPhoto,
    ];
  });
}

export async function searchJournalPhoto(topic: string) {
  const words = journalPhotoWords(topic);
  const focus = words.slice(0, 4).join(" ") || "lumbar spine";
  const region = words.find((word) => /lumbar|cervical|thoracic/.test(word)) ?? "spine";
  const queries = [focus, `${region} vertebrae`, `${region} x-ray`, "human spine skeleton"];
  const found: JournalPhoto[] = [];
  for (const query of queries) {
    const pages = await searchCommons(query).catch(() => []);
    found.push(...pages);
  }
  return chooseJournalPhoto(found, topic || focus);
}
