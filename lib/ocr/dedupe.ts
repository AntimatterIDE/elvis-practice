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

/** Alphanumeric member id for soft matching (strip spaces/hyphens/punctuation). */
export function normalizeMemberIdKey(value: string | undefined | null): string {
  return (value || "").replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
}

/** Last 10 US phone digits for soft matching. */
export function normalizePhoneKey(value: string | undefined | null): string {
  const digits = (value || "").replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1);
  if (digits.length >= 10) return digits.slice(-10);
  return "";
}

export type OcrImportMatch = {
  patient: Patient;
  /**
   * fingerprint = same files; name_dob = exact/swapped; member_id / phone = DOB-scoped soft keys;
   * name_dob_fuzzy = possible match (verify).
   */
  reason: "fingerprint" | "name_dob" | "member_id" | "phone" | "name_dob_fuzzy";
  matchedHashes: string[];
};

export type OcrImportMatchInput = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  fingerprints: string[];
  memberId?: string;
  phone?: string;
};

function nameTokens(firstName: string, lastName: string): string[] {
  return `${firstName} ${lastName}`
    .toLowerCase()
    .split(/[^a-z]+/)
    .filter((part) => part.length > 1);
}

/** Prefer fingerprint; else exact name+DOB; else member/phone+DOB; else tightened fuzzy name+DOB. */
export function findOcrImportMatch(patients: Patient[], input: OcrImportMatchInput): OcrImportMatch | null {
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
  const exact =
    patients.find((patient) => normalizePersonKey(patient.firstName, patient.lastName, patient.dateOfBirth) === key) ||
    patients.find((patient) => normalizePersonKey(patient.firstName, patient.lastName, patient.dateOfBirth) === swapped);
  if (exact) return { patient: exact, reason: "name_dob", matchedHashes: [] };

  const memberKey = normalizeMemberIdKey(input.memberId);
  if (memberKey.length >= 8) {
    const byMember = patients.find((patient) => {
      if (patient.dateOfBirth.slice(0, 10) !== dob) return false;
      return normalizeMemberIdKey(patient.memberId) === memberKey;
    });
    if (byMember) return { patient: byMember, reason: "member_id", matchedHashes: [] };
  }

  const phoneKey = normalizePhoneKey(input.phone);
  if (phoneKey.length === 10) {
    const byPhone = patients.find((patient) => {
      if (patient.dateOfBirth.slice(0, 10) !== dob) return false;
      return normalizePhoneKey(patient.phone) === phoneKey;
    });
    if (byPhone) return { patient: byPhone, reason: "phone", matchedHashes: [] };
  }

  const tokens = new Set(nameTokens(input.firstName, input.lastName));
  const fuzzy = patients.find((patient) => {
    if (patient.dateOfBirth.slice(0, 10) !== dob) return false;
    const existing = new Set(nameTokens(patient.firstName, patient.lastName));
    // Soft prefix still counts toward overlap, but require ≥1 exact token length ≥5.
    const overlap = [...tokens].filter((token) =>
      [...existing].some((have) => have === token || have.startsWith(token.slice(0, 4)) || token.startsWith(have.slice(0, 4))),
    );
    if (overlap.length < 2) return false;
    const hasStrongExact = [...tokens].some((token) => token.length >= 5 && existing.has(token));
    return hasStrongExact;
  });
  if (!fuzzy) return null;
  return { patient: fuzzy, reason: "name_dob_fuzzy", matchedHashes: [] };
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

export type OnboardMergeOverwriteKey =
  | "firstName"
  | "lastName"
  | "dateOfBirth"
  | "sex"
  | "phone"
  | "email"
  | "address"
  | "city"
  | "state"
  | "postalCode"
  | "payerName"
  | "memberId"
  | "medicalHistory"
  | "surgicalHistory"
  | "pcpName"
  | "pcpPhone"
  | "referringName"
  | "referringPhone"
  | "pharmacyName"
  | "pharmacyPhone"
  | "emergencyName"
  | "emergencyPhone"
  | "emergencyRelation"
  | "injuryCase"
  | "problems"
  | "medications"
  | "allergies";

export type MergeOnboardOptions = {
  /**
   * Fields the user reviewed and accepted. OCR may change the chart only for these keys.
   * Hard rule: never omit this after an OCR extract — empty means no clinical fields change.
   */
  accept: OnboardMergeOverwriteKey[];
  /** When set, use draft values for these keys even if the chart already has them. */
  overwrite?: OnboardMergeOverwriteKey[];
};

/** Keys on a draft that carry extractable chart values (for “accept all” after a full draft review). */
export function onboardDraftAcceptKeys(draft: OnboardDraft): OnboardMergeOverwriteKey[] {
  const keys: OnboardMergeOverwriteKey[] = [];
  const push = (key: OnboardMergeOverwriteKey, present: boolean) => {
    if (present) keys.push(key);
  };
  push("firstName", Boolean(draft.firstName.trim()));
  push("lastName", Boolean(draft.lastName.trim()));
  push("dateOfBirth", Boolean(draft.dateOfBirth.trim()));
  push("sex", draft.sex !== "unknown");
  push("phone", Boolean(draft.phone.trim()));
  push("email", Boolean(draft.email.trim()));
  push("address", Boolean(draft.address.trim()));
  push("city", Boolean(draft.city.trim()));
  push("state", Boolean(draft.state.trim()));
  push("postalCode", Boolean(draft.postalCode.trim()));
  push("payerName", Boolean(draft.payerName.trim()));
  push("memberId", Boolean(draft.memberId.trim()));
  push("medicalHistory", Boolean(draft.reasonForVisit.trim() || draft.medicalHistory.trim()));
  push("surgicalHistory", Boolean(draft.surgicalHistory.trim()));
  push("pcpName", Boolean(draft.pcpName.trim()));
  push("pcpPhone", Boolean(draft.pcpPhone.trim()));
  push("referringName", Boolean(draft.referringName.trim()));
  push("referringPhone", Boolean(draft.referringPhone.trim()));
  push("pharmacyName", Boolean(draft.pharmacyName.trim()));
  push("pharmacyPhone", Boolean(draft.pharmacyPhone.trim()));
  push("emergencyName", Boolean(draft.emergencyName.trim()));
  push("emergencyPhone", Boolean(draft.emergencyPhone.trim()));
  push("emergencyRelation", Boolean(draft.emergencyRelation.trim()));
  push("injuryCase", Boolean(draft.injuryCase && Object.values(draft.injuryCase).some(Boolean)));
  push("problems", draft.problems.length > 0);
  push("medications", draft.medications.length > 0);
  push("allergies", draft.allergies.length > 0);
  return keys;
}

/**
 * Merge an OCR draft into an existing chart.
 * Only keys listed in `options.accept` may change. Never invent tradingPartnerId.
 */
export function mergeOnboardIntoPatient(
  existing: Patient,
  draft: OnboardDraft,
  fingerprints: string[],
  options: MergeOnboardOptions,
): Patient {
  const accept = new Set(options.accept);
  const overwrite = new Set(options.overwrite ?? []);
  const allowed = (key: OnboardMergeOverwriteKey) => accept.has(key);
  const built = patientFromOnboardDraft(draft, existing.id);
  const hashes = normalizeHashes([...(existing.ocrImportHashes ?? []), ...fingerprints]);
  const note = draft.sourceSummary || "Records OCR import";
  // Document-slot hints are OCR-derived — apply only when the user accepted at least one field.
  const documents =
    accept.size > 0
      ? applyOnboardDocumentHints(existing.documents, draft.documentHints, note)
      : existing.documents;

  const fill = (key: OnboardMergeOverwriteKey, current: string, next: string) => {
    if (!allowed(key)) return current;
    if (overwrite.has(key) && next.trim()) return next.trim();
    return current.trim() ? current : next.trim();
  };
  const incomingHistory = [draft.reasonForVisit, draft.medicalHistory].filter(Boolean).join("\n\n");
  let medicalHistory = existing.medicalHistory;
  if (allowed("medicalHistory")) {
    if (overwrite.has("medicalHistory") && incomingHistory) {
      medicalHistory = incomingHistory.slice(0, 12_000);
    } else if (existing.medicalHistory.trim()) {
      medicalHistory =
        incomingHistory && !existing.medicalHistory.includes(incomingHistory.slice(0, 80))
          ? `${existing.medicalHistory.trim()}\n\n${incomingHistory}`.slice(0, 12_000)
          : existing.medicalHistory;
    } else {
      medicalHistory = incomingHistory;
    }
  }

  let cases = existing.cases;
  if (allowed("injuryCase") && draft.injuryCase && Object.values(draft.injuryCase).some(Boolean)) {
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
      const caseFill = (current: string, next: string) =>
        overwrite.has("injuryCase") && next.trim() ? next.trim() : current.trim() ? current : next.trim();
      cases = [
        {
          ...first,
          caseNumber: caseFill(first.caseNumber, draft.injuryCase.caseNumber),
          claimNumber: caseFill(first.claimNumber, draft.injuryCase.claimNumber),
          dateOfInjury: caseFill(first.dateOfInjury, draft.injuryCase.dateOfInjury),
          description: caseFill(first.description, draft.injuryCase.description),
          carrierName: caseFill(first.carrierName, draft.injuryCase.carrierName),
          attorneyName: caseFill(first.attorneyName, draft.injuryCase.attorneyName),
          attorneyFirm: caseFill(first.attorneyFirm, draft.injuryCase.attorneyFirm),
          attorneyPhone: caseFill(first.attorneyPhone, draft.injuryCase.attorneyPhone),
          attorneyEmail: caseFill(first.attorneyEmail, draft.injuryCase.attorneyEmail),
          notes:
            overwrite.has("injuryCase") && noteAdd
              ? noteAdd.slice(0, 8_000)
              : first.notes.trim() && noteAdd && !first.notes.includes(noteAdd.slice(0, 60))
                ? `${first.notes.trim()}\n\n${noteAdd}`.slice(0, 8_000)
                : caseFill(first.notes, noteAdd),
        },
        ...rest,
      ];
    }
  }

  let sex = existing.sex;
  if (allowed("sex")) {
    sex =
      overwrite.has("sex") && draft.sex !== "unknown"
        ? draft.sex
        : existing.sex !== "unknown"
          ? existing.sex
          : draft.sex;
  }

  let payerName = existing.payerName;
  if (allowed("payerName")) {
    payerName =
      overwrite.has("payerName") && draft.payerName.trim()
        ? draft.payerName.trim()
        : existing.payerName && existing.payerName !== "Self-pay"
          ? existing.payerName
          : draft.payerName || existing.payerName;
  }

  return {
    ...existing,
    firstName: fill("firstName", existing.firstName, draft.firstName) || existing.firstName,
    lastName: fill("lastName", existing.lastName, draft.lastName) || existing.lastName,
    dateOfBirth: fill("dateOfBirth", existing.dateOfBirth, draft.dateOfBirth) || existing.dateOfBirth,
    sex,
    phone: fill("phone", existing.phone, draft.phone),
    email: fill("email", existing.email, draft.email),
    address: fill("address", existing.address, draft.address),
    city: fill("city", existing.city, draft.city),
    state: fill("state", existing.state, draft.state),
    postalCode: fill("postalCode", existing.postalCode, draft.postalCode),
    payerName,
    memberId: fill("memberId", existing.memberId, draft.memberId),
    medicalHistory,
    surgicalHistory: fill("surgicalHistory", existing.surgicalHistory, draft.surgicalHistory),
    pcpName: fill("pcpName", existing.pcpName, draft.pcpName),
    pcpPhone: fill("pcpPhone", existing.pcpPhone, draft.pcpPhone),
    referringName: fill("referringName", existing.referringName, draft.referringName),
    referringPhone: fill("referringPhone", existing.referringPhone, draft.referringPhone),
    pharmacyName: fill("pharmacyName", existing.pharmacyName, draft.pharmacyName),
    pharmacyPhone: fill("pharmacyPhone", existing.pharmacyPhone, draft.pharmacyPhone),
    emergencyName: fill("emergencyName", existing.emergencyName, draft.emergencyName),
    emergencyPhone: fill("emergencyPhone", existing.emergencyPhone, draft.emergencyPhone),
    emergencyRelation: fill("emergencyRelation", existing.emergencyRelation, draft.emergencyRelation),
    problems: !allowed("problems")
      ? existing.problems
      : overwrite.has("problems")
        ? built.problems
        : mergeUniqueByName(existing.problems, built.problems, (item) => `${item.name}|${item.icd}`.toLowerCase()),
    medications: !allowed("medications")
      ? existing.medications
      : overwrite.has("medications")
        ? built.medications
        : mergeUniqueByName(existing.medications, built.medications, (item) => item.name.toLowerCase()),
    allergies: !allowed("allergies")
      ? existing.allergies
      : overwrite.has("allergies")
        ? built.allergies
        : mergeUniqueByName(existing.allergies, built.allergies, (item) => (item.substance || "").toLowerCase()),
    allergiesReviewed: allowed("allergies")
      ? existing.allergiesReviewed || built.allergiesReviewed
      : existing.allergiesReviewed,
    documents,
    cases,
    ocrImportHashes: hashes,
    accountNotes: [
      ...existing.accountNotes,
      ...(accept.size > 0 && draft.warnings.length
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
