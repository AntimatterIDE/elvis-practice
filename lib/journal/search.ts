import "server-only";
import { journalSearchQuery, papersFromEuropePmc, type JournalPaper } from "@/lib/journal/papers";

export async function searchSpineJournals(topic: string): Promise<JournalPaper[]> {
  const query = journalSearchQuery(topic);
  const url = new URL("https://www.ebi.ac.uk/europepmc/webservices/rest/search");
  url.searchParams.set("query", query);
  url.searchParams.set("format", "json");
  url.searchParams.set("pageSize", "6");
  url.searchParams.set("resultType", "core");
  url.searchParams.set("sort", "CITED desc");
  const response = await fetch(url, { next: { revalidate: 0 } });
  if (!response.ok) throw new Error("The journal search did not respond.");
  const papers = papersFromEuropePmc(await response.json());
  if (papers.length < 3) {
    throw new Error("That search did not find enough orthopedic spine papers. Try a more specific topic.");
  }
  return papers.slice(0, 5);
}
