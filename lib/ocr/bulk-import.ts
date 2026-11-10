import type { OnboardDraft } from "@/lib/ocr/onboard-draft";
import type { OnboardExtractOcrMeta } from "@/lib/ocr/extract-client";
import {
  findOcrImportMatch,
  type OnboardMergeOverwriteKey,
  type OcrImportMatch,
} from "@/lib/ocr/dedupe";
import { patientName } from "@/lib/rcm/format";
import type { Patient } from "@/lib/rcm/types";

const RECORD_EXT = /\.(pdf|jpe?g|png|webp)$/i;
const RECORD_TYPES = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export type BulkImportPacket = {
  id: string;
  label: string;
  /** Path segment used for grouping (subfolder name or file basename). */
  groupKey: string;
  files: File[];
};

export type BulkImportCardStatus = "pending" | "approved" | "denied" | "failed";

/** New chart vs merge into an existing one after OCR match. */
export type BulkImportIntent = "create" | "update";

/** Stable snapshot of the matched chart for the flippable review card. */
export type BulkImportMatchSnapshot = {
  patientId: string;
  name: string;
  dateOfBirth: string;
  payerName: string;
  memberId: string;
  phone: string;
  email: string;
  reason: OcrImportMatch["reason"];
};

export type BulkImportCard = {
  id: string;
  packet: BulkImportPacket;
  draft: OnboardDraft | null;
  fingerprints: string[];
  ocr: OnboardExtractOcrMeta | null;
  error?: string;
  status: BulkImportCardStatus;
  /** create = new chart; update = merge into matched patient. */
  intent: BulkImportIntent;
  match: BulkImportMatchSnapshot | null;
  /**
   * Name/DOB match only: staff can force a separate chart.
   * Fingerprint matches always stay updates (same files already on that chart).
   */
  forceCreate: boolean;
  /**
   * Update cards: fields staff chose to overwrite on the chart.
   * When unset, Approve still uses every non-empty draft field (legacy).
   */
  acceptFields?: OnboardMergeOverwriteKey[];
};

/** PDF or common image — same surface as single-packet outside records. */
export function isBulkRecordFile(input: { name: string; type?: string }): boolean {
  const type = (input.type || "").toLowerCase();
  if (RECORD_TYPES.has(type)) return true;
  if (type.startsWith("image/") && RECORD_EXT.test(input.name)) return true;
  if (!type || type === "application/octet-stream") return RECORD_EXT.test(input.name);
  return RECORD_EXT.test(input.name);
}

function relativePathOf(file: File): string {
  const withPath = file as File & { webkitRelativePath?: string };
  const rel = (withPath.webkitRelativePath || "").trim();
  return rel || file.name;
}

function basename(path: string): string {
  const parts = path.split("/").filter(Boolean);
  return parts[parts.length - 1] || path;
}

function stripExtension(name: string): string {
  return name.replace(/\.[^.]+$/, "") || name;
}

/**
 * Group a folder pick into patient packets.
 *
 * - Subfolder under the selected root → one packet (all record files in that tree).
 * - Files directly in the root → one packet per file.
 * - Deeper nesting still groups by the first subfolder under the root.
 */
export function groupBulkImportFiles(files: File[]): BulkImportPacket[] {
  const accepted = files.filter((file) => isBulkRecordFile(file));
  if (!accepted.length) return [];

  type Bucket = { label: string; groupKey: string; files: File[] };
  const buckets = new Map<string, Bucket>();

  for (const file of accepted) {
    const rel = relativePathOf(file);
    const parts = rel.split("/").filter(Boolean);

    let groupKey: string;
    let label: string;

    if (parts.length >= 3) {
      // Root / PatientFolder / …file
      groupKey = `dir:${parts[1]}`;
      label = parts[1]!;
    } else if (parts.length === 2) {
      // Root / file.ext → one packet per file
      const fileName = parts[1]!;
      groupKey = `file:${fileName}`;
      label = stripExtension(fileName);
    } else {
      // No folder metadata — treat each file alone
      const fileName = parts[0] || file.name;
      groupKey = `file:${fileName}:${accepted.indexOf(file)}`;
      label = stripExtension(fileName);
    }

    const existing = buckets.get(groupKey);
    if (existing) {
      existing.files.push(file);
    } else {
      buckets.set(groupKey, { label, groupKey, files: [file] });
    }
  }

  return [...buckets.values()]
    .filter((bucket) => bucket.files.length > 0)
    .sort((a, b) => a.label.localeCompare(b.label, undefined, { sensitivity: "base" }))
    .map((bucket, index) => ({
      id: `pkt_${index}_${bucket.groupKey.replace(/[^A-Za-z0-9_-]+/g, "_").slice(0, 48)}`,
      label: bucket.label,
      groupKey: bucket.groupKey,
      files: bucket.files,
    }));
}

export function bulkCardNeedsName(draft: OnboardDraft | null): boolean {
  if (!draft) return true;
  return !draft.firstName.trim() || !draft.lastName.trim();
}

export function snapshotBulkMatch(match: OcrImportMatch): BulkImportMatchSnapshot {
  const { patient, reason } = match;
  return {
    patientId: patient.id,
    name: patientName(patient),
    dateOfBirth: patient.dateOfBirth.slice(0, 10),
    payerName: patient.payerName || "",
    memberId: patient.memberId || "",
    phone: patient.phone || "",
    email: patient.email || "",
    reason,
  };
}

/**
 * Detect whether this OCR draft belongs to an existing chart.
 * Fingerprint or name+DOB → update (unless forceCreate on a name/DOB match).
 */
export function resolveBulkCardMatch(
  patients: Patient[],
  draft: OnboardDraft | null,
  fingerprints: string[],
  forceCreate = false,
): { intent: BulkImportIntent; match: BulkImportMatchSnapshot | null } {
  if (!draft) return { intent: "create", match: null };
  const hit = findOcrImportMatch(patients, {
    firstName: draft.firstName,
    lastName: draft.lastName,
    dateOfBirth: draft.dateOfBirth,
    fingerprints,
  });
  if (!hit) return { intent: "create", match: null };
  const match = snapshotBulkMatch(hit);
  if (forceCreate && (hit.reason === "name_dob" || hit.reason === "name_dob_fuzzy")) {
    return { intent: "create", match };
  }
  return { intent: "update", match };
}
