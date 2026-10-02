import { Mark } from "@/components/site/mark";
import { practice } from "@/lib/site";

export function ClinicFrame({ kicker, children }: { kicker: string; children: React.ReactNode }) {
  return (
    <div className="flex min-h-full flex-col">
      <a className="skip-link" href="#main">
        Skip to content
      </a>
      <header className="bg-pine text-paper">
        <div className="mx-auto flex max-w-3xl items-center gap-3 px-5 py-4">
          <Mark className="bg-white/10 text-foam shadow-none" />
          <div className="min-w-0">
            <p className="truncate font-display text-lg font-semibold leading-tight">{practice.name}</p>
            <p className="text-xs text-foam">{kicker}</p>
          </div>
        </div>
      </header>
      <main id="main" className="flex-1">
        {children}
      </main>
    </div>
  );
}
