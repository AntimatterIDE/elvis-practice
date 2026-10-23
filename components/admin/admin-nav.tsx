"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const siteLinks = [
  ["/admin", "Overview"],
  ["/admin/conditions", "Conditions"],
  ["/admin/treatments", "Treatments"],
  ["/admin/faqs", "Questions"],
  ["/admin/journal", "Journal"],
  ["/admin/ads", "Ads"],
  ["/admin/media", "Media"],
  ["/admin/settings", "Settings"],
  ["/admin/audit", "Audit"],
] as const;

const practiceLinks = [
  ["/admin/operations", "Today"],
  ["/admin/operations/patients", "Patients"],
  ["/admin/operations/scheduling", "Schedule"],
  ["/admin/operations/visits", "Visits"],
  ["/admin/operations/consultations", "Requests"],
  ["/admin/operations/intake", "Intake"],
  ["/admin/operations/agreements", "Agreements"],
  ["/admin/operations/tasks", "Tasks"],
  ["/admin/operations/people", "People"],
  ["/admin/operations/practice", "Practice"],
] as const;

const billingLinks = [
  ["/admin/operations/claims", "Claims"],
  ["/admin/operations/eligibility", "Eligibility"],
  ["/admin/operations/denials", "Denials"],
  ["/admin/operations/payments", "Payments"],
  ["/admin/operations/claims/drafts", "Drafts"],
  ["/admin/operations/upload", "Upload"],
  ["/admin/operations/analytics", "Analytics"],
  ["/admin/operations/tools", "Tools"],
] as const;

const devLinks = [["/dev/coding-data", "Coding data"]] as const;

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
    <div className="mt-6 first:mt-0">
      <p className="mb-1 px-3 text-[11px] font-medium uppercase tracking-wider text-neutral-500">{label}</p>
      <div className="grid gap-0.5">
        {links.map(([href, title]) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "flex min-h-10 items-center rounded-[var(--rb-r-md,8px)] px-3 text-[13px] text-neutral-600 hover:bg-neutral-100 hover:text-neutral-900",
                active && "bg-neutral-100 font-medium text-neutral-900",
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

export function currentDeskLabel(pathname: string) {
  const links = [...practiceLinks, ...billingLinks, ...siteLinks, ...devLinks];
  return links.find(([href]) => isActive(pathname, href))?.[1] ?? "Desk";
}

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" onClick={onNavigate}>
      <Group label="Clinic" links={practiceLinks} pathname={pathname} />
      <Group label="Billing" links={billingLinks} pathname={pathname} />
      <Group label="Website" links={siteLinks} pathname={pathname} />
      <Group label="Dev" links={devLinks} pathname={pathname} />
    </nav>
  );
}
