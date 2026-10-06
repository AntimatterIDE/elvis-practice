"use client";

import { cn } from "@/lib/utils";

interface Stat {
  value: string;
  label: string;
  icon?: string;
}

export function StatsGrid({ stats, className }: { stats: Stat[]; className?: string }) {
  return (
    <div className={cn("mx-auto grid max-w-5xl gap-px px-5 md:grid-cols-4 md:px-8", className)}>
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="group rise-in flex flex-col items-center gap-3 rounded-2xl border border-oxide/20 bg-mint/40 p-6 md:p-8 motion-safe:transition-all motion-safe:duration-500 hover:-translate-y-1 hover:shadow-[0_12px_28px_-12px_rgb(7_30_54_/_0.25)]"
        >
          <div className="flex items-center justify-center">
            <span className="font-display text-5xl font-bold leading-none text-oxide-deep tracking-tight motion-safe:transition-all motion-safe:duration-700 motion-safe:ease-out">
              {stat.value}
            </span>
          </div>
          <p className="mt-2 text-sm font-medium leading-snug text-ink motion-safe:transition-all motion-safe:delay-200">
            {stat.label}
          </p>
        </div>
      ))}
    </div>
  );
}