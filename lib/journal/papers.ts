export type JournalPaper = {
  pmid: string;
  title: string;
  journal: string;
  year: string;
  authors: string;
  abstract: string;
  doi: string | null;
};

type EuropePmcResult = {
  pmid?: string;
  title?: string;
  journalTitle?: string;
  pubYear?: string;
  authorString?: string;
  abstractText?: string;
  doi?: string;
};

export function papersFromEuropePmc(payload: unknown): JournalPaper[] {
  const results = (payload as { resultList?: { result?: EuropePmcResult[] } })?.resultList?.result ?? [];
  const papers: JournalPaper[] = [];
  const seen = new Set<string>();
  for (const result of results) {
    const pmid = result.pmid?.trim();
    const title = result.title?.replace(/<[^>]+>/g, "").trim();
    if (!pmid || !title || seen.has(pmid)) continue;
    seen.add(pmid);
    const paper = {
      pmid,
      title,
      journal: result.journalTitle?.trim() || "Journal",
      year: result.pubYear?.trim() || "",
      authors: result.authorString?.trim() || "",
      abstract: (result.abstractText || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200),
      doi: result.doi?.trim() || null,
    };
    if (!isOrthopedicSpinePaper(paper)) continue;
    papers.push(paper);
  }
  return papers;
}

const orthopedicSpine =
  /\b(spin(?:e|al)|lumbar|thoracic|scoliosis|vertebr|myelopathy|discectomy|laminectomy|laminotomy|radiculopathy|spondyl\w*|fusion|stenosis|deformity|arthroplasty|foraminotomy|kyphosis|lordosis|interbody|disc)\b/i;

export function isOrthopedicSpinePaper(paper: { title: string; abstract: string }) {
  return orthopedicSpine.test(`${paper.title} ${paper.abstract}`);
}

export function papersForDraft(value: unknown): JournalPaper[] {
  if (!Array.isArray(value)) return [];
  const papers: JournalPaper[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (!item || typeof item !== "object") continue;
    const row = item as Partial<JournalPaper>;
    const pmid = String(row.pmid ?? "").trim();
    const title = String(row.title ?? "").replace(/\s+/g, " ").trim();
    if (!/^\d{4,12}$/.test(pmid) || title.length < 8 || seen.has(pmid)) continue;
    seen.add(pmid);
    papers.push({
      pmid,
      title: title.slice(0, 300),
      journal: String(row.journal ?? "Journal").replace(/\s+/g, " ").trim().slice(0, 160) || "Journal",
      year: String(row.year ?? "").trim().slice(0, 8),
      authors: String(row.authors ?? "").replace(/\s+/g, " ").trim().slice(0, 240),
      abstract: String(row.abstract ?? "").replace(/\s+/g, " ").trim().slice(0, 1200),
      doi: row.doi ? String(row.doi).trim().slice(0, 80) : null,
    });
  }
  return papers.slice(0, 5);
}

export function articleSlug(title: string) {
  const slug = title
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 72)
    .replace(/-+$/g, "");
  return slug || "spine-note";
}

const spineQueries = [
  'TITLE_ABS:("lumbar spinal stenosis" OR "lumbar disc herniation") AND FIRST_PDATE:[2022-01-01 TO 2026-12-31]',
  'TITLE_ABS:("cervical myelopathy" OR "cervical disc arthroplasty") AND FIRST_PDATE:[2022-01-01 TO 2026-12-31]',
  'TITLE_ABS:("minimally invasive spine surgery" OR "endoscopic spine") AND FIRST_PDATE:[2022-01-01 TO 2026-12-31]',
  'TITLE_ABS:("adult spinal deformity" OR "lumbar fusion") AND FIRST_PDATE:[2022-01-01 TO 2026-12-31]',
];

const searchFiller = new Set([
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
  "model",
  "care",
  "note",
  "notes",
  "patients",
  "patient",
]);

const spineClause =
  '(TITLE_ABS:spine OR TITLE_ABS:spinal OR TITLE_ABS:lumbar OR TITLE_ABS:scoliosis OR TITLE_ABS:vertebra OR TITLE_ABS:myelopathy OR TITLE_ABS:"spinal fusion" OR TITLE_ABS:discectomy OR TITLE_ABS:stenosis)';

export function journalSearchTerms(topic: string) {
  return topic
    .toLowerCase()
    .replace(/[^\w\s'-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length > 2 && !searchFiller.has(word))
    .slice(0, 4);
}

function termClause(term: string) {
  return /[^a-z0-9-]/i.test(term) ? `TITLE_ABS:"${term}"` : `TITLE_ABS:${term}`;
}

export function journalSearchAttempts(topic: string) {
  const cleaned = topic.replace(/[^\w\s,'-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
  const terms = journalSearchTerms(cleaned);
  if (!cleaned || terms.length === 0) return [spineQueries[new Date().getUTCDate() % spineQueries.length]];
  const attempts: string[] = [];
  const smallest = Math.min(2, terms.length);
  for (let size = terms.length; size >= smallest; size -= 1) {
    attempts.push(
      `${terms.slice(0, size).map(termClause).join(" AND ")} AND ${spineClause} AND FIRST_PDATE:[2016-01-01 TO 2026-12-31]`,
    );
  }
  return attempts;
}

export function journalSearchQuery(topic: string) {
  return journalSearchAttempts(topic)[0];
}

export function journalSearchFallback(topic: string) {
  return journalSearchAttempts(topic)[1] ?? null;
}
