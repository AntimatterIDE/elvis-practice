import type { Metadata } from "next";
import { ConditionsHero } from "@/components/site/conditions-hero";
import { IndexCard } from "@/components/site/index-card";
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
    <>
      <ConditionsHero />
      <article className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
        <ul className="grid gap-4">
          {conditions.map((document) => (
            <li key={document.slug} id={document.slug} className="scroll-mt-28">
              <IndexCard document={document} />
            </li>
          ))}
        </ul>
        <p className="mt-8 max-w-2xl text-sm leading-relaxed text-muted">
          Neck fractures and spine tumors need urgent in-person care. This list explains those
          problems. It does not mean every operation is the right one.
        </p>
      </article>
    </>
  );
}
