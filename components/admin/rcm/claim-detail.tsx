"use client";

import { useState } from "react";
import Link from "next/link";
import {
  checkClaimStatus,
  produceAndStoreClaimSubmissionProof,
  requestPaperClaim,
  submitProfessionalClaim,
} from "@/app/admin/stedi/actions";
import { Button } from "@/components/ui/button";
import { filingCodes } from "@/lib/rcm/claim-rules";
import { claimTotal, formatDay, formatWhen, money, patientName } from "@/lib/rcm/format";
import { claimSubmissionInput } from "@/lib/rcm/submit-input";
import type { Claim, ClaimStatus } from "@/lib/rcm/types";
import { AccountNoteDialog } from "@/components/admin/rcm/account-note";
import { ClaimPapers } from "@/components/admin/rcm/claim-files";
import { applyClaimEvent } from "@/components/admin/rcm/demo-billing";
import {
  SubmissionProofDialog,
  type SubmissionProofOffer,
} from "@/components/admin/rcm/submission-proof-dialog";
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
  const [proofOffer, setProofOffer] = useState<SubmissionProofOffer | null>(null);

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

  async function submitAndFileProof() {
    if (!claim || !patient) return;
    setPending(true);
    setMessage("");
    const result = await submitProfessionalClaim(claimSubmissionInput(claim, patient, practice));
    const next = applyClaimEvent(claim, result);
    setMessage(result.message);

    const alreadySent = "alreadySent" in result && Boolean(result.alreadySent);
    if (result.ok && !alreadySent && (result.stediClaimId || next.stediClaimId)) {
      const proof = await produceAndStoreClaimSubmissionProof({
        patientId: patient.id,
        claimId: claim.id,
        controlNumber: claim.controlNumber,
        stediClaimId: result.stediClaimId ?? next.stediClaimId,
        stediSubmissionId: result.stediSubmissionId ?? next.stediSubmissionId,
        patientName: patientName(patient),
        payerName: claim.payerName,
        dateOfService: formatDay(claim.dateOfService),
        billedAmount: money(claimTotal(claim)),
        practice: {
          legalName: practice.legalName,
          physicianName: practice.physicianName,
          npi: practice.npi,
          phone: practice.phone,
          address: practice.address,
        },
      });
      // One patch only — sequential updateClaim calls can stomp each other.
      const patch: Partial<Claim> = { ...next };
      if (proof.stediClaimId) patch.stediClaimId = proof.stediClaimId;
      if (proof.ok && proof.path && proof.fileName) {
        patch.attachments = [
          ...(next.attachments ?? claim.attachments),
          {
            path: proof.path,
            name: proof.fileName,
            contentType: "application/pdf",
            size: 0,
          },
        ];
        patch.events = [
          ...(next.events ?? claim.events),
          {
            id: crypto.randomUUID(),
            at: new Date().toISOString(),
            kind: "277ca",
            summary: proof.message,
          },
        ];
        setProofOffer({
          fileName: proof.fileName,
          url: proof.url || "",
          patientId: patient.id,
          message: proof.message,
        });
      } else if (!proof.ok) {
        setMessage(`${result.message} Proof PDF: ${proof.message}`);
      }
      updateClaim(claim.id, patch);
    } else {
      updateClaim(claim.id, next);
    }

    setPending(false);
  }

  const balance = Math.max(0, claimTotal(claim) - (claim.paymentAmount ?? 0));
  const payerType = filingCodes.find((option) => option.code === claim.filingCode)?.label ?? "Payer type not chosen";

  return (
    <main>
      {noteOpen ? <AccountNoteDialog notes={patient.accountNotes} onClose={() => setNoteOpen(false)} /> : null}
      {proofOffer ? <SubmissionProofDialog offer={proofOffer} onClose={() => setProofOffer(null)} /> : null}
      <PageHeader
        kicker={claim.controlNumber}
        title={patientName(patient)}
        lede={`${claim.payerName} · ${payerType} · ${formatDay(claim.dateOfService)} · Place of service ${claim.placeOfService}${claim.claimFrequencyCode && claim.claimFrequencyCode !== "1" ? ` · Frequency ${claim.claimFrequencyCode}` : ""}${claim.payerClaimControlNumber ? ` · Payer claim ${claim.payerClaimControlNumber}` : ""}`}
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
      <ClaimPapers patientId={patient.id} claim={claim} onChange={(patch) => updateClaim(claim.id, patch)} />
      {claim.status === "ready" && !claim.stediClaimId ? (
        <p className="mt-4 max-w-2xl rounded-2xl border border-line bg-mist p-4 text-sm">
          This claim is ready for bill and has not been sent. Submit claim is what files it with Stedi. The Stedi claims page stays empty until Stedi accepts it.
          {claim.lines.some((line) => line.includeOnBill && !(line.charge > 0))
            ? " A billed line is still $0, and Stedi will not take that. The fee schedule fills a Medicare price when the code has one."
            : ""}
        </p>
      ) : null}
      <div className="mt-6 flex flex-wrap gap-2">
        {claim.status === "draft" || claim.status === "held" || claim.status === "ready" ? (
          <Button asChild variant="secondary">
            <Link href={`/admin/operations/claims/new?patient=${patient.id}&claim=${claim.id}${claim.appointmentId ? `&visit=${claim.appointmentId}` : ""}`}>Edit charges</Link>
          </Button>
        ) : null}
        <Button type="button" disabled={pending || claim.status !== "ready"} onClick={() => void submitAndFileProof()}>
          Submit claim
        </Button>
        <Button type="button" variant="secondary" disabled={pending || !claim.stediClaimId} onClick={() => run(() => checkClaimStatus(claimSubmissionInput(claim, patient, practice)))}>
          Check status
        </Button>
        <Button asChild variant="secondary">
          <Link href={`/admin/operations/claims/${claim.id}/proof`}>View / refresh proof</Link>
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
