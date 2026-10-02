"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export function StickyContact() {
  const pathname = usePathname();
  if (pathname === "/contact") return null;

  return (
    <>
      <div className="h-20 shrink-0 md:hidden" aria-hidden />
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-card/95 px-4 py-3 backdrop-blur md:hidden">
        <Link
          href="/contact"
          className="flex h-11 items-center justify-center rounded-full bg-oxide-deep text-sm font-semibold text-paper hover:bg-oxide-ink"
        >
          Contact the practice
        </Link>
      </div>
    </>
  );
}
