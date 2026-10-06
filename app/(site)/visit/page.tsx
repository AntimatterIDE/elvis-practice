import type { Metadata } from "next";
import Link from "next/link";
import { PageIntro } from "@/components/site/page-intro";
import { Timeline } from "@/components/site/timeline";
import { FeatureCards } from "@/components/site/feature-cards";
import { CTASection } from "@/components/site/cta-section";
import { EmergencyNote } from "@/components/site/emergency-note";
import { publicPageMetadata } from "@/lib/share-metadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Your visit",
  description:
    "How a visit at The Alignment Clinic works, what to bring, and what this website will not collect.",
  canonical: "/visit",
});

const sections = [
  {
    heading: "Scheduling",
    body: "New patients are welcome. Request a call from the contact page. There is no online scheduler on this site. The form asks for a name and a way to reach you. It refuses symptoms, imaging, and insurance numbers, and it tells you if the note was not delivered.",
  },
  {
    heading: "What to bring to the office",
    body: "Bring a photo ID, the names of the medicines you take, and copies or discs of imaging you already have, including the written report. Do not upload those documents here. This website is not a chart and it is not a secure message center.",
  },
  {
    heading: "During the visit",
    body: "Expect time for your history and an examination. Dr. Francois explains which findings matter and which tests, if any, would change the plan. Many people leave with nonoperative care. Surgery is discussed when it is one of the reasonable paths, not as the default.",
  },
  {
    heading: "Preparation",
    body: "Instructions for your appointment will be provided when your visit is scheduled. In general, bring your medication list and any relevant imaging. Wear comfortable clothing that allows access to your back or neck. Arrive a few minutes early to complete any paperwork.",
  },
  {
    heading: "After the visit",
    body: "You will leave with a clear next step. This may be a therapy plan, a test to schedule, a referral, or a procedure date. Every plan includes a way to reach the office with questions.",
  },
];

export default function VisitPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
      <PageIntro
        kicker="Visit"
        title="What to expect when you come in."
        lede="A visit at The Alignment Clinic is a conversation. You describe the problem, the physician examines you, and together you decide what to do next."
      />

      {/* Emergency note */}
      <section className="mt-10">
        <EmergencyNote />
      </section>

      {/* Visit timeline */}
      <section className="mt-20">
        <h2 className="kicker mx-auto max-w-6xl px-5 text-oxide-deep md:px-8">Your visit step by step</h2>
        <Timeline
          steps={[
            {
              number: "1",
              title: "Scheduling",
              description: "New patients are welcome. Request a call from the contact page. There is no online scheduler on this site. The form asks for a name and a way to reach you. It refuses symptoms, imaging, and insurance numbers, and it tells you if the note was not delivered.",
              icon: "\uD83D\uDCC5",
            },
            {
              number: "2",
              title: "What to bring",
              description: "Bring a photo ID, the names of the medicines you take, and copies or discs of imaging you already have, including the written report. Do not upload those documents here. This website is not a chart and it is not a secure message center.",
              icon: "\uD83D\uDCBC",
            },
            {
              number: "3",
              title: "During the visit",
              description: "Expect time for your history and an examination. Dr. Francois explains which findings matter and which tests, if any, would change the plan. Many people leave with nonoperative care. Surgery is discussed when it is one of the reasonable paths, not as the default.",
              icon: "\uD83D\uDC69\u200D\u2695\uFE0F",
            },
            {
              number: "4",
              title: "Preparation",
              description: "Instructions for your appointment will be provided when your visit is scheduled. In general, bring your medication list and any relevant imaging. Wear comfortable clothing that allows access to your back or neck.",
              icon: "\u2705",
            },
            {
              number: "5",
              title: "After the visit",
              description: "You will leave with a clear next step. This may be a therapy plan, a test to schedule, a referral, or a procedure date. Every plan includes a way to reach the office with questions.",
              icon: "\uD83D\uDCDD",
            },
          ]}
        />
      </section>

      {/* Preparation cards */}
      <section className="mt-20">
        <h2 className="kicker mx-auto max-w-6xl px-5 text-oxide-deep md:px-8">Quick tips</h2>
        <FeatureCards
          cards={[
            {
              icon: "\uD83D\uDC64",
              title: "Bring ID & insurance card",
              description: "Photo ID and your insurance card if you plan to use coverage.",
            },
            {
              icon: "\uD83D\uDCCB",
              title: "Medication list",
              description: "Names and doses of everything you take, including over-the-counter medicines.",
            },
            {
              icon: "\uD83D\uDCDA",
              title: "Imaging discs or reports",
              description: "Copies or discs of imaging you already have, plus any written reports.",
            },
            {
              icon: "\uD83D\uDC55",
              title: "Comfortable clothing",
              description: "Wear something that allows easy access to your back or neck for the exam.",
            },
          ]}
          columns={2}
        />
      </section>

      {/* CTA */}
      <section className="mt-20">
        <CTASection
          title="Ready to schedule?"
          description="New patients are welcome. Send your name and a way to reach you, and we will call to arrange a visit."
          href="/contact"
          label="Request a call"
        />
      </section>
    </article>
  );
}