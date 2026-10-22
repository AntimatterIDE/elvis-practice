import { practice, publicNav } from "@/lib/site";
import { BrandMark, PracticeName } from "@/components/site/brand";
import { PracticeZeroCredit } from "@/components/site/practice-zero";
import { SiteLink } from "@/components/site/site-link";

const linkClass = "inline-flex min-h-11 items-center text-paper/90 hover:text-foam";

export function Footer() {
  return (
    <footer className="mt-auto bg-pine text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_0.8fr_0.8fr] md:px-8">
        <div>
          <div className="flex items-center gap-4">
            <BrandMark tone="reverse" className="size-16" />
            <PracticeName
              tone="pine"
              goldClassName="font-display text-2xl font-medium leading-tight"
              blueClassName="mt-1 font-display text-3xl font-semibold leading-tight md:text-4xl"
            />
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/90">
            Orthopedic spine surgery with {practice.physicianName}. Fellowship-trained at Harvard after an orthopedic residency at the Mayo Clinic.
          </p>
          <address className="mt-4 max-w-sm text-sm not-italic leading-relaxed text-paper/90">
            <span className="block">{practice.addressLine}</span>
            <a className="mt-1 inline-flex min-h-11 items-center hover:text-foam" href={practice.phoneHref}>
              {practice.phone}
            </a>
            <a className="block hover:text-foam" href={`mailto:${practice.email}`}>
              {practice.email}
            </a>
          </address>
        </div>
        <nav aria-label="Footer" className="grid content-start gap-1 text-sm">
          <p className="kicker text-foam">Visit</p>
          {publicNav.map((item) => (
            <SiteLink key={item.href} href={item.href} className={linkClass} activeClassName="text-foam">
              {item.label}
            </SiteLink>
          ))}
        </nav>
        <nav aria-label="Practice information" className="grid content-start gap-1 text-sm">
          <p className="kicker text-foam">Practice</p>
          <SiteLink href={practice.physicianPath} className={linkClass} activeClassName="text-foam">
            {practice.physicianName}
          </SiteLink>
          <SiteLink href="/about" className={linkClass} activeClassName="text-foam">
            About
          </SiteLink>
          <SiteLink href="/privacy" className={linkClass} activeClassName="text-foam">
            Privacy
          </SiteLink>
          <SiteLink href="/terms" className={linkClass} activeClassName="text-foam">
            Terms
          </SiteLink>
          <SiteLink href="/medical-disclaimer" className={linkClass} activeClassName="text-foam">
            Medical disclaimer
          </SiteLink>
          <SiteLink href="/portal/login" className={linkClass} activeClassName="text-foam">
            Patient login
          </SiteLink>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <div className="mx-auto flex max-w-6xl justify-center px-5 py-6 md:px-8">
          <PracticeZeroCredit />
        </div>
      </div>
    </footer>
  );
}
