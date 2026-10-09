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
      <p className="px-3 text-[0.65rem] font-semibold uppercase tracking-[0.18em] text-foam/55">{label}</p>
      <div className="mt-1.5 grid gap-0.5">
        {links.map(([href, title]) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "rounded-xl px-3 py-2 text-sm text-paper/75 transition hover:bg-white/10 hover:text-paper",
                active && "bg-white text-pine font-semibold shadow-sm",
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
  const links = [...practiceLinks, ...billingLinks, ...siteLinks];
  return links.find(([href]) => isActive(pathname, href))?.[1] ?? "Desk";
}

export function AdminNav({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin" onClick={onNavigate}>
      <Group label="Clinic" links={practiceLinks} pathname={pathname} />
      <Group label="Billing" links={billingLinks} pathname={pathname} />
      <Group label="Website" links={siteLinks} pathname={pathname} />
    </nav>
  );
}
