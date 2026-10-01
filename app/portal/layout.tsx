import type { Metadata } from "next";
import Link from "next/link";
import { practice } from "@/lib/site";

export const metadata: Metadata = {
  title: "Patient portal",
  robots: { index: false, follow: false },
};

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-full bg-paper">
      <header className="border-b border-line">
        <div className="mx-auto flex max-w-3xl items-center justify-between px-5 py-4">
          <Link href="/portal" className="font-display text-xl">
            {practice.name}
          </Link>
          <p className="text-xs uppercase tracking-[0.14em] text-muted">Patient portal</p>
        </div>
      </header>
      {children}
    </div>
  );
}
