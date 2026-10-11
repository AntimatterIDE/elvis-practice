import Link from "next/link";
import { notFound } from "next/navigation";
import { JournalControls } from "@/components/admin/journal-controls";
import { JournalCoverForm } from "@/components/admin/journal-cover-form";
import { JournalSearchTools } from "@/components/admin/journal-search-tools";
import { JournalArticleView } from "@/components/site/journal-article";
import { ensureJournalHero } from "@/lib/journal/hero";
import { journalArticle } from "@/lib/journal/store";
import { getStaffSession } from "@/lib/supabase/session";

type Params = { id: string };

export const maxDuration = 60;

export default async function JournalEditorPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [article, staff] = await Promise.all([journalArticle(id), getStaffSession()]);
  if (!article) notFound();
  const canManage = staff?.role === "owner" || staff?.role === "admin";
  const hero = await ensureJournalHero(article);

  return (
    <main>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">Editor</p>
          <p className="mt-1 text-sm text-muted">
            {article.reviewStatus === "approved" ? "Published on the site." : "Draft. Readers cannot see this yet."}
          </p>
        </div>
        <Link className="text-sm font-semibold text-oxide-deep underline underline-offset-4" href="/admin/journal">
          All notes
        </Link>
      </div>
      <JournalControls article={article} canManage={canManage} />
      {canManage ? <JournalCoverForm articleId={article.id} heroUrl={hero?.url ?? null} /> : null}
      <JournalSearchTools article={article} />
      <div className="mt-8">
        <JournalArticleView article={article} heroUrl={hero?.url} heroCredit={hero?.credit} />
      </div>
    </main>
  );
}
