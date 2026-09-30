import { saveClinical } from "@/app/admin/actions";
import { AdminStateForm } from "@/components/admin/state-form";
import type { ClinicalDocument } from "@/lib/content/schema";
import type { StaffRole } from "@/lib/supabase/session";

export function ClinicalEditor({ document, role }: { document: ClinicalDocument; role: StaffRole }) {
  return (
    <AdminStateForm action={saveClinical}>
      <input type="hidden" name="kind" value={document.kind} />
      <input type="hidden" name="slug" value={document.slug} />
      <label className="grid gap-2 text-sm">
        Title
        <input name="title" defaultValue={document.title} required className="border border-line bg-card px-3 py-3" />
      </label>
      <label className="grid gap-2 text-sm">
        Summary
        <textarea name="summary" defaultValue={document.summary} required className="min-h-24 border border-line bg-card px-3 py-3" />
      </label>
      <div className="grid gap-4 md:grid-cols-2">
        <label className="grid gap-2 text-sm">
          SEO title
          <input name="seoTitle" defaultValue={document.seoTitle} required className="border border-line bg-card px-3 py-3" />
        </label>
        <label className="grid gap-2 text-sm">
          SEO description
          <input name="seoDescription" defaultValue={document.seoDescription} required className="border border-line bg-card px-3 py-3" />
        </label>
      </div>
      <label className="grid gap-2 text-sm">
        Related slugs, comma separated
        <input name="relatedSlugs" defaultValue={document.relatedSlugs.join(", ")} className="border border-line bg-card px-3 py-3" />
      </label>
      {document.faqs.map((faq, index) => (
        <fieldset key={faq.question} className="grid gap-3 border border-line p-4">
          <legend className="px-2 text-xs uppercase tracking-[0.14em] text-oxide">Question</legend>
          <input name={`faqs.${index}.question`} defaultValue={faq.question} className="border border-line bg-card px-3 py-2" />
          <textarea name={`faqs.${index}.answer`} defaultValue={faq.answer} className="min-h-24 border border-line bg-card px-3 py-3" />
        </fieldset>
      ))}
      {document.sections.map((section, index) => (
        <fieldset key={section.id} className="grid gap-3 border border-line p-4">
          <legend className="px-2 text-xs uppercase tracking-[0.14em] text-oxide">{section.heading}</legend>
          <input type="hidden" name={`sections.${index}.id`} value={section.id} />
          <input name={`sections.${index}.heading`} defaultValue={section.heading} className="border border-line bg-card px-3 py-2" />
          <textarea name={`sections.${index}.body`} defaultValue={section.body} className="min-h-36 border border-line bg-card px-3 py-3" />
        </fieldset>
      ))}
      <p className="text-sm text-muted">
        Status: {document.reviewStatus}, offering {document.offeringStatus}. Markdown is limited to
        paragraphs, lists, and emphasis. HTML is escaped.
      </p>
      <div className="flex flex-wrap gap-3">
        <button name="intent" value="save" className="border border-ink/20 px-4 py-2 text-sm">
          Save draft
        </button>
        {role === "editor" ? null : (
          <>
            <button name="intent" value="publish" className="bg-oxide px-4 py-2 text-sm text-paper">
              Publish
            </button>
            <button name="intent" value="unpublish" className="border border-ink/20 px-4 py-2 text-sm">
              Unpublish
            </button>
          </>
        )}
      </div>
    </AdminStateForm>
  );
}
