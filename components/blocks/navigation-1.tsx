"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { Menu, X } from "lucide-react";
import Link from "next/link";
import { BrandLogo } from "@/components/site/brand";
import { SiteLink } from "@/components/site/site-link";
import { practice, publicNav } from "@/lib/site";

const itemClass =
  "inline-flex min-h-11 items-center rounded-[var(--rb-r-md,8px)] px-3 text-sm font-medium text-neutral-700 hover:bg-neutral-100 hover:text-neutral-900";

export default function Navigation1() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  return (
    <div className="site-bar sticky top-0 z-40 border-b border-neutral-200 bg-white/95 backdrop-blur-md">
      <nav className="relative w-full px-4 py-3 sm:px-6 lg:px-8" aria-label="Primary">
        <div className="mx-auto w-full max-w-6xl">
          <motion.div
            className="flex items-center justify-between gap-3"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
          >
            <Link href="/" className="inline-flex min-h-11 shrink-0 items-center">
              <BrandLogo priority className="h-9 w-auto" />
            </Link>

            <div className="hidden min-w-0 items-center justify-center gap-0.5 lg:flex">
              {publicNav.map((item) => (
                <SiteLink key={item.href} href={item.href} className={itemClass} activeClassName="bg-neutral-100 text-neutral-900">
                  {item.label}
                </SiteLink>
              ))}
            </div>

            <div className="hidden items-center gap-2 lg:flex">
              <SiteLink
                href="/portal/login"
                className="inline-flex min-h-11 items-center rounded-[var(--rb-r-lg,10px)] border border-neutral-200 px-4 text-sm font-medium text-neutral-800 hover:bg-neutral-50"
                activeClassName="bg-neutral-100"
              >
                Patient login
              </SiteLink>
              <Link
                href="/contact"
                className="inline-flex min-h-11 items-center rounded-[var(--rb-r-lg,10px)] bg-[var(--rb-accent,#0a6e66)] px-4 text-sm font-medium text-[var(--rb-accent-fg,#f3f7fb)] hover:bg-oxide-ink"
              >
                Contact
              </Link>
            </div>

            <button
              type="button"
              onClick={() => setMobileMenuOpen((open) => !open)}
              className="relative z-50 inline-flex h-11 w-11 items-center justify-center rounded-[var(--rb-r-md,8px)] bg-neutral-900 text-white lg:hidden"
              aria-label={mobileMenuOpen ? "Close menu" : "Open menu"}
              aria-expanded={mobileMenuOpen}
            >
              {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </motion.div>
        </div>

        <AnimatePresence>
          {mobileMenuOpen ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="fixed inset-0 z-40 bg-white lg:hidden"
            >
              <div className="h-[68px]" />
              <div className="flex h-[calc(100%-68px)] flex-col px-6 pb-28">
                <div className="flex flex-1 flex-col gap-1 overflow-y-auto py-6">
                  <p className="px-2 pb-2 text-sm text-neutral-500">{practice.name}</p>
                  {publicNav.map((item) => (
                    <SiteLink
                      key={item.href}
                      href={item.href}
                      className="rounded-[var(--rb-r-md,8px)] px-3 py-3 text-2xl font-medium text-neutral-900"
                      activeClassName="bg-neutral-100"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.label}
                    </SiteLink>
                  ))}
                </div>
                <div className="grid gap-3 border-t border-neutral-200 py-5">
                  <Link
                    href="/portal/login"
                    className="inline-flex min-h-12 items-center justify-center rounded-[var(--rb-r-lg,10px)] border border-neutral-300 text-sm font-medium"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Patient login
                  </Link>
                  <Link
                    href="/contact"
                    className="inline-flex min-h-12 items-center justify-center rounded-[var(--rb-r-lg,10px)] bg-[var(--rb-accent,#0a6e66)] text-sm font-medium text-[var(--rb-accent-fg,#f3f7fb)]"
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    Contact the practice
                  </Link>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>
      </nav>
    </div>
  );
}
