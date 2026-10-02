"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { claimTotal, formatDay, money, patientName } from "@/lib/rcm/format";
import type { Claim, ClaimStatus } from "@/lib/rcm/types";
import { LoadingDesk, PageHeader, StatusPill } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

const nextStatus: ClaimStatus[] = ["draft", "submitted", "processing", "accepted", "paid", "denied", "rejected"];

function appealLetter(claim: Claim, name: string, practiceName: string) {
  const line = claim.lines[0];
  return [
    "Appeals department,",
    "",
    `Please reconsider claim ${claim.controlNumber} for ${name}, date of service ${formatDay(claim.dateOfService)}.`,
    line
      ? `${line.cpt} ${line.description} was reported with ${line.icd || "the documented diagnosis"}.`
      : "The reported services were medically necessary.",
    claim.denialReason ? `The denial reason on file is: ${claim.denialReason}.` : "",
    claim.carc ? `CARC ${claim.carc}${claim.rarc ? `, RARC ${claim.rarc}` : ""}.` : "",
    "",
    "This letter stays in the chart. It has not been sent.",
    practiceName,
  ]
    .filter((paragraph) => paragraph !== "")
    .join("\n");
}

export function ClaimDetail({ id }: { id: string }) {
  const { ready, claims, patients, practice, updateClaim } = useRcm();
  const claim = claims.find((item) => item.id === id);
  const patient = patients.find((item) => item.id === claim?.patientId);

  if (!ready) return <LoadingDesk />;
  if (!claim || !patient) {
    return (
      <main>
        <h1 className="font-display text-4xl">Claim not found</h1>
        <Link href="/admin/operations/claims" className="mt-4 inline-block text-sm underline">
          Back to claims
        </Link>
      </main>
    );
  }

  return (
    <main>
      <PageHeader
        kicker={claim.controlNumber}
        title={patientName(patient)}
        lede={`${claim.payerName} · ${formatDay(claim.dateOfService)} · Place of service ${claim.placeOfService}`}
        action={<StatusPill status={claim.status} />}
      />
      <p className="mt-4 text-sm text-muted">
        <Link href={`/admin/operations/patients/${patient.id}`} className="underline">
          Open chart
        </Link>
        {" · "}
        {money(claimTotal(claim))} billed · source {claim.source}
      </p>
      {claim.agentNote ? <p className="mt-4 border border-line bg-mint/50 p-4 text-sm">{claim.agentNote}</p> : null}
      {claim.denialReason ? (
        <p className="mt-4 border border-line bg-red-50 p-4 text-sm text-emergency">
          {claim.denialReason}
          {claim.carc ? ` · CARC ${claim.carc}` : ""}
          {claim.rarc ? ` · RARC ${claim.rarc}` : ""}
        </p>
      ) : null}
      <ul className="mt-6 divide-y divide-line border-y border-line">
        {claim.lines.map((line) => (
          <li key={line.id} className="flex items-baseline justify-between gap-4 py-3 text-sm">
            <span>
              <span className="block font-semibold">
                {line.cpt}
                {line.modifier ? `-${line.modifier}` : ""} · {line.description}
              </span>
              <span className="text-muted">
                ICD {line.icd || "—"} · {line.units} unit{line.units === 1 ? "" : "s"}
              </span>
            </span>
            <span>{money(line.charge * line.units)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-2">
        {nextStatus.map((status) => (
          <Button key={status} type="button" variant={claim.status === status ? "primary" : "secondary"} onClick={() => updateClaim(claim.id, { status })}>
            {status}
          </Button>
        ))}
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            updateClaim(claim.id, {
              status: "denied",
              denialReason: claim.denialReason || "Additional documentation requested",
              carc: claim.carc || "16",
              appealDraft: appealLetter(
                { ...claim, denialReason: claim.denialReason || "Additional documentation requested", carc: claim.carc || "16" },
                patientName(patient),
                practice.legalName,
              ),
              resolution: "appeal",
            })
          }
        >
          Draft appeal
        </Button>
        <Button type="button" variant="secondary" onClick={() => updateClaim(claim.id, { status: "submitted", resolution: "resubmit" })}>
          Mark resubmitted
        </Button>
      </div>
      {claim.appealDraft ? (
        <pre className="mt-6 whitespace-pre-wrap border border-line bg-card p-4 text-sm">{claim.appealDraft}</pre>
      ) : null}
    </main>
  );
}
