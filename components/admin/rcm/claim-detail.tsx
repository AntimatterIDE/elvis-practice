"use client";

import { useState } from "react";
import Link from "next/link";
import { attachDemoNote, checkClaimStatus, requestPaperClaim, submitProfessionalClaim } from "@/app/admin/stedi/actions";
import { Button } from "@/components/ui/button";
import { claimTotal, formatDay, formatWhen, money, patientName } from "@/lib/rcm/format";
import { claimSubmissionInput } from "@/lib/rcm/submit-input";
import type { Claim, ClaimStatus } from "@/lib/rcm/types";
import { AccountNoteDialog } from "@/components/admin/rcm/account-note";
import { applyClaimEvent } from "@/components/admin/rcm/demo-billing";
import { LoadingDesk, PageHeader, StatusPill } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

const localStatuses: ClaimStatus[] = ["draft", "held", "ready", "submitted", "processing", "accepted", "paid", "denied", "rejected"];

function appealLetter(claim: Claim, name: string, practiceName: string) {
  const line = claim.lines[0];
  return [
    "Appeals department,",
    "",
    `Please reconsider claim ${claim.controlNumber} for ${name}, date of service ${formatDay(claim.dateOfService)}.`,
    line ? `${line.cpt} ${line.description} was reported with ${line.icd || "the documented diagnosis"}.` : "The reported services were medically necessary.",
    claim.denialReason ? `The denial reason on file is: ${claim.denialReason}.` : "",
    claim.carc ? `CARC ${claim.carc}${claim.rarc ? `, RARC ${claim.rarc}` : ""}.` : "",
    "",
    "This letter stays in the chart. It has not been sent.",
    practiceName,
  ].filter((paragraph) => paragraph !== "").join("\n");
}

export function ClaimDetail({ id }: { id: string }) {
  const { ready, claims, patients, practice, updateClaim } = useRcm();
  const claim = claims.find((item) => item.id === id);
  const patient = patients.find((item) => item.id === claim?.patientId);
  const [noteOpen, setNoteOpen] = useState(true);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  if (!ready) return <LoadingDesk />;
  if (!claim || !patient) {
    return (
      <main>
        <h1 className="font-display text-4xl">Claim not found</h1>
        <Link href="/admin/operations/claims" className="mt-4 inline-block text-sm underline">Back to claims</Link>
      </main>
    );
  }

  async function run(action: () => Promise<{ message: string; status?: Claim["status"]; stediClaimId?: string; stediSubmissionId?: string; attachmentId?: string; event?: { kind: Claim["events"][number]["kind"]; summary: string } }>) {
    if (!claim) return;
    setPending(true);
    const result = await action();
    updateClaim(claim.id, applyClaimEvent(claim, result));
    setMessage(result.message);
    setPending(false);
  }

  const balance = Math.max(0, claimTotal(claim) - (claim.paymentAmount ?? 0));

  return (
    <main>
      {noteOpen ? <AccountNoteDialog notes={patient.accountNotes} onClose={() => setNoteOpen(false)} /> : null}
      <PageHeader
        kicker={claim.controlNumber}
        title={patientName(patient)}
        lede={`${claim.payerName} · ${formatDay(claim.dateOfService)} · Place of service ${claim.placeOfService}`}
        action={<StatusPill status={claim.status} />}
      />
      <p className="mt-4 text-sm text-muted">
        <Link href={`/admin/operations/patients/${patient.id}`} className="underline">Open chart</Link>
        {" · "}
        {money(claimTotal(claim))} billed
        {claim.paymentAmount != null ? ` · ${money(claim.paymentAmount)} paid` : ""}
        {claim.returnReason ? ` · ${claim.returnReason}` : ""}
      </p>
      {claim.holdReason ? <p className="mt-4 rounded-2xl border border-line bg-mist p-4 text-sm">Held: {claim.holdReason}</p> : null}
      {claim.denialReason ? (
        <p className="mt-4 rounded-2xl border border-line bg-red-50 p-4 text-sm text-emergency">
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
                {line.modifiers.length ? `-${line.modifiers.join("-")}` : ""} · {line.description}
              </span>
              <span className="text-muted">
                {line.diagnoses.join(", ") || "No diagnosis"} · {line.units} unit{line.units === 1 ? "" : "s"}
                {line.includeOnBill ? "" : " · left off the bill"}
              </span>
            </span>
            <span>{money(line.charge * line.units)}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6 flex flex-wrap gap-2">
        {claim.status === "draft" || claim.status === "held" || claim.status === "ready" ? (
          <Button asChild variant="secondary">
            <Link href={`/admin/operations/claims/new?patient=${patient.id}&claim=${claim.id}${claim.appointmentId ? `&visit=${claim.appointmentId}` : ""}`}>Edit charges</Link>
          </Button>
        ) : null}
        <Button type="button" disabled={pending || claim.status !== "ready"} onClick={() => run(() => submitProfessionalClaim(claimSubmissionInput(claim, patient, practice)))}>
          Submit test claim
        </Button>
        <Button type="button" variant="secondary" disabled={pending || !claim.stediClaimId} onClick={() => run(() => checkClaimStatus(claimSubmissionInput(claim, patient, practice)))}>
          Check status
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => run(() => attachDemoNote({ controlNumber: claim.controlNumber, idempotencyKey: claim.idempotencyKey || claim.id }))}>
          Upload test attachment
        </Button>
        <Button
          type="button"
          variant="secondary"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const paper = await requestPaperClaim();
              return { ...paper, event: { kind: "paper" as const, summary: paper.message } };
            })
          }
        >
          Paper claim
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/admin/operations/claims/${claim.id}/print`}>Print preview</Link>
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/admin/operations/claims/${claim.id}/statement`}>Patient statement</Link>
        </Button>
      </div>
      {message ? <p className="mt-4 max-w-2xl text-sm text-muted">{message}</p> : null}
      <p className="mt-3 max-w-2xl text-sm text-muted">Statement balance on this preview: {money(balance)}. It has not been mailed.</p>
      {claim.events.length ? (
        <ol className="mt-6 grid gap-2">
          {claim.events.map((event) => (
            <li key={event.id} className="rounded-xl border border-line bg-card px-4 py-3 text-sm">
              <span className="text-muted">{formatWhen(event.at)} · {event.kind}</span>
              <span className="mt-1 block">{event.summary}</span>
            </li>
          ))}
        </ol>
      ) : null}
      <div className="mt-8">
        <p className="text-sm font-medium">Record a status you learned outside Stedi</p>
        <p className="mt-1 text-sm text-muted">These buttons stay in the chart. They do not send anything.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {localStatuses.map((status) => (
            <Button key={status} type="button" variant={claim.status === status ? "primary" : "secondary"} onClick={() => updateClaim(claim.id, { status })}>
              {status}
            </Button>
          ))}
        </div>
      </div>
      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            updateClaim(claim.id, {
              appealDraft: appealLetter(claim, patientName(patient), practice.legalName),
              resolution: "appeal",
            })
          }
        >
          Draft appeal
        </Button>
      </div>
      {claim.appealDraft ? <pre className="mt-6 whitespace-pre-wrap rounded-2xl border border-line bg-card p-4 text-sm">{claim.appealDraft}</pre> : null}
    </main>
  );
}
