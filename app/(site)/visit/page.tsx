import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";

export const metadata: Metadata = {
  title: "Your visit",
  description:
    "How a visit at The Alignment Clinic works, what to bring, and what this website will not collect.",
  alternates: { canonical: "/visit" },
};

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
    body: "Instructions for imaging, injections, or surgery depend on the plan you make in person. You receive those instructions from the practice after the visit. This page does not guess them.",
  },
  {
    heading: "Insurance and payment",
    body: "Bring your insurance card to the visit and ask which plans the practice is billing. This website does not publish a plan list, a price, or a guarantee of coverage. Do not send member IDs or claim numbers through the contact form.",
  },
];

export default function VisitPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
      <PageIntro
        kicker="Visit"
        title="What to expect before the first appointment."
        lede="A visit is a history, an examination, and a plan you can follow. These notes describe that visit. They are not personal instructions."
      />
      <div className="mt-10 grid gap-4">
        {sections.map((section, index) => (
          <section key={section.heading} className="rounded-2xl border border-line bg-card p-6 card-shadow md:p-8">
            <p className="kicker text-oxide-deep">0{index + 1}</p>
            <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">{section.heading}</h2>
            <p className="mt-3 max-w-2xl text-lg leading-relaxed text-muted">{section.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
