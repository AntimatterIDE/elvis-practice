"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { IconArrow } from "@/components/site/icons";

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

const sequence: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.05 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.6, ease: [0.22, 1, 0.36, 1] } },
};

export function VisitPath() {
  const reduce = useReducedMotion();

  return (
    <section className="px-4 py-12 md:px-8 md:py-20">
      <div className="mx-auto grid max-w-6xl items-start gap-12 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:gap-20">
        <div className="lg:sticky lg:top-32">
          <p className="kicker text-oxide-deep">Visit</p>
          <h1 className="mt-3 font-display text-[clamp(2.4rem,5vw,4.25rem)] font-medium leading-[1.05] tracking-[-0.03em]">
            What to expect before the first appointment.
          </h1>
          <p className="mt-5 max-w-md text-lg leading-relaxed text-muted">
            A visit is a history, an examination, and a plan you can follow. These notes describe that visit. They are
            not personal instructions.
          </p>
          <Link
            href="/contact"
            className="group mt-8 inline-flex h-12 items-center gap-2 rounded-full bg-oxide-deep px-6 text-sm font-semibold text-paper transition-colors duration-200 hover:bg-oxide-ink"
          >
            Contact the practice
            <IconArrow className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-muted">
            Leave symptoms, images, and insurance numbers off the form.
          </p>
        </div>

        <motion.ol
          variants={sequence}
          initial={reduce ? false : "hidden"}
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          className="relative grid gap-8"
        >
          <span className="absolute bottom-6 left-6 top-6 w-px bg-line" aria-hidden="true" />
          {sections.map((section, index) => (
            <motion.li key={section.heading} variants={rise} className="relative flex gap-5">
              <span className="relative z-10 flex size-12 shrink-0 items-center justify-center rounded-full bg-oxide-deep text-sm font-semibold text-paper">
                {index + 1}
              </span>
              <div className="pt-2">
                <h2 className="font-display text-2xl font-medium leading-tight tracking-tight md:text-3xl">
                  {section.heading}
                </h2>
                <p className="mt-3 max-w-xl text-base leading-relaxed text-muted md:text-lg">{section.body}</p>
              </div>
            </motion.li>
          ))}
        </motion.ol>
      </div>
    </section>
  );
}
