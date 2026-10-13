import type { VisitCode } from "@/lib/encounters/types";

export function applyCodeApproval(current: VisitCode[], approvedCodes: string[]) {
  const allowed = new Set(approvedCodes);
  const known = new Set(current.map((code) => code.code));
  for (const code of allowed) {
    if (!known.has(code)) return null;
  }
  return current.map((code) => ({ ...code, approved: allowed.has(code.code) }));
}

export function approvalStatus(noteApproved: boolean, icd10: VisitCode[], billingCodes: VisitCode[]) {
  const ready = noteApproved && icd10.some((code) => code.approved) && billingCodes.some((code) => code.approved);
  return ready ? ("approved" as const) : ("review" as const);
}

export function claimsHref(input: { encounterId: string; patientId?: string; appointmentId?: string }) {
  const params = new URLSearchParams({ encounter: input.encounterId });
  if (input.patientId) params.set("patient", input.patientId);
  if (input.appointmentId) params.set("visit", input.appointmentId);
  return `/admin/operations/claims/new?${params.toString()}`;
}
