import Link from "next/link";
import { notFound } from "next/navigation";
import { JournalControls } from "@/components/admin/journal-controls";
import { JournalArticleView } from "@/components/site/journal-article";
import { journalArticle } from "@/lib/journal/store";
import { getStaffSession } from "@/lib/supabase/session";

type Params = { id: string };

export default async function JournalEditorPage({ params }: { params: Promise<Params> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const [article, staff] = await Promise.all([journalArticle(id), getStaffSession()]);
  if (!article) notFound();
  const canManage = staff?.role === "owner" || staff?.role === "admin";

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
      <div className="mt-8">
        <JournalArticleView article={article} />
      </div>
    </main>
  );
}
