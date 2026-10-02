import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";
import { treatments } from "@/lib/content/treatments";
import { clinicalFocus } from "@/lib/site";

export const metadata: Metadata = {
  title: "Treatments",
  description:
    "Plain-language notes on spine operations Dr. Francois may discuss, including disc surgery, decompression, and fusion.",
  alternates: { canonical: "/treatments" },
};

const omitted = new Set([
  "image-guided-spine-surgery",
  "scoliosis-surgery",
  "spine-fracture-surgery",
  "spinal-tumor-surgery",
]);

export default function TreatmentsIndexPage() {
  const documents = treatments.filter((document) => !omitted.has(document.slug));

  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <PageIntro
        kicker="Treatments"
        title="Operations a visit may discuss."
        lede="Dr. Francois’s published clinical interests are minimally invasive spine surgery, cervical and lumbar disc disease, spinal deformity, and motion-preserving techniques. Whether any operation belongs in your plan is decided after an examination."
      />
      <ul className="mt-8 flex flex-wrap gap-2">
        {clinicalFocus.map((item) => (
          <li
            key={item}
            className="rounded-full border border-line bg-card px-3 py-1.5 text-sm font-medium text-ink"
          >
            {item}
          </li>
        ))}
      </ul>
      <ul className="mt-10 grid gap-4">
        {documents.map((document) => (
          <li key={document.slug}>
            <article className="rounded-2xl border border-line bg-card px-6 py-6 shadow-sm">
              <h2 className="font-display text-2xl font-semibold tracking-tight">{document.title}</h2>
              <p className="mt-2 max-w-2xl text-muted">{document.summary}</p>
            </article>
          </li>
        ))}
      </ul>
      <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted">
        Fracture care and tumor surgery are decided in a hospital setting for a specific patient.
        This page does not advertise them as elective services, and it does not claim that a robot
        or a navigation system is used here.
      </p>
    </article>
  );
}
