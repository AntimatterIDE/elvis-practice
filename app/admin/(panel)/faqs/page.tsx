import { saveFaq } from "@/app/admin/actions";
import { AdminStateForm } from "@/components/admin/state-form";
import { faqs } from "@/lib/content/faqs";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/supabase/session";

export default async function AdminFaqsPage() {
  const staff = await getStaffSession();
  const data = isSupabaseConfigured()
    ? (await (await createSupabaseServerClient()).from("faqs").select("id, question, answer, review_status, published_at").order("sort_order")).data
    : [];
  const rows = data ?? [];

  return (
    <main>
      <h1 className="font-display text-4xl">Questions</h1>
      {rows.length === 0 ? (
        <p className="mt-6 max-w-xl text-muted">
          No database questions yet. The public page still uses the reviewed file copy. Seed or add a question here. File questions: {faqs.length}.
        </p>
      ) : (
        <ul className="mt-8 grid gap-3">
          {rows.map((row) => (
            <li key={row.id} className="border border-line px-4 py-3 text-sm">
              {row.question}
              <span className="mt-1 block text-muted">{row.published_at ? "Published" : row.review_status}</span>
            </li>
          ))}
        </ul>
      )}
      <section className="mt-12 max-w-xl">
        <h2 className="font-display text-2xl">New question</h2>
        <AdminStateForm action={saveFaq}>
          <label className="grid gap-2 text-sm">
            Question
            <input name="question" required className="border border-line bg-card px-3 py-3" />
          </label>
          <label className="grid gap-2 text-sm">
            Answer
            <textarea name="answer" required className="min-h-28 border border-line bg-card px-3 py-3" />
          </label>
          <button name="intent" value="save" className="justify-self-start border border-ink/20 px-4 py-2 text-sm">
            Save draft
          </button>
          {staff?.role === "editor" ? null : (
            <button name="intent" value="publish" className="justify-self-start bg-oxide px-4 py-2 text-sm text-paper">
              Publish
            </button>
          )}
        </AdminStateForm>
      </section>
    </main>
  );
}
