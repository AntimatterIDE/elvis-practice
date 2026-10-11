"use client";

import { SiteVault } from "@/components/site/hexagonal-vault";
import { IconArrow } from "@/components/site/icons";
import { faqs } from "@/lib/content/faqs";
import { practice } from "@/lib/site";
import { Plus } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion, type Variants } from "motion/react";
import Link from "next/link";
import { useState } from "react";

const columns = [faqs.slice(0, 3), faqs.slice(3)];

const facts = [
  { value: "Welcome", label: "New patients" },
  { value: practice.phone, label: "Office phone" },
];

export function QuestionsBoard() {
  const reduce = useReducedMotion();
  const [openIndex, setOpenIndex] = useState(0);

  const container: Variants = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.05 } },
  };
  const item: Variants = {
    hidden: { opacity: 0, y: reduce ? 0 : 14 },
    show: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] },
    },
  };

  return (
    <SiteVault>
    <section className="w-full px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-20">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,0.82fr)_minmax(0,1.18fr)] lg:gap-10">
          <motion.aside
            initial={{ opacity: 0, y: reduce ? 0 : 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-80px" }}
            transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
            className="flex flex-col justify-between gap-10 rounded-3xl bg-pine p-6 text-paper sm:p-8 lg:sticky lg:top-28 lg:self-start lg:p-10"
          >
            <div>
              <p className="kicker text-foam">Questions</p>
              <h1 className="mt-4 font-display text-3xl font-semibold leading-[1.08] sm:text-4xl lg:text-5xl">
                Questions that need a person.
              </h1>
              <p className="mt-5 max-w-md text-base leading-relaxed text-paper/80">
                These answers cover appointments, the office, and what this website will not collect. They are not a
                diagnosis. For a visit, send a name and a way to reach you.
              </p>
            </div>
            <div>
              <div className="grid grid-cols-2 divide-x divide-white/15 border-y border-white/15">
                {facts.map((fact, index) => (
                  <div key={fact.label} className={index === 0 ? "py-5 pr-4" : "py-5 pl-4"}>
                    <p className="font-display text-xl font-semibold leading-tight text-paper sm:text-2xl">{fact.value}</p>
                    <p className="mt-1 text-sm text-paper/70">{fact.label}</p>
                  </div>
                ))}
              </div>
              <Link
                href="/contact"
                className="group mt-8 inline-flex h-12 w-full items-center justify-between rounded-full bg-foam px-6 text-sm font-semibold text-pine hover:bg-white sm:w-auto sm:min-w-56"
              >
                Contact the practice
                <IconArrow className="size-4 transition-transform duration-200 group-hover:translate-x-0.5 motion-reduce:transition-none" />
              </Link>
              <p className="mt-4 text-sm leading-relaxed text-paper/70">
                {practice.addressLine}. Leave symptoms and insurance numbers off the form.
              </p>
            </div>
          </motion.aside>

          <motion.div
            variants={container}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="grid grid-cols-1 items-start gap-3 sm:grid-cols-2"
          >
            {columns.map((column, columnIndex) => (
              <div key={columnIndex} className="flex flex-col gap-3">
                {column.map((faq, indexInColumn) => {
                  const index = columnIndex === 0 ? indexInColumn : 3 + indexInColumn;
                  const isOpen = openIndex === index;
                  return (
                    <motion.div
                      key={faq.question}
                      variants={item}
                      className={`rounded-2xl border transition-colors duration-200 ${
                        isOpen ? "border-oxide/40 bg-card" : "border-line bg-card hover:border-oxide/30"
                      }`}
                    >
                      <button
                        type="button"
                        aria-expanded={isOpen}
                        aria-controls={`question-answer-${index}`}
                        onClick={() => setOpenIndex(isOpen ? -1 : index)}
                        className="flex w-full items-start justify-between gap-4 rounded-2xl p-5 text-left"
                      >
                        <span className="flex-1 font-display text-lg font-medium leading-snug text-ink">{faq.question}</span>
                        <motion.span
                          animate={{ rotate: isOpen ? 45 : 0 }}
                          transition={{ duration: reduce ? 0 : 0.35, ease: [0.22, 1, 0.36, 1] }}
                          className="mt-1 shrink-0 text-oxide-deep"
                        >
                          <Plus className="size-4" aria-hidden="true" />
                        </motion.span>
                      </button>
                      <AnimatePresence initial={false}>
                        {isOpen ? (
                          <motion.div
                            id={`question-answer-${index}`}
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{
                              height: { duration: reduce ? 0 : 0.4, ease: [0.22, 1, 0.36, 1] },
                              opacity: { duration: reduce ? 0 : 0.3, ease: [0.22, 1, 0.36, 1] },
                            }}
                            className="overflow-hidden"
                          >
                            <p className="px-5 pb-5 text-sm leading-relaxed text-muted">{faq.answer}</p>
                          </motion.div>
                        ) : null}
                      </AnimatePresence>
                    </motion.div>
                  );
                })}
              </div>
            ))}
          </motion.div>
        </div>
      </div>
    </section>
    </SiteVault>
  );
}
