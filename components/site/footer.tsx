import { emergencyNote, practice } from "@/lib/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t border-line">
      <div className="mx-auto grid max-w-6xl gap-10 px-5 py-12 md:grid-cols-[1.4fr_1fr] md:px-8">
        <div>
          <p className="font-display text-3xl">{practice.name}</p>
          <p className="mt-3 max-w-md text-muted">
            A spine practice led by {practice.physicianName}. Address, phone, and hours will be
            published when the practice confirms them.
          </p>
        </div>
        <nav aria-label="Footer" className="grid grid-cols-2 gap-3 text-sm">
          <a href="/about">About</a>
          <a href={practice.physicianPath}>{practice.physicianName}</a>
          <a href="/visit">Your visit</a>
          <a href="/contact">Contact</a>
          <a href="/questions">Questions</a>
          <a href="/privacy">Privacy</a>
          <a href="/terms">Terms</a>
          <a href="/medical-disclaimer">Medical disclaimer</a>
        </nav>
      </div>
      <div className="border-t border-line bg-pine text-paper">
        <p className="mx-auto max-w-6xl px-5 py-5 text-sm leading-relaxed md:px-8">{emergencyNote}</p>
      </div>
    </footer>
  );
}
