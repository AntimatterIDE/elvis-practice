import Link from "next/link";
import { PracticeName } from "@/components/site/brand";
import { MobileNav } from "@/components/site/mobile-nav";
import { SiteLink } from "@/components/site/site-link";
import { practice, practiceName, publicNav } from "@/lib/site";

export function Header() {
  return (
    <div className="site-bar sticky top-0 z-40 bg-card/90 backdrop-blur-md">
      <div className="bg-pine text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2 text-xs md:px-8 md:text-sm">
          <p className="min-w-0 truncate">
            <span className="sm:hidden">New patients are welcome.</span>
            <span className="hidden sm:inline">
              New patients are welcome. {practiceName.blue} with {practice.physicianName}.
            </span>
          </p>
          <span className="flex shrink-0 gap-4">
            <SiteLink href="/portal/login" className="inline-flex min-h-11 items-center font-semibold text-foam hover:underline">
              Patient login
            </SiteLink>
            <SiteLink href="/contact" className="inline-flex min-h-11 items-center font-semibold text-foam hover:underline">
              Contact
            </SiteLink>
          </span>
        </div>
      </div>
      <header>
        <div className="mx-auto flex max-w-6xl items-center gap-3 px-5 pt-4 md:px-8">
          <MobileNav />
          <Link href="/" aria-label={practiceName.full} className="min-w-0 py-1">
            <PracticeName
              goldClassName="font-display text-xl font-medium leading-tight sm:text-2xl md:text-3xl"
              blueClassName="mt-1 font-display text-2xl font-semibold leading-tight sm:text-3xl md:text-5xl"
            />
          </Link>
        </div>
        <div className="mx-auto hidden max-w-6xl items-center justify-between gap-4 px-5 py-3 md:px-8 lg:flex">
          <nav aria-label="Primary" className="flex min-w-0 flex-1 items-center gap-x-5 xl:gap-x-7">
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
          <Link
            href="/contact"
            className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap rounded-full bg-oxide-deep px-4 text-sm font-semibold text-paper card-shadow hover:bg-oxide-ink"
          >
            Contact the practice
          </Link>
        </div>
      </header>
    </div>
  );
}
