"use client";

import { motion } from "motion/react";
import Link from "next/link";
import { BrandMark } from "@/components/site/brand";
import { practice, publicNav } from "@/lib/site";

const cards = [
  {
    title: "Visit",
    links: publicNav.map((item) => ({ text: item.label, href: item.href })),
  },
  {
    title: "Practice",
    links: [
      { text: practice.physicianName, href: practice.physicianPath },
      { text: "About", href: "/about" },
      { text: "Privacy", href: "/privacy" },
      { text: "Terms", href: "/terms" },
      { text: "Medical disclaimer", href: "/medical-disclaimer" },
    ],
  },
  {
    title: "Reach",
    links: [
      { text: practice.phone, href: practice.phoneHref },
      { text: practice.email, href: `mailto:${practice.email}` },
      { text: "Contact", href: "/contact" },
      { text: "Patient login", href: "/portal/login" },
    ],
  },
];

export default function Footer1() {
  return (
    <footer className="relative w-full overflow-hidden bg-white px-4 py-12 sm:px-6 sm:py-16 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <motion.div initial={{ opacity: 0 }} whileInView={{ opacity: 1 }} viewport={{ once: true, margin: "-80px" }} className="space-y-8">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-[1.2fr_1fr_1fr_1fr]">
            <div className="mb-8 flex flex-col justify-between gap-6 lg:mb-0 lg:pr-8">
              <div className="flex items-center gap-3">
                <BrandMark className="size-10" />
                <span className="text-lg font-medium text-neutral-900">{practice.name}</span>
              </div>
              <p className="max-w-sm text-sm leading-relaxed text-neutral-600">
                Orthopedic spine surgery with {practice.physicianName}. Fellowship-trained at Harvard after an orthopedic residency at the Mayo Clinic.
              </p>
              <address className="text-sm not-italic leading-relaxed text-neutral-600">
                <span className="block">{practice.addressLine}</span>
                <a className="mt-1 inline-flex min-h-11 items-center hover:text-neutral-900" href={practice.phoneHref}>
                  {practice.phone}
                </a>
              </address>
            </div>

            {cards.map((card, index) => (
              <motion.div
                key={card.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.4, delay: index * 0.05 }}
                className={`min-h-64 border border-neutral-300 p-6 sm:p-8 ${index > 0 ? "lg:-ml-px" : ""} ${index > 0 ? "-mt-px md:mt-0" : ""}`}
              >
                <h2 className="mb-5 text-sm font-medium text-neutral-900">{card.title}</h2>
                <ul className="space-y-1">
                  {card.links.map((link) => (
                    <li key={link.text}>
                      {link.href.startsWith("http") || link.href.startsWith("tel:") || link.href.startsWith("mailto:") ? (
                        <a href={link.href} className="inline-flex min-h-11 items-center text-sm text-neutral-600 hover:text-neutral-900">
                          {link.text}
                        </a>
                      ) : (
                        <Link href={link.href} className="inline-flex min-h-11 items-center text-sm text-neutral-600 hover:text-neutral-900">
                          {link.text}
                        </Link>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>

          <p aria-hidden="true" className="overflow-hidden py-4 font-display text-[clamp(2.4rem,8vw,5.5rem)] leading-none tracking-[-0.03em] text-neutral-200">
            {practice.name}
          </p>
        </motion.div>
      </div>
    </footer>
  );
}
