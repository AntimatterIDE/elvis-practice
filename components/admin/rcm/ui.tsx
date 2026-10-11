"use client";

import { useSyncExternalStore } from "react";
import { DEMO_CLINIC_DAY, localIsoDay } from "@/lib/rcm/chart";
import { cn } from "@/lib/utils";
import type { ClaimStatus } from "@/lib/rcm/types";

export const fieldClass =
  "w-full min-h-11 rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-3 py-2 text-sm text-ink outline-none transition-colors duration-150 placeholder:text-neutral-400 hover:border-neutral-300 focus:border-neutral-900 focus:ring-0 disabled:pointer-events-none disabled:opacity-50";

export const panelClass =
  "rounded-[var(--rb-r-2xl,14px)] border border-neutral-200 bg-white p-5";

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
          <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">{kicker}</p>
          <h1 className="mt-2 text-xl font-medium tracking-[-0.015em] text-neutral-900">{title}</h1>
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
  held: "bg-mist text-ink",
  ready: "bg-mint text-oxide-deep",
  draft: "bg-mist text-ink",
  submitted: "bg-mist text-ink",
  processing: "bg-mist text-oxide-deep",
  accepted: "bg-mint text-oxide-deep",
  paid: "bg-mint text-oxide-deep",
  denied: "bg-red-50 text-emergency",
  rejected: "bg-red-50 text-emergency",
};

export function StatusPill({ status, label }: { status: string; label?: string }) {
  const tone = statusTone[status as ClaimStatus] ?? "bg-mist text-ink";
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-1 text-xs uppercase tracking-[0.12em]", tone)}>
      {label ?? status.replaceAll("_", " ")}
    </span>
  );
}

const visitStatusLabel: Record<string, string> = {
  scheduled: "Scheduled",
  arrived: "Arrived",
  in_progress: "In room",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
  confirmed: "Confirmed",
  unconfirmed: "Unconfirmed",
  left_message: "Left message",
};

export function visitLabel(status: string) {
  return visitStatusLabel[status] ?? status.replaceAll("_", " ");
}

export function useClinicToday() {
  return useSyncExternalStore(
    (listener) => {
      const id = window.setInterval(listener, 60_000);
      return () => window.clearInterval(id);
    },
    localIsoDay,
    () => DEMO_CLINIC_DAY,
  );
}

export function Stat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[var(--rb-r-2xl,14px)] border border-neutral-200/80 bg-white px-4 py-4">
      <p className="text-[11px] font-medium uppercase tracking-wider text-neutral-500">{label}</p>
      <p className="mt-2 text-3xl font-medium tabular-nums tracking-[-0.02em] text-neutral-900">{value}</p>
      <p className="mt-1 text-[13px] leading-relaxed text-neutral-500">{detail}</p>
    </div>
  );
}

export function LoadingDesk() {
  return (
    <p className="text-sm text-muted" role="status">
      Opening the desk…
    </p>
  );
}
