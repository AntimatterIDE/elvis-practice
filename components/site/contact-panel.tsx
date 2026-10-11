"use client";

import { ContactForm } from "@/components/site/contact-form";
import { BrandMark } from "@/components/site/brand";
import { practice } from "@/lib/site";
import { motion } from "motion/react";
import Link from "next/link";

const details = [
  { label: "Office", value: practice.addressLine, href: undefined },
  { label: "Phone", value: practice.phone, href: practice.phoneHref },
  { label: "Email", value: practice.email, href: `mailto:${practice.email}` },
] as const;

export function ContactPanel() {
  return (
    <section className="w-full bg-paper px-4 py-10 sm:px-6 sm:py-16 lg:px-8 lg:py-24">
      <div className="mx-auto grid max-w-6xl gap-12 lg:grid-cols-2 lg:gap-16">
        <div className="flex flex-col justify-between gap-10">
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="max-w-md font-display text-3xl font-semibold leading-tight text-ink sm:text-4xl"
          >
            Request a consultation.
            <span className="mt-4 block text-base font-normal leading-relaxed text-muted sm:text-lg">
              New patients are welcome. Leave a name and the best way to reach you. Do not include symptoms or
              insurance numbers.
            </span>
          </motion.h2>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.08 }}
            className="space-y-6"
          >
            <BrandMark className="size-12" />
            <div>
              <p className="font-display text-xl font-medium text-ink">{practice.name}</p>
              <p className="mt-1 text-sm text-muted">{practice.physicianName}</p>
            </div>
            <ul className="space-y-3 text-sm leading-relaxed text-muted">
              {details.map((item) => (
                <li key={item.label}>
                  <span className="kicker text-oxide-deep">{item.label}</span>
                  {item.href ? (
                    <a className="mt-1 block text-base text-ink underline decoration-oxide/40 underline-offset-4" href={item.href}>
                      {item.value}
                    </a>
                  ) : (
                    <p className="mt-1 text-base text-ink">{item.value}</p>
                  )}
                </li>
              ))}
            </ul>
            <Link href="/privacy" className="inline-flex text-sm font-semibold text-oxide-deep underline underline-offset-4">
              Privacy note
            </Link>
          </motion.div>
        </div>

        <div>
          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45 }}
            className="mb-8 font-display text-5xl font-semibold leading-none text-ink sm:text-6xl lg:mb-12 lg:text-7xl"
          >
            Contact us
          </motion.h1>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.45, delay: 0.12 }}
          >
            <ContactForm />
          </motion.div>
        </div>
      </div>
    </section>
  );
}
