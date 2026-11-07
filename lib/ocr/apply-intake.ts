import { normalizeHashes } from "@/lib/ocr/dedupe";
import { applyOnboardDocumentHints, normalizeOnboardDraft, type OnboardDraft } from "@/lib/ocr/onboard-draft";
import {
  applyFiledSlotsToPatient,
  fileInboxPathsToChart,
  storeOcrTextArtifact,
} from "@/lib/ocr/file-from-inbox";
import { emptyInjuryCase } from "@/lib/rcm/chart";
import type { Patient } from "@/lib/rcm/types";

function fill(current: string, next: string) {
  return current.trim() ? current : next.trim();
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

/** Fold OCR draft clinical fields into a chart created/updated by intake answers. */
export function mergeOcrDraftIntoIntakePatient(
  patient: Patient,
  draftRaw: unknown,
  fingerprints: string[],
): Patient {
  const draft = normalizeOnboardDraft(draftRaw);
  const hashes = normalizeHashes([...(patient.ocrImportHashes ?? []), ...fingerprints]);
  const nid = () => `id_${crypto.randomUUID().slice(0, 8)}`;
  const historyParts = [patient.medicalHistory, draft.reasonForVisit, draft.medicalHistory];
  if (draft.imagingFindings) historyParts.push(`Imaging findings:\n${draft.imagingFindings}`);
  const medicalHistory = [...new Set(historyParts.filter(Boolean))].join("\n\n").slice(0, 12_000);

  let cases = patient.cases;
  if (draft.injuryCase && Object.values(draft.injuryCase).some(Boolean)) {
    if (!patient.cases.length) {
      cases = [
        {
          ...emptyInjuryCase(`case_${patient.id}`),
          ...draft.injuryCase,
          attorneyAddress: "",
          notes: draft.injuryCase.notes || draft.injuryCase.description || "",
        },
      ];
    } else {
      const [first, ...rest] = patient.cases;
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

  const note = draft.sourceSummary || "Records OCR import";
  return {
    ...patient,
    surgicalHistory: fill(patient.surgicalHistory, draft.surgicalHistory),
    pcpName: fill(patient.pcpName, draft.pcpName),
    pcpPhone: fill(patient.pcpPhone, draft.pcpPhone),
    referringName: fill(patient.referringName, draft.referringName),
    referringPhone: fill(patient.referringPhone, draft.referringPhone),
    pharmacyName: fill(patient.pharmacyName, draft.pharmacyName),
    pharmacyPhone: fill(patient.pharmacyPhone, draft.pharmacyPhone),
    emergencyName: fill(patient.emergencyName, draft.emergencyName),
    emergencyPhone: fill(patient.emergencyPhone, draft.emergencyPhone),
    emergencyRelation: fill(patient.emergencyRelation, draft.emergencyRelation),
    medicalHistory,
    problems: mergeUniqueByName(
      patient.problems,
      draft.problems.map((problem) => ({ id: nid(), ...problem })),
      (item) => `${item.name}|${item.icd}`.toLowerCase(),
    ),
    medications: mergeUniqueByName(
      patient.medications,
      draft.medications.map((med) => ({ id: nid(), ...med })),
      (item) => item.name.toLowerCase(),
    ),
    allergies: mergeUniqueByName(
      patient.allergies,
      draft.allergies.map((allergy) => ({ id: nid(), ...allergy })),
      (item) => (item.substance || "").toLowerCase(),
    ),
    allergiesReviewed: patient.allergiesReviewed || draft.allergies.length > 0,
    documents: applyOnboardDocumentHints(patient.documents, draft.documentHints, note),
    cases,
    ocrImportHashes: hashes,
  };
}

export async function finalizeIntakeOcr(input: {
  patient: Patient;
  draftJson: string;
  fingerprintsJson: string;
  pathsJson: string;
  corpus: string;
  pageLabelsJson?: string;
}) {
  let draft: OnboardDraft = normalizeOnboardDraft({});
  try {
    draft = normalizeOnboardDraft(JSON.parse(input.draftJson || "{}") as unknown);
  } catch {
    draft = normalizeOnboardDraft({});
  }
  let fingerprints: string[] = [];
  try {
    fingerprints = Array.isArray(JSON.parse(input.fingerprintsJson || "[]"))
      ? (JSON.parse(input.fingerprintsJson || "[]") as unknown[]).filter(
          (item): item is string => typeof item === "string",
        )
      : [];
  } catch {
    fingerprints = [];
  }
  let paths: string[] = [];
  try {
    paths = Array.isArray(JSON.parse(input.pathsJson || "[]"))
      ? (JSON.parse(input.pathsJson || "[]") as unknown[]).filter((item): item is string => typeof item === "string")
      : [];
  } catch {
    paths = [];
  }
  let pageLabels: { label: string }[] = [];
  try {
    const raw = JSON.parse(input.pageLabelsJson || "[]") as unknown;
    pageLabels = Array.isArray(raw)
      ? raw
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const label = (item as { label?: unknown }).label;
            return typeof label === "string" ? { label } : null;
          })
          .filter((item): item is { label: string } => item !== null)
      : [];
  } catch {
    pageLabels = [];
  }

  let patient = mergeOcrDraftIntoIntakePatient(input.patient, draft, fingerprints);
  if (paths.length) {
    const filed = await fileInboxPathsToChart({
      patientId: patient.id,
      paths,
      hints: draft.documentHints,
      pageLabels,
    });
    patient = applyFiledSlotsToPatient(patient, filed.uploaded);
  }
  if (input.corpus.trim()) {
    const artifact = await storeOcrTextArtifact(patient.id, input.corpus, fingerprints[0] || "");
    if (artifact.ok) {
      patient = {
        ...patient,
        ocrImportArtifacts: [...(patient.ocrImportArtifacts ?? []), artifact.path].slice(0, 20),
      };
    }
  }
  return patient;
}
