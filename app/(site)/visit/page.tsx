import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";
import { publicPageMetadata } from "@/lib/share-metadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Your visit",
  description:
    "How a visit at The Alignment Clinic works, what to bring, and what this website will not collect.",
  canonical: "/visit",
});

const steps = [
  {
    number: 1,
    heading: "Scheduling",
    icon: "phone",
    body: "New patients are welcome. Request a call from the contact page. There is no online scheduler on this site. The form asks for a name and a way to reach you. It refuses symptoms, imaging, and insurance numbers, and it tells you if the note was not delivered.",
  },
  {
    number: 2,
    heading: "What to bring",
    icon: "bag",
    body: "Bring a photo ID, the names of the medicines you take, and copies or discs of imaging you already have, including the written report. Do not upload those documents here. This website is not a chart and it is not a secure message center.",
  },
  {
    number: 3,
    heading: "During the visit",
    icon: "stethoscope",
    body: "Expect time for your history and an examination. Dr. Francois explains which findings matter and which tests, if any, would change the plan. Many people leave with nonoperative care. Surgery is discussed when it is one of the reasonable paths, not as the default.",
  },
  {
    number: 4,
    heading: "Preparation",
    icon: "clipboard",
    body: "Instructions for imaging, injections, or surgery depend on the plan you make in person. You receive those instructions from the practice after the visit. This page does not guess them.",
  },
  {
    number: 5,
    heading: "Insurance and payment",
    icon: "card",
    body: "Bring your insurance card to the visit and ask which plans the practice is billing. This website does not publish a plan list, a price, or a guarantee of coverage. Do not send member IDs or claim numbers through the contact form.",
  },
];

export default function VisitPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
      <PageIntro
        kicker="Your visit"
        title="What to expect, step by step."
        lede="From scheduling to the exam room — here is how a visit at The Alignment Clinic works."
      />
      <div className="relative mt-14">
        {/* vertical timeline line */}
        <div className="absolute left-[1.125rem] top-0 h-full w-px bg-gradient-to-b from-oxide-deep/60 via-oxide-deep/20 to-transparent" />
        <ol className="grid gap-6">
          {steps.map((step) => (
            <li key={step.number} className="relative pl-10 md:pl-12">
              {/* step number badge */}
              <span className="absolute left-0 top-0 flex size-8 items-center justify-center rounded-full bg-oxide-deep text-xs font-bold text-paper shadow-[0_2px_8px_rgb(7_30_54_/_0.3)]">
                {step.number}
              </span>
              <div className="rounded-2xl border border-line bg-card px-6 py-5 shadow-[0_4px_16px_-8px_rgb(7_30_54_/_0.18)]">
                <h2 className="font-display text-xl font-semibold text-ink">{step.heading}</h2>
                <p className="mt-2 max-w-2xl leading-relaxed text-muted">{step.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>
      <p className="mt-12 max-w-3xl rounded-2xl border border-line bg-mist px-6 py-5 text-sm leading-relaxed text-ink/80">
        This website is not a chart and it is not a secure message center. Do not send medical
        information, member IDs, or claim numbers through the contact form.
      </p>
    </article>
  );
}