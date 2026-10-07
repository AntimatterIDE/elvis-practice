import { emergencyNote, practice, publicNav } from "@/lib/site";
import { BrandMark } from "@/components/site/brand";
import { SiteLink } from "@/components/site/site-link";

const linkClass = "inline-flex min-h-11 items-center text-paper/90 hover:text-gold-bright";

export function Footer() {
  return (
    <footer className="mt-auto bg-navy text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_0.8fr_0.8fr] md:px-8">
        <div>
          <div className="flex items-center gap-4">
            <BrandMark tone="reverse" className="size-16" />
            <p className="flex flex-col gap-0.5">
              <span className="font-display text-xl font-bold leading-[1.15] text-paper">{practice.name}</span>
              <span className="font-display text-xl font-bold leading-[1.15] text-gold-bright">{practice.specialty}</span>
            </p>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/90">
            {practice.specialty} with {practice.physicianName}. Fellowship-trained at Harvard
            after an orthopedic residency at the Mayo Clinic.
          </p>
        </div>
        <nav aria-label="Footer" className="grid content-start gap-1 text-sm">
          <p className="kicker text-gold-bright">Visit</p>
          {publicNav.map((item) => (
            <SiteLink key={item.href} href={item.href} className={linkClass} activeClassName="text-gold-bright">
              {item.label}
            </SiteLink>
          ))}
        </nav>
        <nav aria-label="Practice information" className="grid content-start gap-1 text-sm">
          <p className="kicker text-gold-bright">Practice</p>
          <SiteLink href={practice.physicianPath} className={linkClass} activeClassName="text-gold-bright">
            {practice.physicianName}
          </SiteLink>
          <SiteLink href="/about" className={linkClass} activeClassName="text-gold-bright">
            About
          </SiteLink>
          <SiteLink href="/privacy" className={linkClass} activeClassName="text-gold-bright">
            Privacy
          </SiteLink>
          <SiteLink href="/terms" className={linkClass} activeClassName="text-gold-bright">
            Terms
          </SiteLink>
          <SiteLink href="/medical-disclaimer" className={linkClass} activeClassName="text-gold-bright">
            Medical disclaimer
          </SiteLink>
          <SiteLink href="/portal/login" className={linkClass} activeClassName="text-gold-bright">
            Patient login
          </SiteLink>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-5 py-5 text-sm leading-relaxed text-paper/90 md:px-8">
          {emergencyNote}
        </p>
      </div>
    </footer>
  );
}
