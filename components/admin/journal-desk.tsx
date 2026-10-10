import Link from "next/link";
import { JournalControls } from "@/components/admin/journal-controls";
import { JournalResearch } from "@/components/admin/journal-research";
import { PageHeader, panelClass } from "@/components/admin/rcm/ui";
import { listJournalArticles } from "@/lib/journal/store";
import { getStaffSession } from "@/lib/supabase/session";

export async function JournalDesk() {
  const staff = await getStaffSession();
  let articles: Awaited<ReturnType<typeof listJournalArticles>> = [];
  let storageError = "";
  try {
    articles = await listJournalArticles();
  } catch (error) {
    storageError = error instanceof Error ? error.message : "Journal drafts could not be loaded.";
  }
  const canManage = staff?.role === "owner" || staff?.role === "admin";

  return (
    <main>
      <PageHeader
        kicker="Website"
        title="Journal"
        lede="Research recent orthopedic spine papers, draft a note in the clinic's voice, and leave it unpublished until you approve it."
      />
      <JournalResearch />
      <section className="mt-10 grid gap-4">
        {storageError ? <p className="text-sm text-emergency">{storageError}</p> : null}
        {articles.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-muted">No drafts yet.</p>
        ) : null}
        {articles.map((article) => (
          <article key={article.id} className={panelClass}>
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">
              {article.reviewStatus === "approved" ? "Published" : "Draft"}
            </p>
            <h2 className="mt-2 font-display text-2xl">
              <Link className="underline decoration-oxide/40 underline-offset-4" href={`/admin/journal/${article.id}`}>
                {article.title}
              </Link>
            </h2>
            <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{article.summary}</p>
            <ul className="mt-4 grid gap-1 text-sm">
              {article.sources.slice(0, 4).map((source) => (
                <li key={source.pmid}>
                  <a className="underline underline-offset-4" href={`https://pubmed.ncbi.nlm.nih.gov/${source.pmid}/`}>
                    {source.journal} {source.year} · PMID {source.pmid}
                  </a>
                </li>
              ))}
            </ul>
            <div className="mt-5">
              <JournalControls article={article} canManage={canManage} />
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
