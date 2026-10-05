import { saveFaq } from "@/app/admin/actions";
import { AdminStateForm } from "@/components/admin/state-form";
import { Field, PageHeader, fieldClass, panelClass } from "@/components/admin/rcm/ui";
import { Button } from "@/components/ui/button";
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
      <PageHeader
        kicker="Website"
        title="Questions"
        lede={
          rows.length === 0
            ? `No database questions yet. The public page still uses the reviewed file copy. File questions: ${faqs.length}.`
            : "Published questions appear on the public page."
        }
      />
      {rows.length > 0 ? (
        <ul className="mt-8 grid gap-3">
          {rows.map((row) => (
            <li key={row.id} className={panelClass}>
              <p className="font-medium">{row.question}</p>
              <p className="mt-1 text-sm text-muted">{row.published_at ? "Published" : row.review_status}</p>
            </li>
          ))}
        </ul>
      ) : null}
      <section className={`${panelClass} mt-8 max-w-xl`}>
        <h2 className="font-display text-2xl">New question</h2>
        <AdminStateForm action={saveFaq}>
          <Field label="Question">
            <input name="question" required className={fieldClass} />
          </Field>
          <Field label="Answer">
            <textarea name="answer" required className={`${fieldClass} min-h-28`} />
          </Field>
          <div className="flex flex-wrap gap-3">
            <Button name="intent" value="save" variant="secondary">
              Save draft
            </Button>
            {staff?.role === "editor" ? null : (
              <Button name="intent" value="publish">
                Publish
              </Button>
            )}
          </div>
        </AdminStateForm>
      </section>
    </main>
  );
}
