"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDay, patientName } from "@/lib/rcm/format";
import type { Claim } from "@/lib/rcm/types";
import {
  LoadingDesk,
  PageHeader,
  StatusPill,
  fieldClass,
  panelClass,
  cardClass,
  badgeClass,
} from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";
import { cn } from "@/lib/utils";

const denialCodes = [
  { code: "CO-4", label: "Procedure not covered", category: "CO" },
  { code: "CO-11", label: "DX inconsistent", category: "CO" },
  { code: "CO-97", label: "Consistency check fail", category: "CO" },
  { code: "PR-1", label: "Deductible not met", category: "PR" },
  { code: "PR-2", label: "Coinsurance / copay", category: "PR" },
  { code: "PR-3", label: "Out-of-network", category: "PR" },
  { code: "MA-130", label: "Claim missing info", category: "MA" },
  { code: "MA-14", label: "Required info omitted", category: "MA" },
  { code: "N-29", label: "Missing/incomplete info", category: "N" },
  { code: "N-38", label: "Claim lacks enough info", category: "N" },
];

function letter(claim: Claim, name: string, practiceName: string) {
  const line = claim.lines[0];
  return [
    `${practiceName}`,
    "",
    `Re: claim ${claim.controlNumber} for ${name}`,
    `Date of service ${formatDay(claim.dateOfService)}`,
    "",
    "Please overturn this denial. The visit is documented and the codes match the note.",
    line ? `Service ${line.cpt} ${line.description}, diagnosis ${line.icd || "on the claim"}.` : "",
    claim.denialReason ? `Payer reason: ${claim.denialReason}.` : "",
    claim.carc ? `CARC ${claim.carc}${claim.rarc ? ` / RARC ${claim.rarc}` : ""}.` : "",
    "",
    "Demo letter. Not transmitted.",
  ]
    .filter(Boolean)
    .join("\n");
}

export function DenialsDesk() {
  const { ready, claims, patients, practice, updateClaim } = useRcm();
  const denied = claims.filter((claim) => claim.status === "denied" || claim.status === "rejected");
  const [selectedId, setSelectedId] = useState(denied[0]?.id ?? "");
  const selected = denied.find((claim) => claim.id === selectedId) ?? denied[0];
  const names = new Map(patients.map((patient) => [patient.id, patientName(patient)]));

  if (!ready) return <LoadingDesk />;

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Denials"
        lede="Review a denial, write an appeal, or mark the claim for resubmission."
      />
      {denied.length === 0 ? (
        <p className="mt-8 text-sm text-muted">No denied or rejected claims.</p>
      ) : (
        <div className="mt-8 grid items-start gap-6 xl:grid-cols-[20rem_minmax(0,1fr)]">
          {/* Sidebar — claim list */}
          <ul className="grid gap-2">
            {denied.map((claim) => {
              const name = names.get(claim.patientId) ?? "Unknown";
              const isSelected = claim.id === selectedId;
              return (
                <li key={claim.id}>
                  <button
                    onClick={() => setSelectedId(claim.id)}
                    className={cn(
                      "w-full rounded-xl border p-3 text-left text-sm transition",
                      isSelected
                        ? "border-oxide bg-oxide/5 ring-1 ring-oxide"
                        : "border-line bg-card hover:border-oxide/40",
                    )}
                  >
                    <p className="font-semibold text-ink">{name}</p>
                    <p className="mt-0.5 text-xs text-muted">
                      {claim.controlNumber} &middot; {claim.denialReason || "No reason"}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {formatDay(claim.dateOfService)}
                    </p>
                  </button>
                </li>
              );
            })}
          </ul>

          {/* Detail panel */}
          {selected ? (
            <div className={`${panelClass} grid gap-5`}>
              {/* Claim header & actions */}
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-semibold text-ink">
                    {names.get(selected.patientId) ?? "Unknown"}
                  </p>
                  <p className="mt-0.5 text-xs text-muted">
                    {selected.payerName} &middot; {selected.controlNumber}
                  </p>
                </div>
                <StatusPill status={selected.status} />
              </div>

              {/* Denial details */}
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-mist p-3">
                  <p className="text-xs font-semibold text-muted">Date of service</p>
                  <p className="mt-0.5 text-sm text-ink">{formatDay(selected.dateOfService)}</p>
                </div>
                {selected.denialReason ? (
                  <div className="rounded-xl bg-red-50 p-3">
                    <p className="text-xs font-semibold text-emergency">Denial reason</p>
                    <p className="mt-0.5 text-sm text-ink">{selected.denialReason}</p>
                  </div>
                ) : null}
                {selected.carc ? (
                  <div className="rounded-xl bg-mist p-3">
                    <p className="text-xs font-semibold text-muted">CARC</p>
                    <p className="mt-0.5 font-mono text-sm text-ink">{selected.carc}</p>
                  </div>
                ) : null}
                {selected.rarc ? (
                  <div className="rounded-xl bg-mist p-3">
                    <p className="text-xs font-semibold text-muted">RARC</p>
                    <p className="mt-0.5 font-mono text-sm text-ink">{selected.rarc}</p>
                  </div>
                ) : null}
              </div>

              {/* Appeal letter preview */}
              <div>
                <h3 className="mb-2 text-sm font-semibold text-ink">Appeal letter</h3>
                <pre className="prose-clinical max-h-60 overflow-y-auto whitespace-pre-wrap rounded-xl bg-mist p-4 text-xs leading-relaxed text-ink">
                  {letter(selected, names.get(selected.patientId) ?? "", practice.legalName)}
                </pre>
              </div>

              {/* Action bar */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() =>
                    updateClaim(selected.id, { status: "submitted" })
                  }
                >
                  Mark resubmitted
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    navigator.clipboard?.writeText(
                      letter(selected, names.get(selected.patientId) ?? "", practice.legalName),
                    );
                  }}
                >
                  Copy appeal letter
                </Button>
              </div>

              {/* Denial code reference */}
              <details className="rounded-xl border border-line bg-card p-3 text-sm">
                <summary className="cursor-pointer font-semibold text-muted">
                  Denial code reference
                </summary>
                <ul className="mt-3 grid gap-2 text-xs">
                  {denialCodes.map((item) => (
                    <li key={item.code} className="flex gap-2">
                      <span className="font-mono font-semibold text-oxide-deep">{item.code}</span>
                      <span className="text-muted">{item.label}</span>
                    </li>
                  ))}
                </ul>
              </details>
            </div>
          ) : null}
        </div>
      )}
    </main>
  );
}