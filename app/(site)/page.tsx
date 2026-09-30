import type { Metadata } from "next";
import { AlignmentRule } from "@/components/site/alignment-rule";
import { CareIndex } from "@/components/site/care-index";
import { PhotoPlaceholder } from "@/components/site/photo-placeholder";
import { practice } from "@/lib/site";

export const metadata: Metadata = {
  title: { absolute: practice.name },
  description: practice.description,
  alternates: { canonical: "/" },
};

const journey = [
  {
    label: "Conversation",
    body: "You describe what has changed, what you have already tried, and what you need to get back to.",
  },
  {
    label: "Evaluation",
    body: "The physician examines you and explains which findings matter. Tests are ordered when they would change the plan.",
  },
  {
    label: "A plan you can follow",
    body: "Options are named in plain language, including care that does not involve an operation.",
  },
  {
    label: "Follow-through",
    body: "Next steps are written down. The practice will publish preparation details once they are confirmed.",
  },
];

export default function HomePage() {
  return (
    <>
      <section className="mx-auto grid max-w-6xl gap-12 px-5 py-16 md:grid-cols-[auto_1fr_18rem] md:px-8 md:py-24">
        <AlignmentRule className="hidden h-64 md:block" />
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-oxide">{practice.name}</p>
          <h1 className="mt-4 max-w-xl font-display text-5xl leading-[0.98] text-ink md:text-7xl">
            Spine care, carefully aligned.
          </h1>
          <p className="mt-6 max-w-xl text-xl leading-relaxed text-muted">
            {practice.name} is a new practice led by {practice.physicianName}. The work is to
            understand the problem, explain it clearly, and decide the next step with you.
          </p>
          <div className="mt-8 flex flex-wrap gap-4">
            <a href="/contact" className="bg-oxide px-5 py-3 text-sm text-paper hover:bg-oxide-deep">
              Contact the practice
            </a>
            <a href="/about" className="border border-ink/15 px-5 py-3 text-sm">
              About the clinic
            </a>
          </div>
          <p className="mt-6 max-w-md text-sm text-muted">
            Address, phone, hours, and online booking will appear after the practice confirms them.
          </p>
        </div>
        <PhotoPlaceholder className="md:mt-8" />
      </section>

      <section className="mx-auto max-w-6xl px-5 pb-8 md:px-8" aria-labelledby="pathways-heading">
        <div className="mb-8 grid gap-4 md:grid-cols-[9rem_1fr]">
          <p id="pathways-heading" className="text-xs uppercase tracking-[0.18em] text-oxide">
            Care
          </p>
          <p className="max-w-xl text-lg text-muted">
            Four ways people arrive. Written condition guides stay unpublished until a clinician
            approves them.
          </p>
        </div>
        <CareIndex />
      </section>

      <section className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-[9rem_1fr_16rem] md:px-8">
        <p className="text-xs uppercase tracking-[0.18em] text-oxide">Physician</p>
        <div>
          <h2 className="font-display text-5xl leading-none md:text-6xl">{practice.physicianName}</h2>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Dr. Francois is the physician of {practice.name}. This site introduces the practice. It
            does not list training, certification, hospital appointments, or public appearances until
            those details are confirmed for publication.
          </p>
          <a
            href={practice.physicianPath}
            className="mt-6 inline-block text-ink underline underline-offset-4"
          >
            Read the physician profile
          </a>
        </div>
        <PhotoPlaceholder label="Portrait pending" className="min-h-64" />
      </section>

      <section className="border-y border-line bg-card" aria-labelledby="journey-heading">
        <div className="mx-auto max-w-6xl px-5 py-16 md:px-8">
          <h2 id="journey-heading" className="font-display text-4xl">
            A visit, in order
          </h2>
          <ol className="mt-10 grid gap-8 md:grid-cols-4">
            {journey.map((step, index) => (
              <li key={step.label}>
                <p className="text-xs uppercase tracking-[0.18em] text-oxide">0{index + 1}</p>
                <h3 className="mt-3 font-display text-2xl">{step.label}</h3>
                <p className="mt-3 text-muted">{step.body}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-20 md:flex-row md:items-end md:justify-between md:px-8">
        <div>
          <h2 className="font-display text-4xl md:text-5xl">Ready when you are.</h2>
          <p className="mt-4 max-w-lg text-lg text-muted">
            There is no online booking link yet. Use the contact page for an administrative inquiry.
            Do not include medical details.
          </p>
        </div>
        <a href="/contact" className="bg-oxide px-5 py-3 text-sm text-paper hover:bg-oxide-deep">
          Contact the practice
        </a>
      </section>
    </>
  );
}
