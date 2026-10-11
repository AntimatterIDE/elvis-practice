"use client";

import Link from "next/link";
import { motion, useReducedMotion, type Variants } from "motion/react";
import { HeroArtwork } from "@/components/site/brand";
import { IconArrow } from "@/components/site/icons";
import { practice } from "@/lib/site";

const sequence: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.04 } },
};

const rise: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] } },
};

export function HomeHero() {
  const reduce = useReducedMotion();

  return (
    <section className="px-4 pb-2 pt-8 md:px-8 md:pt-16">
      <motion.div
        variants={sequence}
        initial={reduce ? false : "hidden"}
        animate="show"
        className="mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-[minmax(0,1fr)_minmax(18rem,24rem)] lg:gap-14"
      >
        <div>
          <motion.p variants={rise} className="kicker text-oxide-deep">
            {practice.name}
          </motion.p>
          <motion.div variants={rise} className="mt-4 lg:hidden">
            <HeroArtwork className="mx-auto h-28 w-36" />
          </motion.div>
          <motion.h1
            variants={rise}
            className="mt-4 max-w-3xl font-display text-[clamp(2.6rem,7vw,5.4rem)] font-medium leading-[0.98] tracking-[-0.035em]"
          >
            Spine care, <em className="text-oxide-deep">carefully aligned.</em>
          </motion.h1>
          <motion.p variants={rise} className="mt-5 max-w-xl text-lg leading-relaxed text-muted">
            {practice.physicianName} is an orthopedic spine surgeon. The work of this practice is to understand the
            problem, explain it clearly, and decide the next step with you.
          </motion.p>
          <motion.div variants={rise} className="mt-8 flex flex-col gap-3 sm:flex-row sm:flex-wrap">
            <Link
              href="/contact"
              className="group inline-flex h-12 items-center justify-center gap-2 rounded-full bg-oxide-deep px-6 text-sm font-semibold text-paper transition-colors duration-200 hover:bg-oxide-ink"
            >
              Contact the practice
              <IconArrow className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
            </Link>
            <Link
              href="/about"
              className="inline-flex h-12 items-center justify-center rounded-full border border-line bg-card px-6 text-sm font-semibold text-ink transition-colors duration-200 hover:border-oxide/40"
            >
              About the clinic
            </Link>
          </motion.div>
          <motion.p variants={rise} className="mt-5 max-w-md text-sm leading-relaxed text-muted">
            New patients are welcome. Request a call from the contact page. Do not include symptoms or insurance
            numbers.
          </motion.p>
        </div>
        <motion.div
          variants={rise}
          className="hidden rounded-[1.75rem] border border-line bg-mist px-6 py-8 shadow-[0_24px_50px_-36px_rgb(7_30_54_/_0.65)] lg:block"
        >
          <HeroArtwork className="h-56 sm:h-64 lg:h-80" />
          <p className="kicker mt-2 text-center text-ink">{practice.specialty}</p>
        </motion.div>
      </motion.div>
    </section>
  );
}
