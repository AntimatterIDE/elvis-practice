import type { Metadata } from "next";
import { IndexCard } from "@/components/site/index-card";
import { PageIntro } from "@/components/site/page-intro";
import { treatments } from "@/lib/content/treatments";
import { publicPageMetadata } from "@/lib/share-metadata";
import { clinicalFocus } from "@/lib/site";

export const metadata: Metadata = publicPageMetadata({
  title: "Treatments",
  description:
    "Plain-language notes on spine operations Dr. Francois may discuss, including disc surgery, decompression, and fusion.",
  canonical: "/treatments",
});

const omitted = new Set([
  "image-guided-spine-surgery",
  "scoliosis-surgery",
  "spine-fracture-surgery",
  "spinal-tumor-surgery",
]);

export default function TreatmentsIndexPage() {
  const documents = treatments.filter((document) => !omitted.has(document.slug));

  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
      <PageIntro
        kicker="Treatments"
        title="Operations a visit may discuss."
        lede="Dr. Francois’s published clinical interests are minimally invasive spine surgery, cervical and lumbar disc disease, spinal deformity, and motion-preserving techniques. Whether any operation belongs in your plan is decided after an examination."
      />
      <ul className="mt-8 flex flex-wrap gap-2">
        {clinicalFocus.map((item) => (
          <li
            key={item}
            className="inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-sm font-medium text-ink card-shadow"
          >
            {item}
          </li>
        ))}
      </ul>
      <ul className="mt-10 grid gap-4">
        {documents.map((document) => (
          <li key={document.slug} id={document.slug} className="scroll-mt-28">
            <IndexCard document={document} />
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
