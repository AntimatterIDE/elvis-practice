"use server";

import { getStaffSession } from "@/lib/supabase/session";
import { CLAIMS, CORE, ELIGIBILITY, ENROLLMENTS, HEALTHCARE, PAYERS, isStediConfigured, publicStediMessage, stediFetch } from "@/lib/stedi/client";
import { readRemits, summarizeEligibility } from "@/lib/stedi/parse";
import { buildProfessionalClaim, compactDate, type ClaimSubmissionInput } from "@/lib/stedi/payload";
import { recordClearinghouse } from "@/lib/stedi/record";

export type StediEvent = { kind: "submit" | "277ca" | "276" | "835" | "attachment" | "paper" | "error"; summary: string };

async function staffGate() {
  const session = await getStaffSession();
  if (!session) return "Sign in as staff before using the clearinghouse.";
  if (!isStediConfigured()) return "Add a Stedi Test API key as STEDI_API_KEY. Nothing was sent.";
  return null;
}

export async function clearinghouseStatus() {
  const session = await getStaffSession();
  return { signedIn: Boolean(session), configured: isStediConfigured() };
}

function shiftDay(value: string, days: number) {
  const date = new Date(`${value.slice(0, 10)}T12:00:00`);
  date.setDate(date.getDate() + days);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}${month}${day}`;
}

export async function checkEligibility(input: {
  payerId: string;
  payerName: string;
  memberId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  npi: string;
}) {
  const blocked = await staffGate();
  if (blocked) return { ok: false, message: blocked, active: null, copay: null, coinsurance: null, deductibleRemaining: null, summary: blocked };
  const npi = /^\d{10}$/.test(input.npi) ? input.npi : "1999999984";
  const response = await stediFetch(`${ELIGIBILITY}/eligibility-check`, {
    method: "POST",
    body: JSON.stringify({
      payerId: input.payerId,
      provider: { name: { organization: "The Alignment Clinic" }, npi },
      subscriber: {
        name: { person: { firstName: input.firstName, lastName: input.lastName } },
        memberId: input.memberId,
        dateOfBirth: input.dateOfBirth,
      },
      encounter: { services: [{ value: "30", system: "STC" }] },
    }),
  });
  if (!response.ok) {
    const message = publicStediMessage(response.body, response.status);
    return { ok: false, message, active: null, copay: null, coinsurance: null, deductibleRemaining: null, summary: message };
  }
  const summary = summarizeEligibility(response.body);
  return { ok: true, message: summary.summary, ...summary, source: "stedi" as const };
}

export async function discoverCoverage(input: {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  npi: string;
  beginningDateOfService: string;
  endDateOfService: string;
}) {
  const blocked = await staffGate();
  if (blocked) return { ok: false, message: blocked, payers: [] as string[] };
  const npi = /^\d{10}$/.test(input.npi) ? input.npi : "1999999984";
  const response = await stediFetch(`${HEALTHCARE}/insurance-discovery/check/v1`, {
    method: "POST",
    body: JSON.stringify({
      provider: { npi },
      encounter: {
        beginningDateOfService: compactDate(input.beginningDateOfService),
        endDateOfService: compactDate(input.endDateOfService),
      },
      subscriber: {
        dateOfBirth: compactDate(input.dateOfBirth),
        firstName: input.firstName,
        lastName: input.lastName,
        address: {
          address1: input.address,
          city: input.city,
          state: input.state,
          postalCode: input.postalCode,
        },
      },
    }),
  });
  let body = response.body;
  let status = response.status;
  const pending = asRecord(body);
  if (status === 202 && typeof pending?.discoveryId === "string") {
    const follow = await stediFetch(`${HEALTHCARE}/insurance-discovery/check/v1/${pending.discoveryId}`);
    body = follow.body;
    status = follow.status;
  }
  if (status >= 400 || !body) {
    return { ok: false, message: publicStediMessage(body, status), payers: [] as string[] };
  }
  const record = asRecord(body);
  const items = Array.isArray(record?.items) ? record.items : [];
  const payers = items
    .map((item) => {
      const row = asRecord(item);
      const payer = asRecord(row?.payer);
      return typeof payer?.name === "string" ? payer.name : "";
    })
    .filter(Boolean);
  const found = typeof record?.coveragesFound === "number" ? record.coveragesFound : payers.length;
  return {
    ok: true,
    message: found === 0 ? "Stedi finished the search and did not return coverage." : `Stedi returned ${found} possible coverage match${found === 1 ? "" : "es"}.`,
    payers,
  };
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : null;
}

export async function submitProfessionalClaim(input: ClaimSubmissionInput) {
  const blocked = await staffGate();
  if (blocked) return { ok: false, message: blocked, event: { kind: "error" as const, summary: blocked } };
  if (input.status === "held") {
    const message = "A held claim cannot be submitted. Clear the hold first.";
    return { ok: false, message, event: { kind: "error" as const, summary: message } };
  }
  if (input.status !== "ready" && !(input.status === "submitted" && !input.stediClaimId)) {
    const message = "Ready for Bill does not send a claim. Move it to review, then submit it.";
    return { ok: false, message, event: { kind: "error" as const, summary: message } };
  }
  if (input.stediClaimId) {
    return { ok: true, message: "This claim was already sent.", stediClaimId: input.stediClaimId, alreadySent: true };
  }
  if (!input.tradingPartnerId) {
    const message = "This claim has no Stedi payer id. Demo claims use the test payer STEDI.";
    return { ok: false, message, event: { kind: "error" as const, summary: message } };
  }
  const built = buildProfessionalClaim(input);
  if (!built.body.claimInformation.serviceLines.length) {
    const message = "Include at least one line on the bill before submitting.";
    return { ok: false, message, event: { kind: "error" as const, summary: message } };
  }
  const response = await stediFetch(`${HEALTHCARE}/change/medicalnetwork/professionalclaims/v3/submission`, {
    method: "POST",
    headers: { "Idempotency-Key": input.idempotencyKey },
    body: JSON.stringify(built.body),
  });
  const record = asRecord(response.body);
  const errors = Array.isArray(record?.errors) ? record.errors : [];
  const rejected = errors.length > 0 || record?.status === "ERROR" || !response.ok;
  const stediClaimId = typeof record?.claimReference === "object" && record.claimReference && typeof (record.claimReference as { correlationId?: string }).correlationId === "string"
    ? (record.claimReference as { correlationId: string }).correlationId
    : typeof record?.controlNumber === "string"
      ? record.controlNumber
      : undefined;
  const message = rejected ? publicStediMessage(response.body, response.status) : "Stedi accepted the test claim. That is not payer payment.";
  const providerNote = built.usedTestProvider ? " Practice NPI or tax id was blank, so the test provider values from Stedi’s docs were used." : "";
  await recordClearinghouse({
    controlNumber: input.controlNumber,
    idempotencyKey: `submit:${input.idempotencyKey}`,
    stediTransactionId: typeof record?.controlNumber === "string" ? record.controlNumber : undefined,
    stediClaimId,
    kind: "837P",
    status: rejected ? "rejected" : "submitted",
    snapshot: {
      payerId: input.tradingPartnerId,
      charge: built.body.claimInformation.claimChargeAmount,
      cpts: built.body.claimInformation.serviceLines.map((line) => line.professionalService.procedureCode),
    },
  });
  return {
    ok: !rejected,
    message: `${message}${providerNote}`,
    status: rejected ? ("rejected" as const) : ("submitted" as const),
    stediClaimId,
    stediSubmissionId: typeof record?.claimReference === "object" && record.claimReference ? (record.claimReference as { rhclaimNumber?: string }).rhclaimNumber : undefined,
    event: { kind: rejected ? "error" as const : "277ca" as const, summary: `${message}${providerNote}` },
    stored: true,
  };
}

export async function checkClaimStatus(input: ClaimSubmissionInput) {
  const blocked = await staffGate();
  if (blocked) return { ok: false, message: blocked, event: { kind: "error" as const, summary: blocked } };
  const billing = buildProfessionalClaim(input);
  const response = await stediFetch(`${HEALTHCARE}/change/medicalnetwork/claimstatus/v2`, {
    method: "POST",
    body: JSON.stringify({
      tradingPartnerServiceId: input.tradingPartnerId || "STEDI",
      providers: [{ npi: billing.body.billing.npi, organizationName: billing.body.billing.organizationName, providerType: "BillingProvider" }],
      subscriber: {
        firstName: input.patient.firstName,
        lastName: input.patient.lastName,
        dateOfBirth: compactDate(input.patient.dateOfBirth),
        gender: billing.body.subscriber.gender,
        memberId: input.patient.memberId,
      },
      encounter: {
        beginningDateOfService: shiftDay(input.dateOfService, -7),
        endDateOfService: shiftDay(input.dateOfService, 7),
      },
    }),
  });
  const message = response.ok
    ? "Claim status returned. A test claim often has no payer status yet. Use the acknowledgment and the remit to track the demo."
    : publicStediMessage(response.body, response.status);
  return { ok: response.ok, message, event: { kind: "276" as const, summary: message } };
}

export async function attachDemoNote(input: { controlNumber: string; idempotencyKey: string }) {
  const blocked = await staffGate();
  if (blocked) return { ok: false, message: blocked, event: { kind: "error" as const, summary: blocked } };
  const created = await stediFetch(`${CLAIMS}/claim-attachments/file`, {
    method: "POST",
    body: JSON.stringify({ contentType: "text/plain" }),
  });
  const record = asRecord(created.body);
  const uploadUrl = typeof record?.uploadUrl === "string" ? record.uploadUrl : "";
  const attachmentId = typeof record?.attachmentId === "string" ? record.attachmentId : "";
  if (!created.ok || !uploadUrl || !attachmentId) {
    const message = publicStediMessage(created.body, created.status);
    return { ok: false, message, event: { kind: "error" as const, summary: message } };
  }
  const uploaded = await fetch(uploadUrl, {
    method: "PUT",
    headers: { "Content-Type": "text/plain" },
    body: "Demo note for a test claim. Not a clinical record.",
  });
  if (!uploaded.ok) {
    const message = "Stedi created an attachment id, but the file upload was refused.";
    return { ok: false, message, attachmentId, event: { kind: "error" as const, summary: message } };
  }
  await recordClearinghouse({
    controlNumber: input.controlNumber,
    idempotencyKey: `275:${input.idempotencyKey}:${attachmentId}`,
    stediTransactionId: attachmentId,
    kind: "275",
    status: "uploaded",
    snapshot: { attachment: "text" },
  });
  return {
    ok: true,
    message: "Test attachment uploaded. It is not mailed and it is not a clinical note.",
    attachmentId,
    event: { kind: "attachment" as const, summary: "Test attachment uploaded." },
  };
}

export async function pullRemits(controlNumbers: string[]) {
  const blocked = await staffGate();
  if (blocked) return { ok: false, message: blocked, remits: [] as ReturnType<typeof readRemits> };
  const polled = await stediFetch(`${CORE}/polling/transactions`);
  if (!polled.ok) {
    return { ok: false, message: publicStediMessage(polled.body, polled.status), remits: [] as ReturnType<typeof readRemits> };
  }
  const record = asRecord(polled.body);
  const items = Array.isArray(record?.items) ? record.items : Array.isArray(polled.body) ? polled.body : [];
  const matches = [];
  for (const item of items) {
    const row = asRecord(item);
    const transactionId = typeof row?.transactionId === "string" ? row.transactionId : "";
    if (!transactionId) continue;
    const report = await stediFetch(`${HEALTHCARE}/change/medicalnetwork/reports/v2/${transactionId}/835`);
    const output = report.ok ? report : await stediFetch(`${CORE}/transactions/${transactionId}/output`);
    matches.push(...readRemits(output.body));
  }
  const wanted = new Set(controlNumbers);
  const remits = matches.filter((remit) => wanted.has(remit.controlNumber));
  return {
    ok: true,
    message: remits.length ? `Matched ${remits.length} test remit${remits.length === 1 ? "" : "s"}.` : "No matching remit is waiting. Test remits need the Stedi test payer, and the billing provider enrolled for claim payment.",
    remits,
  };
}

function supportLabel(value: unknown) {
  return typeof value === "string" ? value.replaceAll("_", " ").toLowerCase() : "unknown";
}

function payerFrom(item: unknown) {
  const record = asRecord(item);
  const payer = asRecord(record?.payer) ?? record;
  if (!payer) return null;
  const support = asRecord(payer.transactionSupport);
  const name = typeof payer.displayName === "string" ? payer.displayName : "";
  const primaryPayerId = typeof payer.primaryPayerId === "string" ? payer.primaryPayerId : "";
  if (!name && !primaryPayerId) return null;
  return {
    name: name || primaryPayerId,
    primaryPayerId,
    stediId: typeof payer.stediId === "string" ? payer.stediId : "",
    eligibility: supportLabel(support?.eligibilityCheck),
    claims: supportLabel(support?.professionalClaimSubmission),
    era: supportLabel(support?.claimPayment),
    eft: supportLabel(support?.electronicFundsTransfer),
    cob: supportLabel(support?.coordinationOfBenefits),
  };
}

export async function searchPayers(query: string) {
  const blocked = await staffGate();
  if (blocked) return { ok: false, message: blocked, payers: [] as ReturnType<typeof payerFrom>[] };
  const term = query.trim();
  if (term.length < 2) return { ok: false, message: "Enter at least two letters of a payer name.", payers: [] };
  const response = await stediFetch(`${PAYERS}/payers/search?query=${encodeURIComponent(term)}&pageSize=8`);
  if (!response.ok) return { ok: false, message: publicStediMessage(response.body, response.status), payers: [] };
  const record = asRecord(response.body);
  const items = Array.isArray(record?.items) ? record.items : [];
  return { ok: true, message: items.length ? `Found ${items.length} payer matches.` : "No payers matched.", payers: items.map(payerFrom).filter((payer) => payer !== null) };
}

export async function listEnrollments() {
  const blocked = await staffGate();
  if (blocked) return { ok: false, message: blocked, enrollments: [] as { id: string; status: string; payer: string; npi: string; transactions: string }[] };
  const response = await stediFetch(`${ENROLLMENTS}/enrollments?pageSize=20`);
  if (!response.ok) {
    return { ok: false, message: publicStediMessage(response.body, response.status), enrollments: [] };
  }
  const record = asRecord(response.body);
  const items = Array.isArray(record?.items) ? record.items : [];
  const enrollments = items.map((item) => {
    const row = asRecord(item);
    const payer = asRecord(row?.payer);
    const provider = asRecord(row?.provider);
    const transactions = asRecord(row?.transactions);
    const kinds = transactions
      ? Object.entries(transactions)
          .filter(([, value]) => asRecord(value)?.enroll === true)
          .map(([key]) => key)
      : [];
    return {
      id: typeof row?.id === "string" ? row.id : "",
      status: typeof row?.status === "string" ? row.status : "unknown",
      payer: typeof payer?.name === "string" ? payer.name : typeof payer?.stediPayerId === "string" ? payer.stediPayerId : "Payer",
      npi: typeof provider?.npi === "string" ? provider.npi : "",
      transactions: kinds.join(", ") || "none listed",
    };
  });
  return {
    ok: true,
    message: enrollments.length ? `${enrollments.length} enrollment${enrollments.length === 1 ? "" : "s"} on this Stedi account.` : "No enrollments yet. EFT and ERA enrollment are completed in the Stedi portal. This desk does not submit them.",
    enrollments,
  };
}

export async function checkCoordination(input: {
  payerId: string;
  memberId: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  npi: string;
  dateOfService: string;
}) {
  const blocked = await staffGate();
  if (blocked) return { ok: false, message: blocked };
  if (!input.payerId) return { ok: false, message: "This patient has no Stedi payer id." };
  const npi = /^\d{10}$/.test(input.npi) ? input.npi : "1999999984";
  const response = await stediFetch(`${HEALTHCARE}/coordination-of-benefits`, {
    method: "POST",
    body: JSON.stringify({
      tradingPartnerServiceId: input.payerId,
      provider: { organizationName: "The Alignment Clinic", npi },
      subscriber: {
        firstName: input.firstName,
        lastName: input.lastName,
        dateOfBirth: input.dateOfBirth,
        memberId: input.memberId,
      },
      encounter: { dateOfService: input.dateOfService, serviceTypeCode: "30" },
    }),
  });
  if (!response.ok) return { ok: false, message: publicStediMessage(response.body, response.status) };
  const cob = asRecord(asRecord(response.body)?.coordinationOfBenefits);
  const overlap = cob?.coverageOverlap === true;
  const primacy = cob?.primacyDetermined === true;
  return {
    ok: true,
    message: overlap
      ? `Coverage overlap found. Primacy ${primacy ? "was" : "was not"} determined. This is not a payment.`
      : "No coverage overlap was returned. This is not a payment.",
  };
}

export async function requestPaperClaim() {
  const blocked = await staffGate();
  if (blocked) return { ok: false, message: blocked, mailed: false };
  return {
    ok: true,
    mailed: false,
    message: "This preview was not mailed. Stedi test mode does not print a CMS-1500 from this desk.",
  };
}
