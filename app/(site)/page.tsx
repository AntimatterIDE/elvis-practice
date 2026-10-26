import type { Metadata } from "next";
import Link from "next/link";
import { CareIndex } from "@/components/site/care-index";
import { HomeHero } from "@/components/site/home-hero";
import { HomeJourney } from "@/components/site/home-journey";
import { IconArrow } from "@/components/site/icons";
import { PhotoPlaceholder } from "@/components/site/photo-placeholder";
import { Reveal } from "@/components/site/reveal";
import { publicPageMetadata } from "@/lib/share-metadata";
import { practice, practiceName } from "@/lib/site";

export const metadata: Metadata = publicPageMetadata({
  title: { absolute: practiceName.full },
  description: practice.description,
  canonical: "/",
});

const assurances = [
  { label: "Physician-led", body: "Elvis Francois, MD sees the problem with you, not through a script." },
  { label: "Fellowship-trained", body: "Spine fellowship at Harvard, after orthopedic residency at the Mayo Clinic." },
  { label: "Plain language", body: "Findings and options are explained so you can actually use them." },
  { label: "Shared decisions", body: "Surgery is one path. Nonoperative care is part of the same conversation." },
];

export default function HomePage() {
  return (
    <>
      <HomeHero />

      <section className="mx-auto max-w-6xl px-5 py-14 md:px-8 md:py-20" aria-labelledby="assurance-heading">
        <div className="max-w-2xl">
          <p className="kicker text-oxide-deep">Practice</p>
          <h2 id="assurance-heading" className="mt-3 font-display text-3xl font-medium tracking-tight md:text-5xl">
            How the practice works
          </h2>
        </div>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {assurances.map((item, index) => (
            <Reveal key={item.label} delay={index * 0.06}>
              <article className="h-full rounded-3xl border border-line bg-card p-6 card-shadow">
                <p className="font-display text-4xl font-medium text-oxide-deep">0{index + 1}</p>
                <h3 className="mt-4 font-display text-xl font-medium leading-tight">{item.label}</h3>
                <p className="mt-2 text-sm leading-relaxed text-muted">{item.body}</p>
              </article>
            </Reveal>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-5 py-4 md:px-8 md:py-8" aria-labelledby="pathways-heading">
        <Reveal>
          <div className="mb-8 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <p className="kicker text-oxide-deep">Care</p>
              <h2 id="pathways-heading" className="mt-2 font-display text-3xl font-medium tracking-tight md:text-5xl">
                Where people start
              </h2>
            </div>
            <p className="max-w-md leading-relaxed text-muted">
              Neck pain, low back pain, and pain that remains after surgery are the problems people most often bring
              to a first visit.
            </p>
          </div>
        </Reveal>
        <CareIndex />
      </section>

      <section className="px-4 py-14 md:px-8 md:py-20" aria-labelledby="physician-heading">
        <div className="mx-auto grid max-w-6xl items-center gap-8 rounded-[1.75rem] border border-line bg-card p-6 card-shadow md:grid-cols-[16rem_1fr] md:p-10">
          <Reveal>
            <PhotoPlaceholder />
          </Reveal>
          <Reveal delay={0.08}>
            <p className="kicker text-oxide-deep">Physician</p>
            <h2 id="physician-heading" className="mt-3 font-display text-4xl font-medium tracking-tight md:text-5xl">
              {practice.physicianName}
            </h2>
            <p className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
              Dr. Francois trained in orthopedic surgery at the Mayo Clinic and in spine surgery at Harvard. He treats
              disc disease, nerve compression, and spinal deformity, and he starts with the care that does not require
              an operation when that care can solve the problem.
            </p>
            <Link
              href={practice.physicianPath}
              className="group mt-6 inline-flex min-h-11 items-center gap-2 font-semibold text-oxide-deep"
            >
              Read the physician profile
              <IconArrow className="size-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
            </Link>
          </Reveal>
        </div>
      </section>

      <HomeJourney />

      <section className="px-4 pb-16 md:px-8 md:pb-20">
        <Reveal>
          <div className="mx-auto flex max-w-6xl flex-col gap-8 rounded-[1.75rem] bg-pine px-6 py-12 text-paper md:flex-row md:items-end md:justify-between md:px-12 md:py-16">
            <div>
              <p className="kicker text-foam">New patients</p>
              <h2 className="mt-3 font-display text-4xl font-medium tracking-tight md:text-5xl">Ready when you are.</h2>
              <p className="mt-4 max-w-lg text-lg leading-relaxed text-paper">
                Request a call about a visit. The office is at {practice.addressLine}. Leave insurance numbers
                and dates of birth off the form.
              </p>
            </div>
            <Link
              href="/contact"
              className="group inline-flex h-12 shrink-0 items-center justify-center gap-2 rounded-full bg-foam px-6 text-sm font-semibold text-pine hover:bg-white"
            >
              Contact the practice
              <IconArrow className="size-4 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none" />
            </Link>
          </div>
        </Reveal>
      </section>
    </>
  );
}
