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
  /3d|render|reconstruction|blender|\bcgi\b|animation|diagram|drawing|illustration|schematic|blausen|generated|midjourney|dall-?e|engraving|painting|cartoon|malignant|tumou?r|\bblood\b|fracture|tulip|wolf|urchin|fossil|nude|portrait|plant|animal|horse|mallard|taxus|acer|dinosaur|rabbit|hare|excavation|archaeolog|puncture|abscess|tuberculosis|treatise|zoology|wellcome|suffering|operate on|child|pediatric|infant|toddler|tomograph|\bct\b/;
const radiograph = /x[\s-]?ray|radiograph|\bmri\b|fluoroscop/;
const thoughtful = /walk|gait|posture|consult|examin|clinic|anatom|vertebra|standing|skeleton|specimen|ergonom|recovery|scoliosis|neck|desk/;

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

function coverLabel(source: string) {
  try {
    return decodeURIComponent(source).replace(/[_+]/g, " ").toLowerCase();
  } catch {
    return source.replace(/[_+]/g, " ").toLowerCase();
  }
}

export function journalSourceRejected(source: string) {
  const label = coverLabel(source);
  return amateur.test(label) || banned.test(label);
}

export function journalCoverKind(source: string) {
  const label = coverLabel(source);
  if (journalSourceRejected(source)) return "skip" as const;
  if (radiograph.test(label)) return "scan" as const;
  if (spineContext.test(label) && thoughtful.test(label)) return "photo" as const;
  return "skip" as const;
}

export function chooseJournalPhoto(
  candidates: JournalPhoto[],
  topic: string,
  options?: { used?: string[]; preferPhoto?: boolean; scenesOnly?: boolean },
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
    const isRadiograph = radiograph.test(label);
    const isThoughtful = thoughtful.test(label);
    if (!spineContext.test(label) || (!isRadiograph && !isThoughtful)) continue;
    if (/non-?commercial|\bnc\b|no derivatives/.test(license)) continue;
    if (!/cc0|cc by|public domain|no restrictions/.test(license)) continue;
    if (candidate.width < 800 || !candidate.thumbUrl) continue;
    if (seen.has(candidate.pageUrl)) continue;
    seen.add(candidate.pageUrl);
    const hits = words.filter((word) => label.includes(word)).length;
    let score = hits * 10 + 1;
    if (/lumbar/.test(topicLabel) && /lumbar/.test(label)) score += 8;
    if (/cervical/.test(topicLabel) && /cervical|c-spine|c1-c2/.test(label)) score += 8;
    if (candidate.width >= candidate.height) score += 3;
    if (candidate.height > 0 && candidate.width / candidate.height >= 1.2) score += 2;
    if (isThoughtful) score += 24;
    ranked.push({ photo: candidate, score, radiograph: isRadiograph });
  }
  ranked.sort((a, b) => b.score - a.score || a.photo.title.localeCompare(b.photo.title));
  const scenes = ranked.filter((item) => !item.radiograph);
  if (options?.scenesOnly && scenes.length === 0) return null;
  const pool = (scenes.length > 0 ? scenes : ranked).slice(0, 8);
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

const lumbarAnatomy = [
  "File:Lumbar vertebrae anterior.png",
  "File:Lumbar vertebrae lateral.png",
  "File:Lumbar vertebrae posterior.png",
  "File:Lumbar vertebrae.jpg",
  "File:Vertebra lumbar.jpg",
];

const cervicalAnatomy = [
  "File:Cervical vertebrae lateral.png",
  "File:Cervical vertebrae front.png",
  "File:Cervical vertebrae back.png",
  "File:723 Cervical Vertebrae.jpg",
  "File:Cervical Vertebra Unlabeled.jpg",
  "File:Atlas vertebrae.jpg",
  "File:Axis vertebrae.jpg",
];

const generalAnatomy = ["File:Human Vertebrae.jpg", "File:Thoracic vertebrae.jpg", "File:Thoracic vertebrae lateral.png"];

function anatomyForTopic(topic: string) {
  const label = topic.toLowerCase();
  if (/cervical|neck|myelopathy|radiculopathy|acdf/.test(label)) return [...cervicalAnatomy, ...generalAnatomy];
  if (/scoliosis|thoracic/.test(label)) return [...generalAnatomy, ...lumbarAnatomy];
  return [...lumbarAnatomy, ...generalAnatomy];
}

async function curatedSpinePhoto(topic: string, used: Set<string>) {
  const titles = anatomyForTopic(topic).filter((title) => !used.has(`https://commons.wikimedia.org/wiki/${title.replace(/ /g, "_")}`));
  if (titles.length === 0) return null;
  const photos = await commonsTitles(titles);
  return (
    photos.find((photo) => {
      const license = photo.license.toLowerCase();
      return photo.width >= 800 && /jpe?g|png/.test(photo.mime) && /cc0|cc by|public domain|no restrictions/.test(license) && !/non-?commercial|\bnc\b|no derivatives/.test(license);
    }) ?? null
  );
}

async function commonsTitles(titles: string[]) {
  const endpoint = new URL("https://commons.wikimedia.org/w/api.php");
  endpoint.searchParams.set("action", "query");
  endpoint.searchParams.set("format", "json");
  endpoint.searchParams.set("titles", titles.join("|"));
  endpoint.searchParams.set("prop", "imageinfo");
  endpoint.searchParams.set("iiprop", "url|mime|size|extmetadata");
  endpoint.searchParams.set("iiurlwidth", "1400");
  const response = await fetch(endpoint, {
    headers: { "user-agent": "TheAlignmentClinic/1.0 (https://thealignmentclinic.com; admin@thealignmentclinic.com)" },
    signal: AbortSignal.timeout(12000),
  });
  if (!response.ok) return [];
  const payload = (await response.json()) as { query?: { pages?: Record<string, CommonsPage> } };
  const order = new Map(titles.map((title, index) => [title, index]));
  return Object.values(payload.query?.pages ?? {})
    .flatMap((page) => {
      const photo = photoFromPage(page);
      return photo ? [photo] : [];
    })
    .sort((a, b) => (order.get(a.title) ?? 99) - (order.get(b.title) ?? 99));
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

export async function searchJournalPhoto(topic: string, options?: { used?: string[]; preferPhoto?: boolean; scenesOnly?: boolean }) {
  const words = journalPhotoWords(topic);
  const region = words.find((word) => /lumbar|cervical|thoracic|scoliosis|disc/.test(word));
  const queries = [
    "lumbar vertebrae anatomy filetype:bitmap",
    "cervical vertebrae anatomy filetype:bitmap",
    region ? `${region} vertebrae anatomy filetype:bitmap` : "spine posture anatomy filetype:bitmap",
    "scoliosis standing posture filetype:bitmap",
  ];
  const curated = await curatedSpinePhoto(topic, new Set(options?.used ?? [])).catch(() => null);
  if (curated) return curated;
  const batches = await Promise.all([
    ...queries.map((query) => searchCommons(query).catch(() => [])),
    categoryPhotos("Bones of the human vertebral column").catch(() => []),
    categoryPhotos("X-rays of the spine").catch(() => []),
  ]);
  return chooseJournalPhoto(batches.flat(), topic || "lumbar spine", options);
}
