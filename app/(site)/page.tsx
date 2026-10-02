import type { Metadata } from "next";
import { ArrowRight } from "lucide-react";
import Link from "next/link";
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
    body: "You leave with the next step written down: time, therapy, a test, or a procedure.",
  },
];

const assurances = [
  { label: "Physician-led", body: "Elvis Francois, MD sees the problem with you, not through a script." },
  { label: "Fellowship-trained", body: "Spine fellowship at Harvard, after orthopedic residency at the Mayo Clinic." },
  { label: "Plain language", body: "Findings and options are explained so you can actually use them." },
  { label: "Shared decisions", body: "Surgery is one path. Nonoperative care is part of the same conversation." },
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
              <p className="kicker text-foam">{practice.name}</p>
              <div className="mt-4">
                <FocusCycle />
              </div>
              <h1 className="mt-4 max-w-xl font-display text-4xl font-semibold leading-[1.08] tracking-tight md:text-6xl">
                Spine care, carefully aligned.
              </h1>
              <p className="mt-5 max-w-xl text-lg leading-relaxed text-paper">
                {practice.physicianName} is an orthopedic spine surgeon. The work of this practice is
                to understand the problem, explain it clearly, and decide the next step with you.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href="/contact"
                  className="group inline-flex min-h-11 items-center gap-2 rounded-full bg-foam px-5 text-sm font-semibold text-pine hover:bg-white"
                >
                  Contact the practice
                  <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
                </Link>
                <Link
                  href="/about"
                  className="inline-flex min-h-11 items-center rounded-full border border-white/40 bg-white/10 px-5 text-sm font-semibold text-paper hover:bg-white/15"
                >
                  About the clinic
                </Link>
              </div>
              <p className="mt-6 max-w-md text-sm leading-relaxed text-paper">
                New patients are welcome. Request a call from the contact page. Do not include
                symptoms or insurance numbers.
              </p>
            </div>
            <p className="relative justify-self-start rounded-full border border-white/30 bg-pine/40 px-3 py-1.5 text-xs font-medium tracking-wide text-paper lg:justify-self-end">
              {practice.specialty}
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-10 md:px-8 md:py-14" aria-labelledby="assurance-heading">
        <h2 id="assurance-heading" className="sr-only">
          How the practice works
        </h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {assurances.map((item, index) => (
            <Reveal key={item.label} delay={index * 0.06}>
              <article className="clinic-card h-full rounded-2xl border border-line bg-card p-5 card-shadow">
                <p className="kicker text-oxide-deep">0{index + 1}</p>
                <h3 className="mt-3 font-display text-lg font-semibold tracking-tight">{item.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20" aria-labelledby="pathways-heading">
        <Reveal>
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="kicker text-oxide-deep">Care</p>
              <h2 id="pathways-heading" className="mt-2 font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Where people start
              </h2>
            </div>
            <p className="max-w-md leading-relaxed text-muted">
              Neck pain, low back pain, and pain that remains after surgery are the problems people
              most often bring to a first visit.
            </p>
          </div>
        </Reveal>
        <CareIndex />
      </section>

      <section className="bg-mist" aria-labelledby="physician-heading">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-16 md:grid-cols-[16rem_1fr] md:px-8 md:py-20">
          <Reveal>
            <PhotoPlaceholder className="min-h-80" />
          </Reveal>
          <Reveal delay={0.08}>
            <p className="kicker text-oxide-deep">Physician</p>
            <h2
              id="physician-heading"
              className="mt-3 font-display text-4xl font-semibold tracking-tight text-ink md:text-5xl"
            >
              {practice.physicianName}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Dr. Francois trained in orthopedic surgery at the Mayo Clinic and in spine surgery at
              Harvard. He treats disc disease, nerve compression, and spinal deformity, and he starts
              with the care that does not require an operation when that care can solve the problem.
            </p>
            <Link
              href={practice.physicianPath}
              className="group mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-oxide-deep"
            >
              Read the physician profile
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
            </Link>
          </Reveal>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20" aria-labelledby="journey-heading">
        <h2 id="journey-heading" className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
          A visit, in order
        </h2>
        <ol className="relative mt-10 grid gap-4 md:grid-cols-4">
          {journey.map((step, index) => (
            <li
              key={step.label}
              className="clinic-card rise-in h-full rounded-2xl border border-line bg-card p-5 card-shadow"
              style={{ animationDelay: `${index * 0.07}s` }}
            >
              <span className="inline-flex size-11 items-center justify-center rounded-full bg-mint text-sm font-semibold text-oxide-deep">
                0{index + 1}
              </span>
              <h3 className="mt-4 font-display text-xl font-semibold tracking-tight">{step.label}</h3>
              <p className="mt-2 text-sm leading-relaxed text-muted">{step.body}</p>
            </li>
          ))}
        </ol>
      </section>

      <section className="px-4 pb-16 md:px-8 md:pb-20">
        <Reveal>
          <div className="mx-auto flex max-w-6xl flex-col gap-6 rounded-[1.75rem] bg-pine px-6 py-12 text-paper md:flex-row md:items-end md:justify-between md:px-12 md:py-14">
            <div>
              <h2 className="font-display text-3xl font-semibold tracking-tight md:text-4xl">
                Ready when you are.
              </h2>
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-paper">
                Request a call about a visit. Leave symptoms, images, and insurance numbers off the
                form. This website is not an emergency department.
              </p>
            </div>
            <Link
              href="/contact"
              className="group inline-flex min-h-11 shrink-0 items-center gap-2 rounded-full bg-foam px-5 text-sm font-semibold text-pine hover:bg-white"
            >
              Contact the practice
              <ArrowRight className="size-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
