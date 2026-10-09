"use client";

import { useState } from "react";
import { clearinghouseStatus, pullRemits, submitProfessionalClaim } from "@/app/admin/stedi/actions";
import { Button } from "@/components/ui/button";
import { claimSubmissionInput } from "@/lib/rcm/submit-input";
import type { Claim, ClaimEvent } from "@/lib/rcm/types";
import { useRcm } from "@/components/admin/rcm/store";

function eventFrom(result: { event?: { kind: ClaimEvent["kind"]; summary: string } }): ClaimEvent | null {
  if (!result.event) return null;
  return { id: crypto.randomUUID(), at: new Date().toISOString(), kind: result.event.kind, summary: result.event.summary };
}

export function DemoBilling() {
  const { claims, patients, practice, updateClaim, loadDemoDay } = useRcm();
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function submitDemos() {
    setPending(true);
    setMessage("");
    const status = await clearinghouseStatus();
    if (!status.signedIn) {
      setMessage("Sign in as staff before submitting demo claims.");
      setPending(false);
      return;
    }
    if (!status.configured) {
      setMessage("Add a Stedi Test API key as STEDI_API_KEY. The demo cases are loaded, and nothing was sent.");
      setPending(false);
      return;
    }
    const ready = claims.filter((claim) => claim.demoScenario && claim.status === "ready");
    if (!ready.length) {
      setMessage("Load a demo day first, or these demo claims were already sent.");
      setPending(false);
      return;
    }
    const notes: string[] = [];
    for (const claim of ready) {
      const patient = patients.find((item) => item.id === claim.patientId);
      if (!patient) continue;
      const result = await submitProfessionalClaim(claimSubmissionInput(claim, patient, practice));
      const event = eventFrom(result);
      updateClaim(claim.id, {
        status: result.status ?? claim.status,
        stediClaimId: result.stediClaimId ?? claim.stediClaimId,
        stediSubmissionId: result.stediSubmissionId ?? claim.stediSubmissionId,
        events: event ? [...claim.events, event] : claim.events,
        denialReason: result.status === "rejected" ? result.message : claim.denialReason,
      });
      notes.push(`${claim.controlNumber}: ${result.message}`);
    }
    setMessage(notes.join(" "));
    setPending(false);
  }

  async function trackRemits() {
    setPending(true);
    const targets = claims.filter((claim) => claim.demoScenario || claim.stediClaimId);
    const result = await pullRemits(targets.map((claim) => claim.controlNumber));
    if (!result.ok) {
      setMessage(result.message);
      setPending(false);
      return;
    }
    for (const remit of result.remits) {
      const claim = claims.find((item) => item.controlNumber === remit.controlNumber);
      if (!claim) continue;
      const status = remit.outcome === "denied" ? "denied" : remit.outcome === "paid" || remit.outcome === "partial" ? "paid" : claim.status;
      const event: ClaimEvent = {
        id: crypto.randomUUID(),
        at: new Date().toISOString(),
        kind: "835",
        summary: `${remit.outcome} remit${remit.reasonCode ? `, reason ${remit.reasonCode}` : ""}.`,
      };
      updateClaim(claim.id, {
        status,
        remitOutcome: remit.outcome,
        paymentAmount: remit.paid,
        patientResponsibility: remit.patientResponsibility,
        adjustmentAmount: remit.adjustment,
        carc: remit.reasonCode || claim.carc,
        denialReason: remit.outcome === "denied" ? "Test payer denied the claim." : claim.denialReason,
        events: [...claim.events, event],
      });
    }
    setMessage(result.message);
    setPending(false);
  }

  return (
    <div className="grid justify-items-end gap-2">
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="secondary" onClick={() => { loadDemoDay(); setMessage("Demo day loaded. Nothing was sent."); }} disabled={pending}>
          Load demo day
        </Button>
        <Button type="button" onClick={submitDemos} disabled={pending}>
          Submit demo claims
        </Button>
        <Button type="button" variant="secondary" onClick={trackRemits} disabled={pending}>
          Check remits
        </Button>
      </div>
      {message ? <p className="max-w-xl text-right text-sm text-muted">{message}</p> : null}
    </div>
  );
}

export function applyClaimEvent(claim: Claim, result: { status?: Claim["status"]; stediClaimId?: string; stediSubmissionId?: string; attachmentId?: string; message: string; event?: { kind: ClaimEvent["kind"]; summary: string } }) {
  const event = eventFrom(result);
  return {
    status: result.status ?? claim.status,
    stediClaimId: result.stediClaimId ?? claim.stediClaimId,
    stediSubmissionId: result.stediSubmissionId ?? claim.stediSubmissionId,
    attachmentId: result.attachmentId ?? claim.attachmentId,
    events: event ? [...claim.events, event] : claim.events,
    denialReason: result.status === "rejected" ? result.message : claim.denialReason,
  };
}
