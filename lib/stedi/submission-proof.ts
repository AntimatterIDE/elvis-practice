/** Official Stedi claim submission / 277CA acknowledgment proof helpers. */

export type SubmissionProofEvent = {
  kind: "submission" | "acknowledgment" | "payment" | "other";
  at: string;
  title: string;
  detail: string;
  reportedBy?: string;
  status?: string;
  sourceName?: string;
  raw: Record<string, unknown>;
};

export type SubmissionProofReport = {
  stediClaimId: string;
  patientControlNumber: string;
  status?: string;
  events: SubmissionProofEvent[];
  fetchedAt: string;
};

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

function text(value: unknown) {
  return typeof value === "string" && value.trim() ? value.trim() : "";
}

/** Stedi sometimes returns "RECEIVED (RECEIVED)"; collapse exact duplicates for proof copy. */
export function cleanAckStatus(value: unknown) {
  const status = text(value);
  if (!status) return "";
  const match = status.match(/^(.+?)\s*\(\1\)$/i);
  return match ? match[1].trim() : status;
}

/** Patient control number Stedi receives on the 837 (CLM01). */
export function stediPatientControlNumber(controlNumber: string) {
  return controlNumber.replace(/[^A-Za-z0-9]/g, "").slice(0, 20);
}

export function pickStediClaimId(body: unknown): string {
  const record = asRecord(body);
  if (!record) return "";
  if (typeof record.claimId === "string" && record.claimId.trim()) return record.claimId.trim();
  const reference = asRecord(record.claimReference);
  if (reference && typeof reference.correlationId === "string" && reference.correlationId.trim()) {
    return reference.correlationId.trim();
  }
  return "";
}

export function pickStediSubmissionId(body: unknown): string {
  const record = asRecord(body);
  if (!record) return "";
  if (typeof record.submissionId === "string" && record.submissionId.trim()) return record.submissionId.trim();
  const reference = asRecord(record.claimReference);
  if (reference && typeof reference.rhclaimNumber === "string" && reference.rhclaimNumber.trim()) {
    return reference.rhclaimNumber.trim();
  }
  return "";
}

/** Prefer Stedi lifecycle claim ids (clm_…) over older correlation-only / UUID values. */
export function looksLikeStediLifecycleClaimId(value: string | undefined) {
  if (!value) return false;
  return /^clm_/i.test(value.trim());
}

export function summarizeTimelineItems(items: unknown[]): SubmissionProofEvent[] {
  const events: SubmissionProofEvent[] = [];
  for (const item of items) {
    const row = asRecord(item);
    if (!row) continue;

    const acknowledgment = asRecord(row.claimAcknowledgment);
    if (acknowledgment) {
      const status = cleanAckStatus(acknowledgment.status);
      const reportedBy = text(acknowledgment.reportedBy);
      const sourceName = text(acknowledgment.sourceName);
      const at = text(acknowledgment.processedAt) || new Date().toISOString();
      const who =
        reportedBy === "PAYER"
          ? sourceName || "Payer"
          : reportedBy === "STEDI" || reportedBy === "CLEARINGHOUSE"
            ? reportedBy === "STEDI"
              ? "Stedi"
              : "Clearinghouse"
            : reportedBy || sourceName || "Acknowledgment";
      events.push({
        kind: "acknowledgment",
        at,
        title: status ? `Status: ${status}` : "Claim acknowledgment received",
        detail: text(acknowledgment.id) ? `Acknowledgment id: ${acknowledgment.id}` : who,
        reportedBy,
        status,
        sourceName: sourceName || (reportedBy === "PAYER" ? "" : who),
        raw: acknowledgment,
      });
      continue;
    }

    const submission =
      asRecord(row.professionalClaimSubmission) ||
      asRecord(row.institutionalClaimSubmission) ||
      asRecord(row.dentalClaimSubmission) ||
      asRecord(row.claimSubmission);
    if (submission) {
      const at = text(submission.processedAt) || new Date().toISOString();
      const charge = text(submission.totalClaimChargeAmount);
      const payer = text(submission.stediPayerId);
      events.push({
        kind: "submission",
        at,
        title: "Professional claim submitted to Stedi",
        detail: [
          text(submission.patientControlNumber) ? `Control ${submission.patientControlNumber}` : "",
          charge ? `Billed $${charge}` : "",
          payer ? `Payer id ${payer}` : "",
          text(submission.id) ? `Submission id: ${submission.id}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        raw: submission,
      });
      continue;
    }

    const payment = asRecord(row.claimPaymentInformation);
    if (payment) {
      const at = text(payment.processedAt) || new Date().toISOString();
      events.push({
        kind: "payment",
        at,
        title: text(payment.statusCode) || "ERA payment information",
        detail: [
          text(payment.claimPaymentAmount) ? `paid $${payment.claimPaymentAmount}` : "",
          text(payment.totalClaimChargeAmount) ? `billed $${payment.totalClaimChargeAmount}` : "",
          text(payment.checkOrEftTraceNumber) ? `trace ${payment.checkOrEftTraceNumber}` : "",
        ]
          .filter(Boolean)
          .join(" · "),
        status: text(payment.statusCode),
        raw: payment,
      });
      continue;
    }

    // Skip empty envelopes so junk/null-coerced rows never pollute official proof.
    const keys = Object.keys(row);
    if (keys.length === 0) continue;

    events.push({
      kind: "other",
      at: new Date().toISOString(),
      title: "Claim timeline entry",
      detail: keys.join(", ") || "Unrecognized timeline entry",
      raw: row,
    });
  }
  return events;
}

export function buildSubmissionProofReport(input: {
  stediClaimId: string;
  patientControlNumber: string;
  status?: string;
  items: unknown[];
}): SubmissionProofReport {
  return {
    stediClaimId: input.stediClaimId,
    patientControlNumber: input.patientControlNumber,
    status: input.status,
    events: summarizeTimelineItems(input.items),
    fetchedAt: new Date().toISOString(),
  };
}
