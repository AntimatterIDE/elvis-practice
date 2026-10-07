import Link from "next/link";
import { MobileNav } from "@/components/site/mobile-nav";
import { SiteLink } from "@/components/site/site-link";
import { practice, publicNav } from "@/lib/site";

export function Header() {
  return (
    <div className="site-bar sticky top-0 z-40 bg-card/90 backdrop-blur-md">
      <div className="bg-navy text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2 text-xs md:px-8 md:text-sm">
          <p className="truncate">
            New patients are welcome. Orthopedic spine surgery with {practice.physicianName}.
          </p>
          <span className="flex shrink-0 gap-4">
            <SiteLink href="/portal/login" className="inline-flex min-h-11 items-center font-semibold text-gold-bright hover:underline">
              Patient login
            </SiteLink>
            <SiteLink href="/contact" className="inline-flex min-h-11 items-center font-semibold text-gold-bright hover:underline">
              Contact
            </SiteLink>
          </span>
        </div>
      </div>
      <header>
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5 md:px-8">
          <Link href="/" className="flex flex-col min-h-11 min-w-0 items-start">
            <span className="font-display text-xl font-bold leading-[1.1] tracking-tight text-navy md:text-2xl">The Alignment Clinic</span>
            <span className="font-display text-xl font-bold leading-[1.1] tracking-tight text-gold md:text-2xl">orthopedic spine surgery</span>
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-6 lg:flex">
            {publicNav.map((item) => (
              <SiteLink
                key={item.href}
                href={item.href}
                className="nav-link inline-flex min-h-11 items-center whitespace-nowrap text-sm font-medium text-ink/80 hover:text-ink"
              >
                {item.label}
              </SiteLink>
            ))}
          </nav>
          <div className="flex items-center gap-3">
            <Link
              href="/contact"
              className="hidden min-h-11 items-center rounded-full bg-gold-deep px-4 text-sm font-semibold text-paper card-shadow hover:bg-gold-deep lg:inline-flex"
            >
              Contact the practice
            </Link>
            <MobileNav />
          </div>
        </div>
      </header>
    </div>
  );
}
