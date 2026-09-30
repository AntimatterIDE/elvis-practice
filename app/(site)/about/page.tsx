import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";
import { PhotoPlaceholder } from "@/components/site/photo-placeholder";
import { practice } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "The Alignment Clinic is a new spine practice led by Elvis Francois, MD. It is not a rebrand of another clinic.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <PageIntro
        kicker="Practice"
        title="A clinic built around a clear conversation."
        lede="The Alignment Clinic takes its name from two kinds of alignment: the structure of the spine, and a plan that fits the person who has to live with it."
      />
      <div className="mt-12 grid gap-12 md:grid-cols-[1fr_16rem]">
        <div className="max-w-2xl space-y-6 text-lg leading-relaxed text-muted">
          <p>
            {practice.physicianName} is the physician. This is a new practice site. It does not
            inherit another clinic’s address, phone number, staff, testimonials, or claims.
          </p>
          <p>
            The public pages explain spine problems in ordinary language. They describe evaluation
            and the kinds of options a visit may include. They do not diagnose you, and they do not
            promise a result.
          </p>
          <p>
            Location, hours, insurance participation, hospital affiliations, and which procedures are
            offered here will be added only after the practice confirms them. Until then, those
            facts are left blank on purpose.
          </p>
          <p>
            Medical pages stay in draft until a clinician reviews them. Legal pages are drafts for
            an attorney. Nothing on this site is a substitute for a visit.
          </p>
        </div>
        <PhotoPlaceholder label="Clinic photograph pending" />
      </div>
    </article>
  );
}
