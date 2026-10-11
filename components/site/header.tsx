import Link from "next/link";
import { BrandLogo } from "@/components/site/brand";
import { MobileNav } from "@/components/site/mobile-nav";
import { SiteLink } from "@/components/site/site-link";
import { practice, publicNav } from "@/lib/site";

export function Header() {
  return (
    <div className="site-bar sticky top-0 z-40 bg-card/90 backdrop-blur-md">
      <div className="bg-pine text-paper">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-2 text-xs md:px-8 md:text-sm">
          <p className="min-w-0 truncate">
            New patients are welcome. Orthopedic spine surgery with {practice.physicianName}.
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
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-3.5 md:px-8">
          <Link href="/" className="hidden min-h-11 shrink-0 items-center lg:flex">
            <BrandLogo priority className="h-11 w-auto max-w-[15rem]" />
          </Link>
          <nav aria-label="Primary" className="hidden items-center gap-4 lg:flex xl:gap-6">
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
          <div className="ml-auto flex items-center gap-3">
            <Link href="/" aria-label="Home" className="inline-flex min-h-11 shrink-0 items-center">
              <BrandLogo alt="" className="h-8 w-auto max-w-[10rem] lg:h-9 lg:max-w-[8.5rem]" />
            </Link>
            <Link
              href="/contact"
              className="hidden min-h-11 items-center rounded-full bg-oxide-deep px-4 text-sm font-semibold text-paper card-shadow hover:bg-oxide-ink xl:inline-flex"
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
