"use client";

import { claimTotal, formatDay, money, patientName, statusLabel } from "@/lib/rcm/format";
import { summarizeClaims } from "@/lib/rcm/metrics";
import {
  LoadingDesk,
  PageHeader,
  Stat,
  StatusPill,
  panelClass,
  cardClass,
} from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";
import { cn } from "@/lib/utils";

export function AnalyticsDesk() {
  const { ready, claims, patients } = useRcm();
  if (!ready) return <LoadingDesk />;

  const summary = summarizeClaims(claims);
  const maxPayer = summary.byPayer[0]?.[1] ?? 1;
  const names = new Map(patients.map((patient) => [patient.id, patientName(patient)]));
  const denied = claims.filter((claim) => claim.status === "denied" || claim.status === "rejected");
  const totalDecided = summary.accepted + denied.length;

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Analytics"
        lede="Figures are calculated from the claims recorded in this browser."
      />
      {/* KPI row */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat
          label="Billed"
          value={money(summary.billed)}
          detail={`${claims.length} claims`}
        />
        <Stat
          label="Accepted"
          value={money(summary.accepted)}
          detail="Accepted and paid dollars"
          trend={
            totalDecided > 0
              ? {
                  dir: summary.accepted >= denied.length ? "up" : "down",
                  label: `${Math.round((summary.accepted / (summary.accepted + denied.length)) * 100)}% of decided dollars`,
                }
              : undefined
          }
        />
        <Stat
          label="In process"
          value={String(summary.processing)}
          detail="Submitted or processing"
        />
        <Stat
          label="Clean rate"
          value={`${Math.round(summary.firstPass * 100)}%`}
          detail="First-pass among decided claims"
          trend={
            summary.firstPass >= 0.7
              ? { dir: "up", label: "Above 70% benchmark" }
              : summary.firstPass > 0
                ? { dir: "down", label: "Below 70% benchmark" }
                : undefined
          }
        />
      </div>

      {/* Payer breakdown */}
      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">Billed by payer</h2>
        <ul className="mt-4 grid gap-3">
          {summary.byPayer.length === 0 ? (
            <p className="text-sm text-muted">No claims yet.</p>
          ) : (
            summary.byPayer.map(([payer, amount]) => {
              const pct = maxPayer > 0 ? Math.round((amount / maxPayer) * 100) : 0;
              return (
                <li
                  key={payer}
                  className={`${panelClass} grid items-center gap-3 text-sm sm:grid-cols-[minmax(9rem,14rem)_1fr_auto]`}
                >
                  <span className="font-medium text-ink">{payer}</span>
                  <div className="flex items-center">
                    <div
                      className="h-3 rounded-full bg-gradient-to-r from-oxide to-foam transition-all"
                      style={{ width: `${Math.max(pct, 4)}%` }}
                    />
                  </div>
                  <span className="font-semibold text-ink">{money(amount)}</span>
                </li>
              );
            })
          )}
        </ul>
      </section>

      {/* Denial summary */}
      <section className="mt-10">
        <h2 className="font-display text-2xl tracking-tight">
          Denial summary ({denied.length})
        </h2>
        {denied.length === 0 ? (
          <p className="mt-2 text-sm text-muted">No denials recorded. Clean slate!</p>
        ) : (
          <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {denied.map((claim) => (
              <li key={claim.id} className={cardClass}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{names.get(claim.patientId) ?? "Unknown"}</p>
                    <p className="mt-0.5 text-xs text-muted">{claim.payerName}</p>
                  </div>
                  <StatusPill status={claim.status} />
                </div>
                <p className="mt-2 text-sm text-muted">{claim.denialReason || "No reason given"}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatDay(claim.dateOfService)} &middot; {money(claimTotal(claim))}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}