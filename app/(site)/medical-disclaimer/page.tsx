import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";
import { publicPageMetadata } from "@/lib/share-metadata";
export const metadata: Metadata = publicPageMetadata({
  title: "Medical disclaimer",
  description: "The Alignment Clinic website is general information, not personal medical advice.",
  canonical: "/medical-disclaimer",
});

export default function DisclaimerPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
      <PageIntro
        kicker="Disclaimer"
        title="General information, not personal advice."
        lede="Reading this site does not create a physician-patient relationship."
      />
      <div className="mt-10 space-y-6 text-lg leading-relaxed text-muted">
        <p>
          Articles describe conditions and procedures in plain language so you can prepare for a
          conversation. They do not tell you whether you need surgery, medication, or any other
          treatment.
        </p>
        <p>
          Outcomes vary. This site does not quote success rates or patient stories. The physician
          page lists training that is part of Dr. Francois’s public biography: Meharry Medical
          College, the Mayo Clinic, and a spine fellowship at Harvard. Hospital appointments are
          confirmed when surgery is scheduled.
        </p>
      </div>
    </article>
  );
}
