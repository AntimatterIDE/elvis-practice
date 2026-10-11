import Link from "next/link";
import { cn } from "@/lib/utils";

export const deskFrame =
  "flex flex-col gap-1 rounded-[var(--rb-r-2xl,14px)] border border-neutral-200/70 bg-neutral-50 p-1";

export const deskPanel =
  "rounded-[var(--rb-r-lg,10px)] border border-neutral-200/70 bg-white";

export function MetricTile({
  href,
  label,
  value,
  detail,
}: {
  href?: string;
  label: string;
  value: string;
  detail: string;
}) {
  const body = (
    <>
      <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-2 text-2xl font-medium tabular-nums tracking-[-0.02em] text-neutral-900">{value}</p>
      <p className="mt-1 line-clamp-2 text-[13px] leading-relaxed text-neutral-500">{detail}</p>
    </>
  );
  const className = "block px-4 py-4 transition-colors hover:bg-neutral-50";
  return href ? (
    <Link href={href} className={className}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

export function MemberCard({
  href,
  initials,
  name,
  meta,
  note,
  live,
}: {
  href: string;
  initials: string;
  name: string;
  meta: string;
  note: string;
  live?: boolean;
}) {
  return (
    <li className={deskFrame}>
      <Link href={href} className={cn(deskPanel, "flex flex-1 flex-col items-center px-4 py-6 text-center hover:border-neutral-300")}>
        <span className="relative">
          <span aria-hidden="true" className="flex h-14 w-14 items-center justify-center rounded-full bg-neutral-100 text-[13px] font-medium text-neutral-700">
            {initials}
          </span>
          <span aria-hidden="true" className="absolute bottom-0 right-0 rounded-full bg-white p-0.5">
            <span className={cn("block h-2.5 w-2.5 rounded-full", live ? "bg-[var(--rb-accent,#0a6e66)]" : "bg-neutral-300")} />
          </span>
        </span>
        <p className="mt-3 w-full truncate text-[13px] font-medium text-neutral-900">{name}</p>
        <p className="mt-0.5 w-full truncate text-xs text-neutral-500">{meta}</p>
        <p className="mt-3 text-[13px] leading-relaxed text-neutral-600">{note}</p>
      </Link>
      <Link
        href={href}
        className="inline-flex h-10 w-full items-center justify-center rounded-[var(--rb-r-lg,10px)] bg-[var(--rb-accent,#0a6e66)] text-[13px] font-medium text-[var(--rb-accent-fg,#f3f7fb)] hover:bg-oxide-ink"
      >
        Open chart
      </Link>
    </li>
  );
}

export function ChartMast({
  initials,
  status,
  live,
  name,
  handle,
  line,
  stats,
  links,
}: {
  initials: string;
  status: string;
  live?: boolean;
  name: string;
  handle: string;
  line?: string;
  stats: { value: string; label: string }[];
  links: { href: string; label: string }[];
}) {
  return (
    <section className="overflow-hidden rounded-[var(--rb-r-4xl,18px)] border border-neutral-200 bg-white">
      <div className="px-6 pb-6 pt-8 sm:px-8">
        <div className="flex justify-center">
          <span className="inline-flex items-center gap-2 rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1.5 text-xs font-medium text-neutral-600">
            <span className={cn("h-1.5 w-1.5 rounded-full", live ? "bg-[var(--rb-accent,#0a6e66)]" : "bg-amber-500")} />
            {status}
          </span>
        </div>
        <div className="relative mx-auto mt-6 h-20 w-20">
          <div className="flex h-full w-full items-center justify-center rounded-full bg-neutral-100 text-lg font-medium text-neutral-700">
            {initials}
          </div>
        </div>
        <div className="mt-4 text-center">
          <h1 className="text-2xl font-medium tracking-[-0.02em] text-neutral-900 sm:text-3xl">{name}</h1>
          <p className="mt-1.5 text-sm text-neutral-500">{handle}</p>
          {line ? <p className="mx-auto mt-3 max-w-md text-sm leading-relaxed text-neutral-500">{line}</p> : null}
        </div>
        <dl className="mt-6 flex items-stretch justify-center divide-x divide-neutral-200 border-y border-neutral-200 py-4">
          {stats.map((stat) => (
            <div key={stat.label} className="min-w-0 flex-1 px-3 text-center sm:px-5">
              <dt className="truncate text-lg font-semibold tabular-nums tracking-tight text-neutral-900">{stat.value}</dt>
              <dd className="mt-0.5 text-xs text-neutral-500">{stat.label}</dd>
            </div>
          ))}
        </dl>
        <div className="mt-5 flex flex-wrap justify-center gap-2">
          {links.map((link) => (
            <Link
              key={link.label}
              href={link.href}
              className="inline-flex h-10 items-center rounded-full border border-neutral-200 px-4 text-[13px] font-medium text-neutral-700 hover:bg-neutral-50"
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}

export function ChartTabs({
  tabs,
  active,
  onChange,
}: {
  tabs: readonly (readonly [string, string])[];
  active: string;
  onChange: (key: string) => void;
}) {
  return (
    <div className="sticky top-14 z-20 mt-4 overflow-x-auto rounded-full border border-neutral-200 bg-neutral-50 p-1 lg:top-0" role="tablist" aria-label="Chart">
      <div className="flex min-w-max gap-1">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            role="tab"
            aria-selected={active === key}
            onClick={() => onChange(key)}
            className={cn(
              "rounded-full px-3 py-2 text-sm font-medium",
              active === key ? "bg-white text-neutral-950 shadow-sm" : "text-neutral-500 hover:text-neutral-900",
            )}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
