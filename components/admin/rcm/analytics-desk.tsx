"use client";

import { claimTotal, formatDay, money, patientName, statusLabel } from "@/lib/rcm/format";
import { summarizeClaims } from "@/lib/rcm/metrics";
import { LoadingDesk, PageHeader, Stat, StatusPill } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

export function AnalyticsDesk() {
  const { ready, claims, patients } = useRcm();
  if (!ready) return <LoadingDesk />;

  const summary = summarizeClaims(claims);
  const maxPayer = summary.byPayer[0]?.[1] ?? 1;
  const names = new Map(patients.map((patient) => [patient.id, patientName(patient)]));
  const denied = claims.filter((claim) => claim.status === "denied" || claim.status === "rejected");

  return (
    <main>
      <PageHeader kicker="Practice" title="Analytics" lede="Figures are calculated from the claims recorded in this browser." />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Billed" value={money(summary.billed)} detail={`${claims.length} claims`} />
        <Stat label="Accepted" value={money(summary.accepted)} detail="Accepted and paid dollars" />
        <Stat label="In process" value={String(summary.processing)} detail="Submitted or processing" />
        <Stat label="First-pass" value={`${Math.round(summary.firstPass * 100)}%`} detail="Clean among decided claims" />
      </div>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Billed by payer</h2>
        <ul className="mt-4 grid gap-3">
          {summary.byPayer.map(([payer, amount]) => (
            <li key={payer} className="grid items-center gap-3 text-sm sm:grid-cols-[minmax(9rem,14rem)_1fr_auto]">
              <span>{payer}</span>
              <span className="h-2 bg-mist">
                <span className="block h-2 bg-gold" style={{ width: `${Math.max(8, (amount / maxPayer) * 100)}%` }} />
              </span>
              <span>{money(amount)}</span>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">By status</h2>
        <ul className="mt-4 flex flex-wrap gap-3">
          {summary.byStatus.map(([status, count]) => (
            <li key={status} className="flex items-center gap-2 border border-line bg-card px-3 py-2 text-sm">
              <StatusPill status={status} />
              <span>
                {count} {statusLabel(status)}
              </span>
            </li>
          ))}
        </ul>
      </section>
      <section className="mt-10">
        <h2 className="font-display text-2xl">Denial dollars</h2>
        <ul className="mt-4 grid gap-3 md:grid-cols-2">
          {denied.length === 0 ? <li className="rounded-2xl border border-dashed border-line px-4 py-3 text-sm text-muted">None.</li> : null}
          {denied.map((claim) => (
            <li key={claim.id} className="flex items-center justify-between gap-4 rounded-2xl border border-line bg-card px-4 py-3 text-sm">
              <span>
                {names.get(claim.patientId)} · {formatDay(claim.dateOfService)} · {claim.denialReason}
              </span>
              <span>{money(claimTotal(claim))}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
