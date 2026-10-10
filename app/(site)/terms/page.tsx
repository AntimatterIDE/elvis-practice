import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";
import { ReviewBanner } from "@/components/site/review-banner";
import { publicPageMetadata } from "@/lib/share-metadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Terms",
  description: "Draft terms for The Alignment Clinic website. Awaiting attorney review.",
  canonical: "/terms",
  robots: { index: false, follow: false },
});

export default function TermsPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
      <PageIntro
        kicker="Terms"
        title="How to read this website."
        lede="This is a draft for attorney review. It is not a finished terms-of-use agreement."
      />
      <div className="mt-8">
        <ReviewBanner>
          Draft for attorney review. Do not treat this page as legal advice or as a contract.
        </ReviewBanner>
      </div>
      <div className="mt-10 space-y-6 text-lg leading-relaxed text-muted">
        <p>
          Pages on this site describe a medical practice in general terms. They are not a diagnosis,
          a treatment plan, or a promise of outcome. Only a clinician who has evaluated you can give
          advice about your care.
        </p>
        <p>
          Condition and treatment guides that are still in draft are not part of the public site.
          Published pages can change after clinical or legal review.
        </p>
        <p>
          You agree not to send protected health information through ordinary website forms.
        </p>
      </div>
    </article>
  );
}
