import "server-only";
import { journalSearchAttempts, papersFromEuropePmc, type JournalPaper } from "@/lib/journal/papers";

const tooFew = "That search did not find enough orthopedic spine papers. Try a more specific topic.";

async function fetchPapers(query: string) {
  const url = new URL("https://www.ebi.ac.uk/europepmc/webservices/rest/search");
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("pageSize", "12");
  url.searchParams.set("resultType", "core");
  url.searchParams.set("sort", "CITED desc");
  const response = await fetch(url, { next: { revalidate: 0 }, signal: AbortSignal.timeout(12000) });
  if (!response.ok) throw new Error("The journal search did not respond.");
  return papersFromEuropePmc(await response.json());
}

export async function searchSpineJournals(topic: string): Promise<JournalPaper[]> {
  const seen = new Set<string>();
  const papers: JournalPaper[] = [];
  for (const query of journalSearchAttempts(topic)) {
    for (const paper of await fetchPapers(query)) {
      if (seen.has(paper.pmid)) continue;
      seen.add(paper.pmid);
      papers.push(paper);
    }
    if (papers.length >= 3) return papers.slice(0, 5);
  }
  throw new Error(tooFew);
}
