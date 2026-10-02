import { Activity, ArrowUpRight, CalendarCheck, HeartPulse, Stethoscope } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import Link from "next/link";
import { publicConditions, publicPath } from "@/lib/content";
import { carePathways } from "@/lib/site";

const icons: Record<string, LucideIcon> = {
  neck: Stethoscope,
  "low-back": Activity,
  "after-surgery": HeartPulse,
  visit: CalendarCheck,
};

export function CareIndex() {
  const published = new Map(publicConditions().map((document) => [document.slug, document]));

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {carePathways.map((item) => {
        const Icon = icons[item.id] ?? Stethoscope;
        const hash = item.href.includes("#") ? item.href.split("#")[1] : "";
        const document = hash ? published.get(hash) : undefined;
        const href = document ? publicPath(document) : item.href;
        return (
          <Link
            key={item.id}
            href={href}
            className="clinic-card flex h-full flex-col rounded-2xl border border-line bg-card p-6 card-shadow"
          >
            <span className="inline-flex size-11 items-center justify-center rounded-xl bg-mist text-oxide-deep">
              <Icon className="size-5" aria-hidden />
            </span>
            <span className="mt-5 flex items-start justify-between gap-3">
              <span className="font-display text-2xl font-semibold tracking-tight">{item.label}</span>
              <ArrowUpRight className="mt-1 size-5 shrink-0 text-oxide-deep" aria-hidden />
            </span>
            <span className="mt-3 block text-sm leading-relaxed text-muted">{item.body}</span>
          </Link>
        );
      })}
    </div>
  );
}
