import { emergencyNote, practice, publicNav } from "@/lib/site";
import { Mark } from "@/components/site/mark";

export function Footer() {
  return (
    <footer className="mt-auto bg-pine text-paper">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-14 md:grid-cols-[1.4fr_0.8fr_0.8fr] md:px-8">
        <div>
          <div className="flex items-center gap-3">
            <Mark className="bg-white/10 text-foam shadow-none" />
            <p className="font-display text-xl font-semibold tracking-tight">{practice.name}</p>
          </div>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-paper/75">
            Orthopedic spine surgery with {practice.physicianName}. Fellowship-trained at Harvard
            after an orthopedic residency at the Mayo Clinic.
          </p>
        </div>
        <nav aria-label="Footer" className="grid content-start gap-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foam">Visit</p>
          {publicNav.map((item) => (
            <a key={item.href} href={item.href} className="text-paper/85 hover:text-foam">
              {item.label}
            </a>
          ))}
        </nav>
        <nav aria-label="Practice information" className="grid content-start gap-3 text-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-foam">Practice</p>
          <a href={practice.physicianPath} className="text-paper/85 hover:text-foam">
            {practice.physicianName}
          </a>
          <a href="/about" className="text-paper/85 hover:text-foam">
            About
          </a>
          <a href="/privacy" className="text-paper/85 hover:text-foam">
            Privacy
          </a>
          <a href="/terms" className="text-paper/85 hover:text-foam">
            Terms
          </a>
          <a href="/medical-disclaimer" className="text-paper/85 hover:text-foam">
            Medical disclaimer
          </a>
          <a href="/portal/login" className="text-paper/85 hover:text-foam">
            Patient login
          </a>
        </nav>
      </div>
      <div className="border-t border-white/10">
        <p className="mx-auto max-w-6xl px-5 py-5 text-sm leading-relaxed text-paper/75 md:px-8">
          {emergencyNote}
        </p>
      </div>
    </footer>
  );
}
