import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";
import { publicConditions } from "@/lib/content";

export const metadata: Metadata = {
  title: "Conditions",
  description: "Condition guides published by The Alignment Clinic after clinical review.",
  alternates: { canonical: "/conditions" },
};

export default function ConditionsIndexPage() {
  const documents = publicConditions();

  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <PageIntro
        kicker="Conditions"
        title="Guides, after they are approved."
        lede="The practice is preparing plain-language pages about neck pain, low back pain, nerve pain, and a small number of more serious problems. Nothing is listed here until a clinician approves it and the practice confirms the scope of care."
      />
      {documents.length === 0 ? (
        <p className="mt-12 max-w-xl border border-line bg-card px-5 py-6 text-lg text-muted">
          No condition guides are published yet. Drafts are withheld from this page, from search
          engines, and from the homepage.
        </p>
      ) : (
        <ul className="mt-12 divide-y divide-line border-y border-line">
          {documents.map((document) => (
            <li key={document.slug}>
              <a className="block py-6" href={`/conditions/${document.slug}`}>
                <span className="font-display text-3xl">{document.title}</span>
                <span className="mt-2 block max-w-2xl text-muted">{document.summary}</span>
              </a>
            </li>
          ))}
        </ul>
      )}
    </article>
  );
}
