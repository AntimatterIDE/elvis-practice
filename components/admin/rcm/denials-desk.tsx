"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDay, patientName } from "@/lib/rcm/format";
import type { Claim } from "@/lib/rcm/types";
import { LoadingDesk, PageHeader, StatusPill } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

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
        lede="Review demo denials, write an appeal, or mark the claim for resubmission."
      />
      {denied.length === 0 ? <p className="mt-8 text-sm text-muted">No denied or rejected claims.</p> : null}
      <div className="mt-8 grid gap-6 lg:grid-cols-[16rem_1fr]">
        <ul className="grid gap-2">
          {denied.map((claim) => (
            <li key={claim.id}>
              <button
                type="button"
                onClick={() => setSelectedId(claim.id)}
                className={`w-full border px-3 py-3 text-left text-sm ${selected?.id === claim.id ? "border-oxide bg-mint/40" : "border-line bg-card"}`}
              >
                <span className="block font-semibold">{names.get(claim.patientId)}</span>
                <span className="text-muted">{claim.controlNumber}</span>
              </button>
            </li>
          ))}
        </ul>
        {selected ? (
          <section className="border border-line bg-card p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl">{names.get(selected.patientId)}</h2>
              <StatusPill status={selected.status} />
            </div>
            <p className="mt-3 text-sm text-muted">
              {selected.payerName} · {formatDay(selected.dateOfService)} · {selected.controlNumber}
            </p>
            <p className="mt-4 text-sm">{selected.denialReason || "No reason recorded."}</p>
            <p className="mt-2 text-sm text-muted">
              {selected.carc ? `CARC ${selected.carc}` : "No CARC"}
              {selected.rarc ? ` · RARC ${selected.rarc}` : ""}
              {selected.resolution ? ` · ${selected.resolution.replaceAll("_", " ")}` : ""}
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <Button
                type="button"
                onClick={() =>
                  updateClaim(selected.id, {
                    appealDraft: letter(selected, names.get(selected.patientId) ?? "the patient", practice.legalName),
                    resolution: "appeal",
                  })
                }
              >
                Draft appeal
              </Button>
              <Button type="button" variant="secondary" onClick={() => updateClaim(selected.id, { status: "submitted", resolution: "resubmit" })}>
                Resubmit
              </Button>
              <Button type="button" variant="secondary" onClick={() => updateClaim(selected.id, { resolution: "write_off" })}>
                Write off
              </Button>
              <Button asChild variant="ghost">
                <Link href={`/admin/operations/claims/${selected.id}`}>Open claim</Link>
              </Button>
            </div>
            {selected.appealDraft ? (
              <pre className="mt-5 whitespace-pre-wrap border border-line bg-paper p-4 text-sm">{selected.appealDraft}</pre>
            ) : null}
          </section>
        ) : null}
      </div>
    </main>
  );
}
