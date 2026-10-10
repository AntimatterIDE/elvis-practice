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
    papers.push({
      pmid,
      title,
      journal: result.journalTitle?.trim() || "Journal",
      year: result.pubYear?.trim() || "",
      authors: result.authorString?.trim() || "",
      abstract: (result.abstractText || "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().slice(0, 1200),
      doi: result.doi?.trim() || null,
    });
  }
  return papers;
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

export function journalSearchQuery(topic: string) {
  const cleaned = topic.replace(/[^\w\s,'-]/g, " ").replace(/\s+/g, " ").trim().slice(0, 180);
  if (!cleaned) return spineQueries[new Date().getUTCDate() % spineQueries.length];
  return `TITLE_ABS:(${cleaned}) AND TITLE_ABS:(spine OR spinal OR lumbar OR cervical) AND FIRST_PDATE:[2020-01-01 TO 2026-12-31]`;
}
