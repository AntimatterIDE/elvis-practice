import Link from "next/link";
import { MobileNav } from "@/components/site/mobile-nav";
import { practice, publicNav } from "@/lib/site";

export function Header() {
  return (
    <header className="border-b border-line">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-5 py-4 md:px-8">
        <Link href="/" className="whitespace-nowrap font-display text-xl leading-none text-ink lg:text-2xl">
          {practice.name}
        </Link>
        <nav aria-label="Primary" className="hidden items-center gap-5 lg:flex">
          {publicNav.map((item) => (
            <a key={item.href} href={item.href} className="whitespace-nowrap text-sm text-ink hover:text-oxide">
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <a
            href="/contact"
            className="hidden bg-oxide px-4 py-2 text-sm text-paper hover:bg-oxide-deep lg:inline-flex"
          >
            Contact
          </a>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
