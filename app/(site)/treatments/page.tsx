import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";
import { publicTreatments } from "@/lib/content";

export const metadata: Metadata = {
  title: "Treatments",
  description: "Treatment guides published by The Alignment Clinic only after the practice confirms they are offered.",
  alternates: { canonical: "/treatments" },
};

export default function TreatmentsIndexPage() {
  const documents = publicTreatments();

  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <PageIntro
        kicker="Treatments"
        title="Procedures, only when confirmed."
        lede="A procedure page will appear here only if the practice confirms that it is offered and a clinician approves the wording. An unpublished draft is not an advertisement."
      />
      {documents.length === 0 ? (
        <p className="mt-12 max-w-xl border border-line bg-card px-5 py-6 text-lg text-muted">
          No procedures are published yet. Topics still in review, including tumor surgery, scoliosis
          surgery, fracture surgery, and image-guided technology, stay off this list.
        </p>
      ) : (
        <ul className="mt-12 divide-y divide-line border-y border-line">
          {documents.map((document) => (
            <li key={document.slug}>
              <a className="block py-6" href={`/treatments/${document.slug}`}>
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
