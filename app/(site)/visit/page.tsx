import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";

export const metadata: Metadata = {
  title: "Your visit",
  description:
    "How a visit at The Alignment Clinic is arranged, what to bring, and what the website will not collect.",
  alternates: { canonical: "/visit" },
};

const sections = [
  {
    heading: "Scheduling",
    body: "There is no booking link on this site yet. When a phone number or approved scheduling service is confirmed, it will be published on the contact page. Until then, the contact form accepts an administrative inquiry only, and it does not send or store the message.",
  },
  {
    heading: "What to bring to the office",
    body: "Bring a photo ID, a list of medicines you take, and copies of imaging reports you already have. Do not upload those documents here. This website is not a chart and it is not a secure message center.",
  },
  {
    heading: "During the visit",
    body: "Expect time for your history and an examination. The physician will explain which findings matter and which tests, if any, would change the plan. You should leave knowing the options and what happens next.",
  },
  {
    heading: "Preparation",
    body: "Specific instructions for imaging, injections, or surgery depend on the plan you make in person. Those instructions will be given by the practice, not guessed on this page.",
  },
  {
    heading: "Insurance and payment",
    body: "Participating plans, estimates, and payment methods are not listed because they have not been supplied. Ask the office once a phone number is published. Do not send insurance numbers, member IDs, or claim details through this website.",
  },
];

export default function VisitPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <PageIntro
        kicker="Visit"
        title="What to expect before the first appointment."
        lede="These notes describe the shape of a visit. They are not personal instructions, and they leave out anything the practice has not confirmed."
      />
      <div className="mt-12 grid gap-10">
        {sections.map((section) => (
          <section key={section.heading} className="grid gap-3 border-t border-line pt-8 md:grid-cols-[14rem_1fr]">
            <h2 className="font-display text-3xl">{section.heading}</h2>
            <p className="max-w-2xl text-lg leading-relaxed text-muted">{section.body}</p>
          </section>
        ))}
      </div>
    </article>
  );
}
