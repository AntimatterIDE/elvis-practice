"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { claimTotal, formatDay, money, patientName } from "@/lib/rcm/format";
import type { ClaimStatus } from "@/lib/rcm/types";
import { LoadingDesk, PageHeader, StatusPill, fieldClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

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

  if (!ready) return <LoadingDesk />;

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Claims"
        lede="Draft, submitted, and decided demo claims. Nothing is sent to a clearinghouse."
        action={
          <Button asChild>
            <Link href="/admin/operations/claims/new">New claim</Link>
          </Button>
        }
      />
      <div className="mt-8 flex flex-wrap gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search patient, payer, control number, or CPT"
          className={`${fieldClass} max-w-md`}
          aria-label="Search claims"
        />
        <select
          className={`${fieldClass} max-w-48`}
          value={status}
          onChange={(event) => setStatus(event.target.value as ClaimStatus | "all")}
          aria-label="Filter by status"
        >
          {filters.map((item) => (
            <option key={item} value={item}>
              {item}
            </option>
          ))}
        </select>
      </div>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {rows.length === 0 ? <li className="py-4 text-sm text-muted">No claims match.</li> : null}
        {rows.map((claim) => (
          <li key={claim.id}>
            <Link href={`/admin/operations/claims/${claim.id}`} className="flex flex-wrap items-center justify-between gap-3 py-4">
              <span>
                <span className="block">{names.get(claim.patientId) ?? "Unknown patient"}</span>
                <span className="text-sm text-muted">
                  {claim.payerName} · {formatDay(claim.dateOfService)} · {claim.controlNumber} ·{" "}
                  {claim.lines.map((line) => line.cpt).join(", ")}
                </span>
              </span>
              <span className="flex items-center gap-3">
                <StatusPill status={claim.status} />
                <span className="text-sm">{money(claimTotal(claim))}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
