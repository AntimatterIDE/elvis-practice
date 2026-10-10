import Link from "next/link";
import { publishJournalDraft, removeJournalDraft, unpublishJournalDraft } from "@/app/admin/journal/actions";
import { AdminStateForm } from "@/components/admin/state-form";
import { Button } from "@/components/ui/button";
import type { JournalArticle } from "@/lib/journal/store";

export function JournalControls({ article, canManage }: { article: JournalArticle; canManage: boolean }) {
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Button asChild variant="secondary">
        <Link href={`/admin/journal/${article.id}`}>Open in editor</Link>
      </Button>
      {article.reviewStatus === "approved" ? (
        <Button asChild variant="secondary">
          <Link href={`/journal/${article.slug}`}>Public page</Link>
        </Button>
      ) : null}
      {canManage && article.reviewStatus === "draft" ? (
        <AdminStateForm action={publishJournalDraft}>
          <input type="hidden" name="id" value={article.id} />
          <Button className="justify-self-start">Approve and publish</Button>
        </AdminStateForm>
      ) : null}
      {canManage && article.reviewStatus === "approved" ? (
        <AdminStateForm action={unpublishJournalDraft}>
          <input type="hidden" name="id" value={article.id} />
          <Button variant="secondary" className="justify-self-start">
            Unpublish
          </Button>
        </AdminStateForm>
      ) : null}
      {canManage ? (
        <AdminStateForm action={removeJournalDraft}>
          <input type="hidden" name="id" value={article.id} />
          <label className="flex items-center gap-2 text-sm text-muted">
            <input type="checkbox" name="confirm" value="delete" required />
            Delete this article
          </label>
          <Button variant="secondary" className="justify-self-start text-emergency">
            Delete
          </Button>
        </AdminStateForm>
      ) : (
        <p className="text-sm text-muted">An admin publishes, unpublishes, or deletes this note.</p>
      )}
    </div>
  );
}
