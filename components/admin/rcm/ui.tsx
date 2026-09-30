"use client";

import { useSyncExternalStore } from "react";
import { DEMO_CLINIC_DAY, localIsoDay } from "@/lib/rcm/chart";
import { cn } from "@/lib/utils";
import type { ClaimStatus } from "@/lib/rcm/types";

export const fieldClass =
  "w-full border border-line bg-card px-3 py-2.5 text-sm text-ink outline-none focus:border-oxide";

export function PageHeader({
  kicker,
  title,
  lede,
  action,
}: {
  kicker: string;
  title: string;
  lede?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="text-xs uppercase tracking-[0.18em] text-oxide">{kicker}</p>
        <h1 className="mt-2 font-display text-4xl">{title}</h1>
        {lede ? <p className="mt-3 max-w-2xl text-sm text-muted">{lede}</p> : null}
      </div>
      {action}
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
      <span>{label}</span>
      {children}
    </label>
  );
}

const statusTone: Record<ClaimStatus, string> = {
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
    <div className="border border-line bg-card p-4">
      <p className="text-xs uppercase tracking-[0.14em] text-oxide">{label}</p>
      <p className="mt-3 font-display text-3xl">{value}</p>
      <p className="mt-2 text-sm text-muted">{detail}</p>
    </div>
  );
}

export function LoadingDesk() {
  return <p className="text-sm text-muted">Loading practice desk…</p>;
}
