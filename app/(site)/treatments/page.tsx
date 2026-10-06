import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/site/page-intro";
import { IconArrow } from "@/components/site/icons";
import { treatments } from "@/lib/content/treatments";
import { publicPageMetadata } from "@/lib/share-metadata";
import { clinicalFocus } from "@/lib/site";
import { isPubliclyVisible } from "@/lib/content/publish";
import { publicPath } from "@/lib/content";

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
        lede="Dr. Francois\u2019s published clinical interests are minimally invasive spine surgery, cervical and lumbar disc disease, spinal deformity, and motion-preserving techniques."
      />

      {/* Clinical focus badges */}
      <section className="mt-12 mx-auto max-w-6xl px-5 md:px-8">
        <div className="flex flex-wrap gap-3">
          {clinicalFocus.map((focus) => (
            <span
              key={focus}
              className="rise-in rounded-full border border-oxide/20 bg-mint/40 px-4 py-1.5 text-sm font-medium text-oxide-deep motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:bg-mint/60 motion-safe:hover:-translate-y-0.5"
            >
              {focus}
            </span>
          ))}
        </div>
      </section>

      {/* Treatment cards grid */}
      <section className="mt-16 mx-auto max-w-6xl px-5 md:px-8">
        <div className="grid gap-5 md:grid-cols-2">
          {documents.filter((d) => isPubliclyVisible(d)).map((document) => (
            <Link
              key={document.slug}
              href={publicPath(document)}
              className="rise-in group rounded-2xl border border-line bg-card p-6 card-shadow motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:border-oxide/30 motion-safe:hover:shadow-[0_16px_40px_-16px_rgb(7_30_54_/_0.35)]"
            >
              <h2 className="font-display text-xl font-medium leading-tight text-ink">{document.title}</h2>
              <p className="mt-2 line-clamp-3 text-base leading-relaxed text-muted">{document.summary}</p>
              <span className="group mt-3 inline-flex items-center gap-2 text-sm font-semibold text-oxide-deep">
                Read more
                <IconArrow className="size-4 text-oxide-deep motion-safe:transition-all motion-safe:group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      {/* Note about scope */}
      <section className="mt-20 mx-auto max-w-4xl px-5 md:px-8">
        <div className="rounded-2xl border border-oxide/10 bg-mist/60 p-6 md:p-8">
          <p className="text-sm leading-relaxed text-muted">
            <strong className="text-oxide-deep">Note:</strong> These notes are general education about operations
            Dr. Francois may discuss during a visit. They are not an offer of every procedure listed.
            Your visit determines which options fit your situation.
          </p>
        </div>
      </section>
    </article>
  );
}