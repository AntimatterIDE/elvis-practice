"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const items = [
  { href: "/portal", label: "Home" },
  { href: "/portal/profile", label: "Profile" },
  { href: "/portal/messages", label: "Messages" },
  { href: "/portal/documents", label: "Documents" },
  { href: "/portal/updates", label: "Updates" },
];

export function PortalNav({ unread = 0 }: { unread?: number }) {
  const path = usePathname();
  return (
    <nav className="mx-auto flex max-w-3xl flex-wrap gap-2 px-5 pt-6" aria-label="Portal">
      {items.map((item) => {
        const current = item.href === "/portal" ? path === "/portal" : path.startsWith(item.href);
        const badge = item.href === "/portal/messages" && unread > 0 && !path.startsWith("/portal/messages") ? unread : 0;
        return (
          <Link
            key={item.href}
            href={item.href}
            className={
              current
                ? "inline-flex min-h-11 items-center rounded-full bg-pine px-4 text-sm font-medium text-paper"
                : "inline-flex min-h-11 items-center rounded-full border border-line bg-card px-4 text-sm font-medium text-ink"
            }
            aria-current={current ? "page" : undefined}
          >
            {item.label}
            {badge ? <span className="ml-2 rounded-full bg-paper px-2 text-xs text-pine">{badge}</span> : null}
          </Link>
        );
      })}
    </nav>
  );
}
