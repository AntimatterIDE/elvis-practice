"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Mark } from "@/components/site/mark";
import { MobileNav } from "@/components/site/mobile-nav";
import { practice, publicNav } from "@/lib/site";
import { cn } from "@/lib/utils";

export function Header() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 8);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className={cn(
        "sticky top-0 z-40 border-b border-transparent bg-card/85 backdrop-blur-md transition-shadow",
        scrolled && "border-line shadow-[0_10px_30px_-24px_rgb(7_30_54_/_0.7)]",
      )}
    >
      <div className="bg-pine text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2 text-xs md:px-8 md:text-sm">
          <p className="truncate">
            New patients are welcome. Phone, address, and hours publish when the practice confirms them.
          </p>
          <span className="flex shrink-0 gap-4">
            <a href="/portal/login" className="font-semibold text-foam hover:underline">
              Patient login
            </a>
            <a href="/contact" className="font-semibold text-foam hover:underline">
              Contact
            </a>
          </span>
        </div>
      </div>
      <header>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5 md:px-8">
          <Link href="/" className="flex min-w-0 items-center gap-3 text-ink">
            <Mark />
            <span className="min-w-0">
              <span className="block truncate font-display text-base font-semibold leading-tight tracking-tight lg:text-lg">
                {practice.name}
              </span>
              <span className="hidden text-xs font-medium text-muted sm:block">Spine practice</span>
            </span>
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
            {publicNav.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="nav-link whitespace-nowrap text-sm font-medium text-ink/80 hover:text-ink"
              >
                {item.label}
              </a>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <a
              href="/contact"
              className="group hidden items-center gap-2 rounded-full bg-oxide px-4 py-2.5 text-sm font-semibold text-paper shadow-[0_10px_24px_-16px_rgb(14_143_132_/_1)] transition hover:-translate-y-0.5 hover:bg-oxide-deep lg:inline-flex"
            >
              Contact the practice
            </a>
            <MobileNav />
          </div>
        </div>
      </header>
    </div>
  );
}
