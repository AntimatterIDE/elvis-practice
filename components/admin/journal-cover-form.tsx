import { uploadJournalCover } from "@/app/admin/journal/actions";
import { AdminStateForm } from "@/components/admin/state-form";
import { Button } from "@/components/ui/button";

export function JournalCoverForm({ articleId, heroUrl }: { articleId: string; heroUrl: string | null }) {
  return (
    <section className="mt-8 rounded-2xl border border-line bg-card p-5">
      <h2 className="font-display text-2xl">Cover picture</h2>
      <p className="mt-1 max-w-xl text-sm text-muted">Upload a JPEG or PNG. It replaces the picture on this note and on the journal page.</p>
      {heroUrl ? <img src={heroUrl} alt="" className="mt-4 aspect-[4/3] w-full max-w-sm rounded-xl object-cover" /> : null}
      <AdminStateForm action={uploadJournalCover} encType="multipart/form-data">
        <input type="hidden" name="id" value={articleId} />
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Picture</span>
          <input className="text-sm" type="file" name="cover" accept="image/jpeg,image/png" required />
        </label>
        <Button className="justify-self-start">Save picture</Button>
      </AdminStateForm>
    </section>
  );
}
