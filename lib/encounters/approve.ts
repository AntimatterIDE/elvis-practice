import { checkDiagnosis, checkProcedure, modifierProblem, type CodeLibrary } from "@/lib/coding/codes";
import { icd10Code } from "@/lib/coding/sources";
import type { Encounter, VisitCode, VisitLine } from "@/lib/encounters/types";
import { diagnosisLimit, pointerLimit, serviceLineLimit } from "@/lib/rcm/claim-rules";

export type LineChoice = { code: string; units: number; modifiers: string[]; diagnoses: string[] };

export type ReviewedCodes = { ok: true; icd10: VisitCode[]; billingCodes: VisitLine[] } | { ok: false; error: string };

export function reviewCodes(library: CodeLibrary, input: { icd10: string[]; billingCodes: LineChoice[] }): ReviewedCodes {
  const icd10: VisitCode[] = [];
  for (const value of input.icd10) {
    const checked = checkDiagnosis(library, value);
    if (!checked.ok) return { ok: false, error: checked.message };
    if (!icd10.some((code) => code.code === checked.code)) {
      icd10.push({ code: checked.code, description: checked.description, approved: true });
    }
  }
  if (icd10.length > diagnosisLimit) {
    return { ok: false, error: `A claim can carry at most ${diagnosisLimit} diagnoses. Keep the ${diagnosisLimit} that support the procedures.` };
  }
  if (input.billingCodes.length > serviceLineLimit) {
    return { ok: false, error: `A claim can carry at most ${serviceLineLimit} lines.` };
  }
  const visitCodes = new Set(icd10.map((code) => code.code));
  const billingCodes: VisitLine[] = [];
  for (const [index, line] of input.billingCodes.entries()) {
    const label = `Line ${index + 1}`;
    const checked = checkProcedure(library, line.code);
    if (!checked.ok) return { ok: false, error: `${label}: ${checked.message}` };
    if (!Number.isInteger(line.units) || line.units < 1 || line.units > 999) {
      return { ok: false, error: `${label}: units must be a whole number from 1 to 999.` };
    }
    const modifiers = line.modifiers.map((modifier) => modifier.trim().toUpperCase()).filter(Boolean);
    if (modifiers.length > 4) return { ok: false, error: `${label}: a line takes at most 4 modifiers.` };
    const badModifier = modifiers.map(modifierProblem).find(Boolean);
    if (badModifier) return { ok: false, error: `${label}: ${badModifier}` };
    if (new Set(modifiers).size !== modifiers.length) return { ok: false, error: `${label}: a modifier is listed twice.` };
    const diagnoses = [...new Set(line.diagnoses.map(icd10Code).filter(Boolean))];
    if (!diagnoses.length) return { ok: false, error: `${label}: link at least one diagnosis.` };
    if (diagnoses.length > pointerLimit) {
      return { ok: false, error: `${label}: a line can point to at most ${pointerLimit} diagnoses.` };
    }
    const unlisted = diagnoses.find((code) => !visitCodes.has(code));
    if (unlisted) return { ok: false, error: `${label}: ${unlisted} is not one of this visit's diagnoses.` };
    billingCodes.push({ code: checked.code, description: checked.description, approved: true, units: line.units, modifiers, diagnoses });
  }
  return { ok: true, icd10, billingCodes };
}

// Visits approved before lines carried their own diagnoses point every line at
// all approved diagnoses, which is what the claim form used to do.
export function claimLinesFromEncounter(encounter: Pick<Encounter, "icd10" | "billingCodes">) {
  const approved = encounter.icd10.filter((code) => code.approved).map((code) => code.code);
  return encounter.billingCodes
    .filter((line) => line.approved)
    .map((line) => ({
      code: line.code,
      description: line.description,
      units: line.units,
      modifiers: line.modifiers,
      diagnoses: line.diagnoses.length ? line.diagnoses : approved,
    }));
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
