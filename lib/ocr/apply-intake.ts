import { normalizeHashes } from "@/lib/ocr/dedupe";
import { normalizeOnboardDraft, type OnboardDraft } from "@/lib/ocr/onboard-draft";
import {
  applyFiledSlotsToPatient,
  fileInboxPathsToChart,
  storeOcrTextArtifact,
} from "@/lib/ocr/file-from-inbox";
import type { Patient } from "@/lib/rcm/types";

/**
 * After intake submit: file the uploaded packet and keep an OCR text artifact.
 * Does **not** merge OCR clinical fields into the chart — those must be reviewed
 * and accepted on the form (or later via ChartExtractReview).
 */
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

  // Hard rule: OCR clinical fields never write the chart here. Intake answers (which the
  // patient reviewed on the form) already created/updated the chart. This step only files
  // the uploaded packet and stores the OCR text artifact for staff review later.
  const hashes = normalizeHashes([...(input.patient.ocrImportHashes ?? []), ...fingerprints]);
  let patient: Patient = { ...input.patient, ocrImportHashes: hashes };
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
