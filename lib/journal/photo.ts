export type JournalPhoto = {
  title: string;
  mime: string;
  width: number;
  height: number;
  license: string;
  categories: string;
  description?: string;
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

const spineContext = /spin(e|al)|vertebr|lumbar|cervical|thoracic|scoliosis|disc/;
const amateur =
  /grass|lawn|\bpark\b|garden|outdoor|gym|fitness|corpsman|\bnavy\b|soldier|military|sasebo|physical therapy|spine model|exercise class|fleet fitness/;
const banned =
  /3d|render|reconstruction|blender|\bcgi\b|animation|diagram|drawing|illustration|schematic|blausen|generated|midjourney|dall-?e|engraving|painting|cartoon|malignant|tumou?r|\bblood\b|fracture|tulip|wolf|urchin|fossil|nude|portrait|plant|animal|horse|mallard|taxus|acer|dinosaur|puncture|abscess|tuberculosis|treatise|zoology|wellcome|suffering|operate on|child|pediatric|infant|toddler|tomograph|\bct\b/;
const radiograph = /x[\s-]?ray|radiograph|\bmri\b|fluoroscop/;

export function journalPhotoWords(topic: string) {
  return topic
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 3 && !stopWords.has(word))
    .slice(0, 6);
}

function topicHash(topic: string) {
  let hash = 2166136261;
  for (const character of topic) hash = Math.imul(hash ^ character.charCodeAt(0), 16777619) >>> 0;
  return hash;
}

export function journalPhotoIsScan(photo: Pick<JournalPhoto, "title" | "categories" | "description">) {
  const label = `${photo.title} ${photo.categories} ${photo.description ?? ""}`.toLowerCase();
  return radiograph.test(label) && !banned.test(label);
}

export function journalSourceRejected(source: string) {
  const label = decodeURIComponent(source).replace(/[_+]/g, " ").toLowerCase();
  return amateur.test(label) || banned.test(label);
}

export function journalCoverKind(source: string) {
  if (journalSourceRejected(source)) return "skip" as const;
  const label = decodeURIComponent(source).replace(/[_+]/g, " ").toLowerCase();
  if (radiograph.test(label)) return "scan" as const;
  return "skip" as const;
}

export function chooseJournalPhoto(
  candidates: JournalPhoto[],
  topic: string,
  options?: { used?: string[]; preferPhoto?: boolean },
) {
  const words = journalPhotoWords(topic);
  const topicLabel = topic.toLowerCase();
  const used = new Set(options?.used ?? []);
  const seen = new Set<string>();
  const ranked: { photo: JournalPhoto; score: number; radiograph: boolean }[] = [];
  for (const candidate of candidates) {
    if (used.has(candidate.pageUrl)) continue;
    const title = candidate.title.toLowerCase();
    const label = `${title} ${candidate.categories.toLowerCase()} ${(candidate.description ?? "").toLowerCase()}`;
    const license = candidate.license.toLowerCase();
    if (!/jpe?g/.test(candidate.mime) || banned.test(label) || amateur.test(label)) continue;
    if (/performs a|intraoperative|open surgery/.test(label)) continue;
    if (!spineContext.test(label) || !radiograph.test(label)) continue;
    if (/non-?commercial|\bnc\b|no derivatives/.test(license)) continue;
    if (!/cc0|cc by|public domain|no restrictions/.test(license)) continue;
    if (candidate.width < 800 || !candidate.thumbUrl) continue;
    if (seen.has(candidate.pageUrl)) continue;
    seen.add(candidate.pageUrl);
    const hits = words.filter((word) => label.includes(word)).length;
    const isRadiograph = radiograph.test(label);
    let score = hits * 10 + 1;
    if (/lumbar/.test(topicLabel) && /lumbar/.test(label)) score += 8;
    if (/cervical/.test(topicLabel) && /cervical|c-spine|c1-c2/.test(label)) score += 8;
    if (candidate.width >= candidate.height) score += 3;
    if (candidate.height > 0 && candidate.width / candidate.height >= 1.2) score += 2;
    if (isRadiograph) score += 6;
    ranked.push({ photo: candidate, score, radiograph: isRadiograph });
  }
  ranked.sort((a, b) => b.score - a.score || a.photo.title.localeCompare(b.photo.title));
  const pool = ranked.slice(0, 8);
  if (pool.length === 0) return null;
  return pool[topicHash(topic) % pool.length]?.photo ?? null;
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

function photoFromPage(page: CommonsPage): JournalPhoto | null {
  const info = page.imageinfo?.[0];
  const title = page.title ?? "";
  if (!info?.thumburl || !title) return null;
  const artist = plainText(info.extmetadata?.Artist?.value ?? "");
  const credit = artist ? `Photo · ${artist} · Wikimedia Commons` : "Photo · Wikimedia Commons";
  return {
    title,
    mime: info.mime ?? "",
    width: info.width ?? 0,
    height: info.height ?? 0,
    license: info.extmetadata?.LicenseShortName?.value ?? "",
    categories: plainText(info.extmetadata?.Categories?.value ?? ""),
    description: plainText(info.extmetadata?.ImageDescription?.value ?? ""),
    credit: credit.slice(0, 140),
    thumbUrl: info.thumburl,
    pageUrl: `https://commons.wikimedia.org/wiki/${title.replace(/ /g, "_")}`,
  };
}

async function commonsQuery(params: Record<string, string>) {
  const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("prop", "imageinfo");
  endpoint.searchParams.set("iiprop", "url|mime|size|extmetadata");
  endpoint.searchParams.set("iiurlwidth", "1400");
  for (const [key, value] of Object.entries(params)) endpoint.searchParams.set(key, value);
  const response = await fetch(endpoint, {
    headers: { "user-agent": "TheAlignmentClinic/1.0 (https://thealignmentclinic.com; admin@thealignmentclinic.com)" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { query?: { pages?: Record<string, CommonsPage> } };
  return Object.values(payload.query?.pages ?? {}).flatMap((page) => {
    const photo = photoFromPage(page);
    return photo ? [photo] : [];
  });
}

function searchCommons(query: string) {
  return commonsQuery({
    generator: "search",
    gsrsearch: query,
    gsrnamespace: "6",
    gsrlimit: "16",
  });
}

function categoryPhotos(category: string) {
  return commonsQuery({
    generator: "categorymembers",
    gcmtitle: `Category:${category}`,
    gcmtype: "file",
    gcmlimit: "16",
  });
}

export async function searchJournalPhoto(topic: string, options?: { used?: string[]; preferPhoto?: boolean }) {
  const words = journalPhotoWords(topic);
  const region = words.find((word) => /lumbar|cervical|thoracic|scoliosis|disc/.test(word));
  const queries = [
    'intitle:"lumbar" (x-ray OR xray OR radiograph OR mri) filetype:bitmap',
    'intitle:"cervical" (x-ray OR xray OR radiograph OR mri) filetype:bitmap',
    region ? `intitle:${region} (x-ray OR radiograph OR mri) filetype:bitmap` : 'intitle:spine (x-ray OR radiograph OR mri) filetype:bitmap',
  ];
  const batches = await Promise.all([
    ...queries.map((query) => searchCommons(query).catch(() => [])),
    categoryPhotos("X-rays of the spine").catch(() => []),
  ]);
  return chooseJournalPhoto(batches.flat(), topic || "lumbar spine", options);
}
