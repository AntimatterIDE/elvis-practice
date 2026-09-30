import { Activity, ArrowUpRight, CalendarCheck, HeartPulse, Stethoscope } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { carePathways } from "@/lib/site";

const icons: Record<string, LucideIcon> = {
  neck: Stethoscope,
  "low-back": Activity,
  "after-surgery": HeartPulse,
  visit: CalendarCheck,
};

export function CareIndex() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {carePathways.map((item) => {
        const Icon = icons[item.id] ?? Stethoscope;
        const href = "href" in item ? item.href : undefined;
        const inner = (
          <>
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-mist text-oxide">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="mt-5 flex items-start justify-between gap-3">
              <span className="font-display text-2xl font-semibold tracking-tight">{item.label}</span>
              {href ? <ArrowUpRight className="mt-1 size-5 shrink-0 text-oxide" aria-hidden /> : null}
            </span>
            <span className="mt-3 block text-sm leading-relaxed text-muted">{item.body}</span>
          </>
        );

        if (href) {
          return (
            <a
              key={item.id}
              href={href}
              className="clinic-card flex h-full flex-col rounded-2xl border border-line bg-card p-6 shadow-[0_16px_40px_-32px_rgb(7_30_54_/_0.8)]"
            >
              {inner}
            </a>
          );
        }

        return (
          <article
            key={item.id}
            className="clinic-card flex h-full flex-col rounded-2xl border border-line bg-card p-6 shadow-[0_16px_40px_-32px_rgb(7_30_54_/_0.8)]"
          >
            {inner}
          </article>
        );
      })}
    </div>
  );
}
