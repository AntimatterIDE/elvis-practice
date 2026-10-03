import type { Metadata } from "next";
import { IndexCard } from "@/components/site/index-card";
import { PageIntro } from "@/components/site/page-intro";
import { conditions } from "@/lib/content/conditions";
import { publicPageMetadata } from "@/lib/share-metadata";

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
        lede="These notes describe common reasons for an appointment with Dr. Francois. They are general education. A visit is where the cause, and the next step, are decided."
      />
      <ul className="mt-12 grid gap-4">
        {conditions.map((document) => (
          <li key={document.slug} id={document.slug} className="scroll-mt-28">
            <IndexCard document={document} />
          </li>
        ))}
      </ul>
      <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted">
        Neck fractures and spine tumors need urgent in-person care. This list explains those
        problems. It does not mean every operation is the right one, or that this website can
        evaluate an emergency.
      </p>
    </article>
  );
}
