import Link from "next/link";
import { EmergencyNote } from "@/components/site/emergency-note";
import { Markdown } from "@/components/site/markdown";
import type { ClinicalDocument } from "@/lib/content/schema";

export function ClinicalArticle({
  document,
  related,
  preview = false,
}: {
  document: ClinicalDocument;
  related: { href: string; title: string }[];
  preview?: boolean;
}) {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      {preview ? (
        <p className="mb-8 rounded-2xl border border-gold/30 bg-gold/10 px-4 py-3 text-sm text-royal" role="note">
          Draft preview. This page is not published, is not indexed, and is not a statement that the
          practice offers this care. Clinical review is still pending.
        </p>
      ) : null}
      <header className="border-b border-line pb-10">
        <p className="kicker text-royal">{document.kind === "condition" ? "Condition" : "Treatment"}</p>
        <h1 className="mt-4 max-w-3xl font-display text-4xl font-semibold leading-[1.1] tracking-tight md:text-5xl">
          {document.title}
        </h1>
        <p className="mt-4 max-w-2xl text-lg leading-relaxed text-muted">{document.summary}</p>
      </header>
      <div className="mt-10">
        <EmergencyNote />
      </div>
      <div className="mt-10 grid gap-4">
        {document.sections.map((section) => (
          <section key={section.id} className="rounded-2xl border border-line bg-card p-6 card-shadow md:p-8">
            <h2 className="font-display text-2xl font-medium leading-tight">{section.heading}</h2>
            <div className="mt-4 max-w-3xl">
              <Markdown source={section.body} />
            </div>
          </section>
        ))}
      </div>
      {document.faqs.length > 0 ? (
        <section className="mt-16 border-t border-line pt-10">
          <h2 className="font-display text-3xl font-semibold tracking-tight">Questions</h2>
          <dl className="mt-6 grid gap-6">
            {document.faqs.map((faq) => (
              <div key={faq.question}>
                <dt className="font-display text-xl font-medium leading-snug text-ink">{faq.question}</dt>
                <dd className="mt-2 max-w-2xl text-muted">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {related.length > 0 ? (
        <section className="mt-12 border-t border-line pt-8">
          <h2 className="kicker text-royal">Related</h2>
          <ul className="mt-4 grid gap-2">
            {related.map((item) => (
              <li key={item.href}>
                <Link className="underline underline-offset-4" href={item.href}>
                  {item.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
      <section className="mt-12 flex flex-col gap-4 border-t border-line pt-8 md:flex-row md:items-center md:justify-between">
        <p className="max-w-xl text-muted">
          This page is general information. It does not say whether the care is right for you.
        </p>
        <Link href="/contact" className="inline-flex min-h-11 items-center justify-center rounded-full bg-gold-deep px-5 text-center text-sm font-semibold text-paper hover:bg-gold-deep">
          Contact the practice
        </Link>
      </section>
    </article>
  );
}
