"use client";

import { useSyncExternalStore } from "react";
import { DEMO_CLINIC_DAY, localIsoDay } from "@/lib/rcm/chart";
import { cn } from "@/lib/utils";
import type { ClaimStatus, AppointmentStatus } from "@/lib/rcm/types";

export const fieldClass =
  "w-full rounded-xl border border-line bg-card px-3.5 py-2.5 text-sm text-ink outline-none transition placeholder:text-muted/50 focus:border-oxide focus:ring-4 focus:ring-oxide/15";

export const panelClass =
  "rounded-2xl border border-line bg-card p-5 shadow-[0_16px_36px_-28px_rgb(7_30_54_/_0.45)]";

export const cardClass =
  "rounded-2xl border border-line bg-card p-5 shadow-[0_16px_36px_-28px_rgb(7_30_54_/_0.45)] transition hover:shadow-[0_20px_44px_-28px_rgb(7_30_54_/_0.55)] motion-safe:hover:-translate-y-0.5";

export const badgeClass =
  "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold";

export function PageHeader({
  kicker,
  title,
  lede,
  action,
  meta,
}: {
  kicker: string;
  title: string;
  lede?: string;
  action?: React.ReactNode;
  meta?: React.ReactNode;
}) {
  return (
    <div className="border-b border-line pb-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.2em] text-oxide">{kicker}</p>
          <h1 className="mt-2 font-display text-3xl tracking-tight md:text-4xl">{title}</h1>
          {lede ? <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted">{lede}</p> : null}
        </div>
        {action}
      </div>
      {meta ? <div className="mt-4">{meta}</div> : null}
    </div>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("grid gap-2 text-sm", className)}>
      <span className="font-medium">{label}</span>
      {children}
    </label>
  );
}

const statusTone: Record<ClaimStatus, string> = {
  draft: "bg-mist text-ink",
  submitted: "bg-mist text-ink",
  processing: "bg-mist text-oxide-deep",
  accepted: "bg-mint text-oxide-deep",
  paid: "bg-mint text-oxide-ink",
  denied: "bg-red-50 text-emergency",
  rejected: "bg-red-50 text-emergency",
};

const statusDot: Record<ClaimStatus, string> = {
  draft: "bg-ink/30",
  submitted: "bg-ink/40",
  processing: "bg-oxide-deep",
  accepted: "bg-oxide-deep",
  paid: "bg-oxide-ink",
  denied: "bg-emergency",
  rejected: "bg-emergency",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  return (
    <span className={cn(badgeClass, statusTone[status as ClaimStatus] ?? "bg-mist text-ink")}>
      <span className={cn("h-1.5 w-1.5 rounded-full", statusDot[status as ClaimStatus] ?? "bg-ink/30")} />
      {label ?? status}
    </span>
  );
}

export function Stat({
  label,
  value,
  detail,
  trend,
}: {
  label: string;
  value: string;
  detail?: string;
  trend?: { dir: "up" | "down"; label: string };
}) {
  return (
    <div className={cn(panelClass, "flex flex-col gap-1")}>
      <p className="text-xs font-semibold uppercase tracking-wider text-muted">{label}</p>
      <p className="font-display text-3xl tracking-tight text-ink">{value}</p>
      {detail ? <p className="text-xs text-muted">{detail}</p> : null}
      {trend ? (
        <p
          className={cn(
            "mt-1 text-xs font-semibold",
            trend.dir === "up" ? "text-oxide-deep" : "text-emergency",
          )}
        >
          {trend.dir === "up" ? "↑" : "↓"} {trend.label}
        </p>
      ) : null}
    </div>
  );
}

export function LoadingDesk() {
  return (
    <main>
      <div className="flex h-48 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-oxide border-t-transparent" />
      </div>
    </main>
  );
}

/** Grab the demo clinic date string for the appointment grid. */
export function useClinicToday() {
  const now = useSyncExternalStore(
    () => () => {},
    () => localIsoDay(),
    () => DEMO_CLINIC_DAY,
  );
  return now;
}

export function visitLabel(type: string) {
  const labels: Record<string, string> = {
    new: "New patient",
    follow_up: "Follow-up",
    procedure: "Procedure",
    imaging_review: "Imaging review",
    post_op: "Post-op",
  };
  return labels[type] ?? type;
}