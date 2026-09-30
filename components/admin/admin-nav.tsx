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
    return (
      pathname === href ||
      (pathname.startsWith(`${href}/`) && !pathname.startsWith(`${href}/drafts`))
    );
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
    <div className="mt-6">
      <p className="text-xs uppercase tracking-[0.16em] text-muted">{label}</p>
      <div className="mt-2 grid gap-1.5 text-sm">
        {links.map(([href, title]) => (
          <Link
            key={href}
            href={href}
            className={cn(isActive(pathname, href) && "font-semibold text-oxide")}
            aria-current={isActive(pathname, href) ? "page" : undefined}
          >
            {title}
          </Link>
        ))}
      </div>
    </div>
  );
}

export function AdminNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Admin">
      <Group label="Practice" links={practiceLinks} pathname={pathname} />
      <Group label="Billing" links={billingLinks} pathname={pathname} />
      <Group label="Site" links={siteLinks} pathname={pathname} />
    </nav>
  );
}
