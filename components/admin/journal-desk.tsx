import Link from "next/link";
import { publishJournalDraft, researchAndDraft } from "@/app/admin/journal/actions";
import { AdminStateForm } from "@/components/admin/state-form";
import { Field, fieldClass, PageHeader, panelClass } from "@/components/admin/rcm/ui";
import { Button } from "@/components/ui/button";
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
  const canPublish = staff?.role === "owner" || staff?.role === "admin";

  return (
    <main>
      <PageHeader
        kicker="Website"
        title="Journal"
        lede="Research recent orthopedic spine papers, draft a note in the clinic's voice, and leave it unpublished until you approve it."
      />
      <section className={`${panelClass} mt-8 max-w-2xl`}>
        <h2 className="font-display text-2xl">New draft</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          Leave the topic blank to pull a current spine question from the journals. The draft cites the papers and does not go live until Approve is pressed.
        </p>
        <AdminStateForm action={researchAndDraft}>
          <Field label="Topic">
            <input name="topic" className={fieldClass} placeholder="Lumbar spinal stenosis" maxLength={180} />
          </Field>
          <Button className="justify-self-start">Research journals and draft</Button>
        </AdminStateForm>
      </section>
      <section className="mt-10 grid gap-4">
        {storageError ? <p className="text-sm text-emergency">{storageError}</p> : null}
        {articles.length === 0 ? (
          <p className="rounded-2xl border border-dashed border-line px-4 py-6 text-sm text-muted">No drafts yet.</p>
        ) : null}
        {articles.map((article) => (
          <article key={article.id} className={panelClass}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">
                  {article.reviewStatus === "approved" ? "Published" : "Draft"}
                </p>
                <h2 className="mt-2 font-display text-2xl">{article.title}</h2>
                <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">{article.summary}</p>
              </div>
              {article.reviewStatus === "approved" ? (
                <Link className="text-sm font-semibold text-oxide-deep underline underline-offset-4" href={`/journal/${article.slug}`}>
                  View
                </Link>
              ) : null}
            </div>
            <ul className="mt-4 grid gap-1 text-sm text-muted">
              {article.sources.slice(0, 4).map((source) => (
                <li key={source.pmid}>
                  {source.journal} {source.year} · PMID {source.pmid}
                </li>
              ))}
            </ul>
            {article.reviewStatus === "draft" && canPublish ? (
              <AdminStateForm action={publishJournalDraft}>
                <input type="hidden" name="id" value={article.id} />
                <Button className="justify-self-start">Approve and publish</Button>
              </AdminStateForm>
            ) : null}
            {article.reviewStatus === "draft" && !canPublish ? (
              <p className="mt-4 text-sm text-muted">Waiting for an admin to approve this draft.</p>
            ) : null}
          </article>
        ))}
      </section>
    </main>
  );
}
