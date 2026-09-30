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
        <p className="mb-8 border border-oxide/30 bg-card px-4 py-3 text-sm text-oxide" role="note">
          Draft preview. This page is not published, is not indexed, and is not a statement that the
          practice offers this care. Clinical review is still pending.
        </p>
      ) : null}
      <header className="grid gap-6 border-b border-line pb-10 md:grid-cols-[9rem_1fr]">
        <p className="text-xs uppercase tracking-[0.18em] text-oxide">
          {document.kind === "condition" ? "Condition" : "Treatment"}
        </p>
        <div>
          <h1 className="max-w-3xl font-display text-5xl leading-[1.02] md:text-6xl">{document.title}</h1>
          <p className="mt-6 max-w-2xl text-xl leading-relaxed text-muted">{document.summary}</p>
        </div>
      </header>
      <div className="mt-10">
        <EmergencyNote />
      </div>
      <div className="mt-12 grid gap-12">
        {document.sections.map((section) => (
          <section key={section.id} className="grid gap-4 md:grid-cols-[14rem_1fr]">
            <h2 className="font-display text-3xl">{section.heading}</h2>
            <Markdown source={section.body} />
          </section>
        ))}
      </div>
      {document.faqs.length > 0 ? (
        <section className="mt-16 border-t border-line pt-10">
          <h2 className="font-display text-3xl">Questions</h2>
          <dl className="mt-6 grid gap-6">
            {document.faqs.map((faq) => (
              <div key={faq.question}>
                <dt className="text-lg text-ink">{faq.question}</dt>
                <dd className="mt-2 max-w-2xl text-muted">{faq.answer}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      {related.length > 0 ? (
        <section className="mt-12 border-t border-line pt-8">
          <h2 className="text-xs uppercase tracking-[0.18em] text-oxide">Related</h2>
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
        <a href="/contact" className="bg-oxide px-5 py-3 text-center text-sm text-paper">
          Contact the practice
        </a>
      </section>
    </article>
  );
}
