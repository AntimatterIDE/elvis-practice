"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { claimTotal, formatDay, money, patientName } from "@/lib/rcm/format";
import type { ClaimStatus } from "@/lib/rcm/types";
import {
  LoadingDesk,
  PageHeader,
  StatusPill,
  Stat,
  fieldClass,
  cardClass,
  badgeClass,
} from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";
import { cn } from "@/lib/utils";

const filters: Array<ClaimStatus | "all"> = [
  "all",
  "draft",
  "submitted",
  "processing",
  "accepted",
  "paid",
  "denied",
  "rejected",
];

export function ClaimsDesk() {
  const { ready, claims, patients } = useRcm();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ClaimStatus | "all">("all");
  const names = useMemo(() => new Map(patients.map((patient) => [patient.id, patientName(patient)])), [patients]);

  const rows = claims.filter((claim) => {
    if (status !== "all" && claim.status !== status) return false;
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return [names.get(claim.patientId), claim.payerName, claim.controlNumber, claim.lines.map((line) => line.cpt).join(" ")]
      .join(" ")
      .toLowerCase()
      .includes(term);
  });

  const billed = claims.reduce((sum, c) => sum + claimTotal(c), 0);
  const accepted = claims
    .filter((c) => c.status === "accepted" || c.status === "paid")
    .reduce((sum, c) => sum + claimTotal(c), 0);
  const pct = billed > 0 ? Math.round((accepted / billed) * 100) : 0;

  if (!ready) return <LoadingDesk />;

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Claims"
        lede="Claims recorded at the practice. Nothing on this desk is sent to a clearinghouse."
        action={
          <Button asChild>
            <Link href="/admin/operations/claims/new">New claim</Link>
          </Button>
        }
      />
      {/* Summary stats */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Total billed" value={money(billed)} detail={`${claims.length} claims`} />
        <Stat label="Accepted / paid" value={money(accepted)} detail={`${pct}% of billed`} />
        <Stat label="Remaining" value={money(billed - accepted)} detail="In process, denied, or draft" />
      </div>
      {/* Filters */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search patient, payer, control number, or CPT"
          className={`${fieldClass} max-w-md`}
          aria-label="Search claims"
        />
        <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label="Filter by status">
          {filters.map((item) => (
            <button
              key={item}
              onClick={() => setStatus(item)}
              className={cn(
                badgeClass,
                "cursor-pointer transition",
                status === item
                  ? "bg-oxide-deep text-paper"
                  : "bg-mist text-muted hover:bg-mint hover:text-oxide-deep",
              )}
              aria-pressed={status === item}
            >
              {item === "all" ? "All" : item}
            </button>
          ))}
        </div>
      </div>
      {/* Claim cards */}
      <ul className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {rows.length === 0 ? (
          <li className="col-span-full rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
            No claims match.
          </li>
        ) : null}
        {rows.map((claim) => (
          <li key={claim.id} className={cardClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink">{names.get(claim.patientId) ?? "Unknown"}</p>
                <p className="mt-0.5 text-xs text-muted">{claim.payerName}</p>
              </div>
              <StatusPill status={claim.status} />
            </div>
            <div className="mt-3 flex items-baseline justify-between gap-2 text-sm">
              <span className="text-muted">{claim.controlNumber}</span>
              <span className="font-semibold text-ink">{money(claimTotal(claim))}</span>
            </div>
            <p className="mt-1 text-xs text-muted">
              {formatDay(claim.dateOfService)} &middot; {claim.lines.length} line{claim.lines.length > 1 ? "s" : ""}
              &nbsp;·&nbsp;
              {claim.lines.map((l) => l.cpt).join(", ")}
            </p>
            <div className="mt-4 flex gap-2">
              <Button asChild variant="secondary" size="sm">
                <Link href={`/admin/operations/claims/${claim.id}`}>View</Link>
              </Button>
              {claim.status === "draft" ? (
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => {
                    /* approve handler */
                  }}
                >
                  Approve
                </Button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}