import type { OnboardDraft } from "@/lib/ocr/onboard-draft";
import { applyOnboardDocumentHints, patientFromOnboardDraft } from "@/lib/ocr/onboard-draft";
import type { Patient } from "@/lib/rcm/types";
import { emptyInjuryCase } from "@/lib/rcm/chart";

export function normalizePersonKey(firstName: string, lastName: string, dateOfBirth: string) {
  const first = firstName.trim().toLowerCase().replace(/\s+/g, " ");
  const last = lastName.trim().toLowerCase().replace(/\s+/g, " ");
  const dob = dateOfBirth.trim().slice(0, 10);
  if (!first || !last || !/^\d{4}-\d{2}-\d{2}$/.test(dob)) return "";
  return `${first}|${last}|${dob}`;
}

export function normalizeHashes(hashes: string[] | undefined | null) {
  return [...new Set((hashes ?? []).map((item) => item.trim().toLowerCase()).filter((item) => /^[a-f0-9]{64}$/.test(item)))];
}

export type OcrImportMatch = {
  patient: Patient;
  reason: "fingerprint" | "name_dob";
  matchedHashes: string[];
};

/** Prefer fingerprint match; else exact first+last+DOB. */
export function findOcrImportMatch(
  patients: Patient[],
  input: { firstName: string; lastName: string; dateOfBirth: string; fingerprints: string[] },
): OcrImportMatch | null {
  const fingerprints = normalizeHashes(input.fingerprints);
  if (fingerprints.length) {
    const hit = patients.find((patient) => {
      const known = new Set(normalizeHashes(patient.ocrImportHashes));
      return fingerprints.some((hash) => known.has(hash));
    });
    if (hit) {
      return {
        patient: hit,
        reason: "fingerprint",
        matchedHashes: fingerprints.filter((hash) => normalizeHashes(hit.ocrImportHashes).includes(hash)),
      };
    }
  }
  const key = normalizePersonKey(input.firstName, input.lastName, input.dateOfBirth);
  if (!key) return null;
  const person = patients.find(
    (patient) => normalizePersonKey(patient.firstName, patient.lastName, patient.dateOfBirth) === key,
  );
  if (!person) return null;
  return { patient: person, reason: "name_dob", matchedHashes: [] };
}

function mergeUniqueByName<T extends { id: string; name?: string; substance?: string }>(
  existing: T[],
  incoming: T[],
  keyOf: (item: T) => string,
): T[] {
  const seen = new Set(existing.map(keyOf).filter(Boolean));
  const next = existing.slice();
  for (const item of incoming) {
    const key = keyOf(item);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    next.push(item);
  }
  return next;
}

/** Merge draft into an existing chart; union OCR fingerprints; never invent tradingPartnerId. */
export function mergeOnboardIntoPatient(
  existing: Patient,
  draft: OnboardDraft,
  fingerprints: string[],
): Patient {
  const built = patientFromOnboardDraft(draft, existing.id);
  const hashes = normalizeHashes([...(existing.ocrImportHashes ?? []), ...fingerprints]);
  const note = draft.sourceSummary || "Outside records OCR import";
  const documents = applyOnboardDocumentHints(existing.documents, draft.documentHints, note);

  const fill = (current: string, next: string) => (current.trim() ? current : next.trim());

  const cases =
    draft.injuryCase && Object.values(draft.injuryCase).some(Boolean)
      ? existing.cases.length
        ? existing.cases
        : [{ ...emptyInjuryCase(`case_${existing.id}`), ...draft.injuryCase, attorneyAddress: "" }]
      : existing.cases;

  return {
    ...existing,
    firstName: fill(existing.firstName, draft.firstName) || existing.firstName,
    lastName: fill(existing.lastName, draft.lastName) || existing.lastName,
    dateOfBirth: fill(existing.dateOfBirth, draft.dateOfBirth) || existing.dateOfBirth,
    sex: existing.sex !== "unknown" ? existing.sex : draft.sex,
    phone: fill(existing.phone, draft.phone),
    email: fill(existing.email, draft.email),
    address: fill(existing.address, draft.address),
    city: fill(existing.city, draft.city),
    state: fill(existing.state, draft.state),
    postalCode: fill(existing.postalCode, draft.postalCode),
    payerName: existing.payerName && existing.payerName !== "Self-pay" ? existing.payerName : draft.payerName || existing.payerName,
    memberId: fill(existing.memberId, draft.memberId),
    medicalHistory: fill(existing.medicalHistory, [draft.reasonForVisit, draft.medicalHistory].filter(Boolean).join("\n\n")),
    problems: mergeUniqueByName(existing.problems, built.problems, (item) => `${item.name}|${item.icd}`.toLowerCase()),
    medications: mergeUniqueByName(existing.medications, built.medications, (item) => item.name.toLowerCase()),
    allergies: mergeUniqueByName(existing.allergies, built.allergies, (item) => (item.substance || "").toLowerCase()),
    allergiesReviewed: existing.allergiesReviewed || built.allergiesReviewed,
    documents,
    cases,
    ocrImportHashes: hashes,
    accountNotes: [
      ...existing.accountNotes,
      ...(draft.warnings.length
        ? [
            {
              id: `id_${crypto.randomUUID().slice(0, 8)}`,
              body: `OCR re-import (${new Date().toISOString().slice(0, 10)}): ${draft.warnings.join(" ")}`,
              audience: "front_desk" as const,
              createdAt: new Date().toISOString(),
              resolved: false,
            },
          ]
        : []),
    ].slice(-40),
  };
}

export function patientFromOnboardDraftWithHashes(
  draft: OnboardDraft,
  id: string,
  fingerprints: string[],
): Patient {
  const patient = patientFromOnboardDraft(draft, id);
  return { ...patient, ocrImportHashes: normalizeHashes(fingerprints) };
}
