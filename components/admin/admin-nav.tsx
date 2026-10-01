"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const siteLinks = [
  ["/admin", "Overview"],
  ["/admin/conditions", "Conditions"],
  ["/admin/treatments", "Treatments"],
  ["/admin/faqs", "Questions"],
  ["/admin/media", "Media"],
  ["/admin/settings", "Settings"],
  ["/admin/audit", "Audit"],
] as const;

const practiceLinks = [
  ["/admin/operations", "Today"],
  ["/admin/operations/patients", "Patients"],
  ["/admin/operations/scheduling", "Schedule"],
  ["/admin/operations/intake", "Intake"],
  ["/admin/operations/tasks", "Tasks"],
  ["/admin/operations/practice", "Practice"],
] as const;

const billingLinks = [
  ["/admin/operations/claims", "Claims"],
  ["/admin/operations/eligibility", "Eligibility"],
  ["/admin/operations/denials", "Denials"],
  ["/admin/operations/claims/drafts", "Drafts"],
  ["/admin/operations/upload", "Upload"],
  ["/admin/operations/analytics", "Analytics"],
  ["/admin/operations/tools", "Tools"],
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/admin" || href === "/admin/operations") return pathname === href;
  if (href === "/admin/operations/claims") {
    return pathname === href || (pathname.startsWith(`${href}/`) && !pathname.startsWith(`${href}/drafts`));
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

function Group({
  label,
  links,
  pathname,
}: {
  label: string;
  links: readonly (readonly [string, string])[];
  pathname: string;
}) {
  return (
    <div className="mt-5 first:mt-0">
      <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-foam/70">{label}</p>
      <div className="mt-1.5 grid gap-0.5">
        {links.map(([href, title]) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-lg px-3 py-2 text-sm text-paper/75 transition hover:bg-white/10 hover:text-paper",
                active && "bg-white/15 font-semibold text-foam",
              )}
              aria-current={active ? "page" : undefined}
            >
              {title}
            </Link>
          );
        })}
      </div>
    </div>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin">
      <div className="md:hidden">
        <div className="-mx-1 flex gap-1 overflow-x-auto px-1 pb-1">
          {practiceLinks.map(([href, title]) => {
            const active = isActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "shrink-0 rounded-full px-3 py-1.5 text-sm text-paper/80",
                  active && "bg-white/15 font-semibold text-foam",
                )}
                aria-current={active ? "page" : undefined}
              >
                {title}
              </Link>
            );
          })}
        </div>
        <details className="mt-3">
          <summary className="cursor-pointer px-1 text-xs font-semibold uppercase tracking-[0.16em] text-foam/70">Billing and website</summary>
          <Group label="Billing" links={billingLinks} pathname={pathname} />
          <Group label="Website" links={siteLinks} pathname={pathname} />
        </details>
      </div>
      <div className="hidden md:block">
        <Group label="Clinic" links={practiceLinks} pathname={pathname} />
        <Group label="Billing" links={billingLinks} pathname={pathname} />
        <Group label="Website" links={siteLinks} pathname={pathname} />
      </div>
    </nav>
  );
}
