import type { Encounter } from "@/lib/encounters/types";

/** Draft pulled only from an Alignment Clinic scribe visit (not outside records). */
export type ClinicVisitClaimDraft = {
  encounterId: string;
  appointmentId: string;
  dateOfService: string;
  clinicalNote: string;
  diagnoses: { code: string; description: string }[];
  lines: {
    code: string;
    description: string;
    units: number;
    modifiers: string[];
    diagnoses: string[];
  }[];
  source: "approved" | "review";
};

export function clinicVisitHasClaimData(encounter: Encounter) {
  if (encounter.status !== "review" && encounter.status !== "approved") return false;
  if (!encounter.noteClinical.trim()) return false;
  if (!encounter.icd10.length || !encounter.billingCodes.length) return false;
  return true;
}

function nameKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Match a Visit Desk encounter to a chart — appointment link or exact visit label. */
export function encounterBelongsToPatient(
  encounter: Encounter,
  input: { patientName: string; appointmentIds: string[] },
) {
  if (encounter.appointmentId && input.appointmentIds.includes(encounter.appointmentId)) return true;
  const label = nameKey(encounter.patientLabel);
  const name = nameKey(input.patientName);
  return Boolean(label && name && label === name);
}

function lineDiagnosesForClaim(lineDiagnoses: string[], claimDiagnoses: string[]) {
  const allowed = new Set(claimDiagnoses);
  const linked = lineDiagnoses.filter((code) => allowed.has(code));
  if (linked.length) return linked.slice(0, 4);
  return claimDiagnoses.slice(0, 4);
}

/**
 * Build claim fields from a clinic visit.
 * Prefers approved codes when any are approved; otherwise uses the review suggestions.
 * Each procedure keeps only diagnosis pointers that exist on this visit’s claim diagnoses.
 */
export function claimDraftFromClinicVisit(encounter: Encounter): ClinicVisitClaimDraft | null {
  if (!clinicVisitHasClaimData(encounter)) return null;
  const preferApproved = encounter.status === "approved" || encounter.icd10.some((code) => code.approved);
  const diagnoses = encounter.icd10
    .filter((code) => (preferApproved ? code.approved : true))
    .map((code) => ({ code: code.code, description: code.description }));
  const diagnosisCodes = diagnoses.map((item) => item.code);
  if (!diagnoses.length) return null;
  const lines = encounter.billingCodes
    .filter((line) => (preferApproved ? line.approved : true))
    .map((line) => ({
      code: line.code,
      description: line.description,
      units: line.units || 1,
      modifiers: line.modifiers,
      diagnoses: lineDiagnosesForClaim(line.diagnoses, diagnosisCodes),
    }));
  if (!lines.length) return null;
  return {
    encounterId: encounter.id,
    appointmentId: encounter.appointmentId || "",
    dateOfService: encounter.createdAt.slice(0, 10),
    clinicalNote: encounter.noteClinical.trim(),
    diagnoses,
    lines,
    source: encounter.status === "approved" ? "approved" : "review",
  };
}

/** Claimable clinic visits for a patient, newest first (encounter + draft pairs). */
export function listClinicVisitsForPatient(
  encounters: Encounter[],
  input: { patientName: string; appointmentIds: string[] },
) {
  return encounters
    .filter((encounter) => encounterBelongsToPatient(encounter, input) && clinicVisitHasClaimData(encounter))
    .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    .flatMap((encounter) => {
      const draft = claimDraftFromClinicVisit(encounter);
      return draft ? [{ encounter, draft }] : [];
    });
}

/** Newest clinic visit that already has a note plus diagnosis and procedure codes. */
export function pickLatestClinicVisit(
  encounters: Encounter[],
  input: { patientName: string; appointmentIds: string[] },
) {
  return listClinicVisitsForPatient(encounters, input)[0]?.encounter ?? null;
}
