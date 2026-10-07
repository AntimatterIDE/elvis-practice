import { saveClinical } from "@/app/admin/actions";
import { AdminStateForm } from "@/components/admin/state-form";
import { fieldClass } from "@/components/admin/rcm/ui";
import type { ClinicalDocument } from "@/lib/content/schema";
import type { StaffRole } from "@/lib/supabase/session";

export function ClinicalEditor({ document, role }: { document: ClinicalDocument; role: StaffRole }) {
  return (
    <AdminStateForm action={saveClinical}>
      <input type="hidden" name="kind" value={document.kind} />
      <input type="hidden" name="slug" value={document.slug} />
      <label className="grid gap-2 text-sm font-medium">
        Title
        <input name="title" defaultValue={document.title} required className={fieldClass} />
      </label>
      <label className="grid gap-2 text-sm font-medium">
        Summary
        <textarea name="summary" defaultValue={document.summary} required className={`${fieldClass} min-h-24`} />
      </label>
      <details className="rounded-2xl border border-line bg-card p-4">
        <summary className="cursor-pointer font-medium">Search listing</summary>
        <div className="mt-4 grid gap-4">
          <label className="grid gap-2 text-sm font-medium">
            Search title
            <input name="seoTitle" defaultValue={document.seoTitle} required className={fieldClass} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Search description
            <input name="seoDescription" defaultValue={document.seoDescription} required className={fieldClass} />
          </label>
          <label className="grid gap-2 text-sm font-medium">
            Related pages, comma separated
            <input name="relatedSlugs" defaultValue={document.relatedSlugs.join(", ")} className={fieldClass} />
          </label>
        </div>
      </details>
      {document.faqs.map((faq, index) => (
        <details key={faq.question} className="rounded-2xl border border-line bg-card p-4">
          <summary className="cursor-pointer font-medium">{faq.question}</summary>
          <div className="mt-4 grid gap-3">
            <input name={`faqs.${index}.question`} defaultValue={faq.question} className={fieldClass} />
            <textarea name={`faqs.${index}.answer`} defaultValue={faq.answer} className={`${fieldClass} min-h-24`} />
          </div>
        </details>
      ))}
      {document.sections.map((section, index) => (
        <details key={section.id} className="rounded-2xl border border-line bg-card p-4">
          <summary className="cursor-pointer font-display text-xl">{section.heading}</summary>
          <div className="mt-4 grid gap-3">
            <input type="hidden" name={`sections.${index}.id`} value={section.id} />
            <input name={`sections.${index}.heading`} defaultValue={section.heading} className={fieldClass} />
            <textarea name={`sections.${index}.body`} defaultValue={section.body} className={`${fieldClass} min-h-36`} />
          </div>
        </details>
      ))}
      <p className="text-sm text-muted">
        Status: {document.reviewStatus}, offering {document.offeringStatus}. HTML is escaped.
      </p>
      <div className="sticky bottom-0 z-10 -mx-4 flex flex-wrap gap-3 border-t border-line bg-paper/95 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6 lg:-mx-8 lg:px-8">
        <button name="intent" value="save" className="rounded-full border border-line bg-card px-4 py-2.5 text-sm font-semibold">
          Save draft
        </button>
        {role === "editor" ? null : (
          <>
            <button name="intent" value="publish" className="rounded-full bg-gold px-4 py-2.5 text-sm font-semibold text-paper">
              Publish
            </button>
            <button name="intent" value="unpublish" className="rounded-full border border-line bg-card px-4 py-2.5 text-sm font-semibold">
              Unpublish
            </button>
          </>
        )}
      </div>
    </AdminStateForm>
  );
}
