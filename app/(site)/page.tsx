import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import { CareIndex } from "@/components/site/care-index";
import { FocusCycle } from "@/components/site/focus-cycle";
import { PhotoPlaceholder } from "@/components/site/photo-placeholder";
import { Reveal } from "@/components/site/reveal";
import { SpineArt } from "@/components/site/spine-art";
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

const assurances = [
  { label: "Physician-led", body: "Elvis Francois, MD sees the problem with you, not through a script." },
  { label: "Plain language", body: "Findings and options are explained so you can actually use them." },
  { label: "Shared decisions", body: "Surgery is one path. It is not the assumption you walk in with." },
  { label: "No invented facts", body: "Address, phone, hours, and credentials stay blank until confirmed." },
];

export default function HomePage() {
  return (
    <>
      <section className="px-4 pt-4 md:px-8 md:pt-6">
        <div className="hero-panel relative mx-auto max-w-6xl overflow-hidden rounded-[1.75rem] text-paper shadow-[0_30px_70px_-40px_rgb(7_30_54_/_0.85)]">
          <div className="pointer-events-none absolute inset-y-0 right-0 hidden w-[44%] lg:block">
            <SpineArt className="absolute right-0 top-8 h-[92%] w-full" />
          </div>
          <div className="relative grid gap-10 px-6 py-12 md:px-12 md:py-16 lg:grid-cols-[minmax(0,36rem)_1fr] lg:items-end">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-foam/90">
                {practice.name}
              </p>
              <div className="mt-4">
                <FocusCycle />
              </div>
              <h1 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
                Spine care, carefully aligned.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-paper/80">
                {practice.name} is a new practice led by {practice.physicianName}. The work is to
                understand the problem, explain it clearly, and decide the next step with you.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <a
                  href="/contact"
                  className="group inline-flex items-center gap-2 rounded-full bg-foam px-5 py-3 text-sm font-semibold text-pine transition hover:-translate-y-0.5"
                >
                  Contact the practice
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
                </a>
                <a
                  href="/about"
                  className="inline-flex items-center rounded-full border border-white/25 bg-white/5 px-5 py-3 text-sm font-semibold text-paper transition hover:-translate-y-0.5 hover:bg-white/10"
                >
                  About the clinic
                </a>
              </div>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-paper/70">
                Address, phone, hours, and online booking will appear after the practice confirms them.
              </p>
            </div>
            <p className="float-chip relative justify-self-start rounded-full border border-white/20 bg-white/10 px-3 py-1.5 text-xs font-medium tracking-wide text-paper/85 backdrop-blur lg:justify-self-end">
              Photograph pending
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-8 md:px-8" aria-label="How the practice works">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {assurances.map((item, index) => (
            <Reveal key={item.label} delay={index * 0.06}>
              <article className="clinic-card h-full rounded-2xl border border-line bg-card p-5 shadow-[0_16px_40px_-32px_rgb(7_30_54_/_0.8)]">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-oxide">
                  0{index + 1}
                </p>
                <h2 className="mt-3 font-display text-lg font-semibold tracking-tight">{item.label}</h2>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-12 md:px-8" aria-labelledby="pathways-heading">
        <Reveal>
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-oxide">Care</p>
              <h2 id="pathways-heading" className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Where people start
              </h2>
            </div>
            <p className="max-w-md text-muted">
              Four ways people arrive. Written condition guides stay unpublished until a clinician
              approves them.
            </p>
          </div>
        </Reveal>
        <CareIndex />
      </section>

      <section className="bg-mist" aria-labelledby="physician-heading">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-[16rem_1fr] md:px-8 md:py-20">
          <Reveal>
            <PhotoPlaceholder label="Portrait pending" className="min-h-80" />
          </Reveal>
          <Reveal delay={0.08}>
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-oxide">Physician</p>
            <h2
              id="physician-heading"
              className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl"
            >
              {practice.physicianName}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Dr. Francois is the physician of {practice.name}. This site introduces the practice. It
              does not list training, certification, hospital appointments, or public appearances until
              those details are confirmed for publication.
            </p>
            <a
              href={practice.physicianPath}
              className="group mt-6 inline-flex items-center gap-2 font-semibold text-oxide"
            >
              Read the physician profile
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8" aria-labelledby="journey-heading">
        <Reveal>
          <h2 id="journey-heading" className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
            A visit, in order
          </h2>
        </Reveal>
        <ol className="relative mt-10 grid gap-4 md:grid-cols-4">
          {journey.map((step, index) => (
            <Reveal key={step.label} delay={index * 0.07}>
              <li className="clinic-card h-full rounded-2xl border border-line bg-card p-5">
                <span className="inline-flex size-9 items-center justify-center rounded-full bg-mint text-sm font-semibold text-oxide-deep">
                  0{index + 1}
                </span>
                <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">{step.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
              </li>
            </Reveal>
          ))}
        </ol>
      </section>

      <section className="px-4 pb-16 md:px-8">
        <Reveal>
          <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-[1.75rem] bg-pine px-6 py-12 text-paper md:flex-row md:items-end md:justify-between md:px-12 md:py-14">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Ready when you are.
              </h2>
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-paper/75">
                There is no online booking link yet. Use the contact page for an administrative inquiry.
                Do not include medical details.
              </p>
            </div>
            <a
              href="/contact"
              className="group inline-flex shrink-0 items-center gap-2 rounded-full bg-foam px-5 py-3 text-sm font-semibold text-pine transition hover:-translate-y-0.5"
            >
              Contact the practice
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1" />
            </a>
          </div>
        </Reveal>
      </section>
    </>
  );
}
