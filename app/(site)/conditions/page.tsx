import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/site/page-intro";
import { IconArrow } from "@/components/site/icons";
import { conditions } from "@/lib/content/conditions";
import { publicPageMetadata } from "@/lib/share-metadata";
import { isPubliclyVisible } from "@/lib/content/publish";
import { publicPath } from "@/lib/content";

export const metadata: Metadata = publicPageMetadata({
  title: "Conditions",
  description:
    "Plain-language notes on the spine problems people bring to The Alignment Clinic, including neck pain, low back pain, and nerve pain.",
  canonical: "/conditions",
});

export default function ConditionsIndexPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
      <PageIntro
        kicker="Conditions"
        title="Problems people bring to a spine visit."
        lede="Each note explains what the condition is, how it feels, and what a visit might explore. These are general education, not a diagnosis."
      />

      <div className="mt-12 mx-auto max-w-6xl px-5 md:px-8">
        {/* Feature cards for categories */}
        <div className="grid gap-6 md:grid-cols-3">
          <div className="rise-in group rounded-2xl border border-line bg-card p-6 card-shadow motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_16px_40px_-16px_rgb(7_30_54_/_0.3)]">
            <p className="text-2xl leading-none">🧠</p>
            <h3 className="mt-2 font-display text-lg font-medium leading-snug text-ink">Neck & Upper Spine</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Cervical disc issues, neck pain, and related nerve symptoms.</p>
          </div>
          <div className="rise-in group rounded-2xl border border-line bg-card p-6 card-shadow motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_16px_40px_-16px_rgb(7_30_54_/_0.3)]">
            <p className="text-2xl leading-none">🧵</p>
            <h3 className="mt-2 font-display text-lg font-medium leading-snug text-ink">Mid & Lower Back</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Thoracic and lumbar conditions affecting the lower spine.</p>
          </div>
          <div className="rise-in group rounded-2xl border border-line bg-card p-6 card-shadow motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:shadow-[0_16px_40px_-16px_rgb(7_30_54_/_0.3)]">
            <p className="text-2xl leading-none">⚡</p>
            <h3 className="mt-2 font-display text-lg font-medium leading-snug text-ink">Nerve & Structural</h3>
            <p className="mt-2 text-sm leading-relaxed text-muted">Nerve compression, spinal deformity, and related conditions.</p>
          </div>
        </div>

        {/* Condition cards */}
        <div className="mt-16 grid gap-5 md:grid-cols-2">
          {conditions.filter((d) => isPubliclyVisible(d)).map((document) => (
            <Link
              key={document.slug}
              href={publicPath(document)}
              className="rise-in group rounded-2xl border border-line bg-card p-6 card-shadow motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:-translate-y-1 motion-safe:hover:border-oxide/30 motion-safe:hover:shadow-[0_16px_40px_-16px_rgb(7_30_54_/_0.35)]"
            >
              <h2 className="font-display text-xl font-medium leading-tight text-ink">{document.title}</h2>
              <p className="mt-2 line-clamp-2 text-base leading-relaxed text-muted">{document.summary}</p>
              <span className="group mt-3 inline-flex items-center gap-2 text-sm font-semibold text-oxide-deep">
                Read more
                <IconArrow className="size-4 text-oxide-deep motion-safe:transition-all motion-safe:group-hover:translate-x-1" />
              </span>
            </Link>
          ))}
        </div>
      </div>
    </article>
  );
}
