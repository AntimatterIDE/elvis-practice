"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export function SiteLink({
  href,
  className,
  activeClassName,
  children,
  ...props
}: React.ComponentProps<typeof Link> & { activeClassName?: string }) {
  const pathname = usePathname();
  const path = typeof href === "string" ? href : (href.pathname ?? "");
  const active = path !== "/" && (pathname === path || pathname.startsWith(`${path}/`));

  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(className, active && activeClassName)}
      {...props}
    >
      {children}
    </Link>
  );
}
