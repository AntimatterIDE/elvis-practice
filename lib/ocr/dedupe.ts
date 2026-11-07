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
  const dob = input.dateOfBirth.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dob)) return null;
  const key = normalizePersonKey(input.firstName, input.lastName, dob);
  const swapped = normalizePersonKey(input.lastName, input.firstName, dob);
  const tokens = new Set(
    `${input.firstName} ${input.lastName}`
      .toLowerCase()
      .split(/[^a-z]+/)
      .filter((part) => part.length > 1),
  );
  const person =
    patients.find((patient) => normalizePersonKey(patient.firstName, patient.lastName, patient.dateOfBirth) === key) ||
    patients.find((patient) => normalizePersonKey(patient.firstName, patient.lastName, patient.dateOfBirth) === swapped) ||
    patients.find((patient) => {
      if (patient.dateOfBirth.slice(0, 10) !== dob) return false;
      const existing = new Set(
        `${patient.firstName} ${patient.lastName}`
          .toLowerCase()
          .split(/[^a-z]+/)
          .filter((part) => part.length > 1),
      );
      // Same DOB and at least two shared name tokens (handles Francisco/Fransisco + flipped order).
      const overlap = [...tokens].filter((token) =>
        [...existing].some((have) => have === token || have.startsWith(token.slice(0, 4)) || token.startsWith(have.slice(0, 4))),
      );
      return overlap.length >= 2;
    });
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
  const incomingHistory = [draft.reasonForVisit, draft.medicalHistory].filter(Boolean).join("\n\n");
  const medicalHistory = existing.medicalHistory.trim()
    ? incomingHistory && !existing.medicalHistory.includes(incomingHistory.slice(0, 80))
      ? `${existing.medicalHistory.trim()}\n\n${incomingHistory}`.slice(0, 12_000)
      : existing.medicalHistory
    : incomingHistory;

  let cases = existing.cases;
  if (draft.injuryCase && Object.values(draft.injuryCase).some(Boolean)) {
    if (!existing.cases.length) {
      cases = [
        {
          ...emptyInjuryCase(`case_${existing.id}`),
          ...draft.injuryCase,
          attorneyAddress: "",
          notes: draft.injuryCase.notes || draft.injuryCase.description || "",
        },
      ];
    } else {
      const [first, ...rest] = existing.cases;
      const noteAdd = draft.injuryCase.notes || draft.injuryCase.description || "";
      cases = [
        {
          ...first,
          caseNumber: fill(first.caseNumber, draft.injuryCase.caseNumber),
          claimNumber: fill(first.claimNumber, draft.injuryCase.claimNumber),
          dateOfInjury: fill(first.dateOfInjury, draft.injuryCase.dateOfInjury),
          description: fill(first.description, draft.injuryCase.description),
          carrierName: fill(first.carrierName, draft.injuryCase.carrierName),
          attorneyName: fill(first.attorneyName, draft.injuryCase.attorneyName),
          attorneyFirm: fill(first.attorneyFirm, draft.injuryCase.attorneyFirm),
          attorneyPhone: fill(first.attorneyPhone, draft.injuryCase.attorneyPhone),
          attorneyEmail: fill(first.attorneyEmail, draft.injuryCase.attorneyEmail),
          notes:
            first.notes.trim() && noteAdd && !first.notes.includes(noteAdd.slice(0, 60))
              ? `${first.notes.trim()}\n\n${noteAdd}`.slice(0, 8_000)
              : fill(first.notes, noteAdd),
        },
        ...rest,
      ];
    }
  }

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
    medicalHistory,
    surgicalHistory: fill(existing.surgicalHistory, draft.surgicalHistory),
    pcpName: fill(existing.pcpName, draft.pcpName),
    pcpPhone: fill(existing.pcpPhone, draft.pcpPhone),
    referringName: fill(existing.referringName, draft.referringName),
    referringPhone: fill(existing.referringPhone, draft.referringPhone),
    pharmacyName: fill(existing.pharmacyName, draft.pharmacyName),
    pharmacyPhone: fill(existing.pharmacyPhone, draft.pharmacyPhone),
    emergencyName: fill(existing.emergencyName, draft.emergencyName),
    emergencyPhone: fill(existing.emergencyPhone, draft.emergencyPhone),
    emergencyRelation: fill(existing.emergencyRelation, draft.emergencyRelation),
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
