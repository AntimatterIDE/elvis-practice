import "server-only";
import { downloadOcrInboxFile, isOcrInboxPath, removeOcrInboxFile } from "@/lib/ocr/inbox";
import { chartSlotsForOnboardFiles, markSlotsFromUploads, type OnboardDraft } from "@/lib/ocr/onboard-draft";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { objectKey } from "@/lib/chart-files/names";
import type { Patient } from "@/lib/rcm/types";

const bucket = "chart-files";

function contentTypeFor(name: string) {
  if (/\.pdf$/i.test(name)) return "application/pdf";
  if (/\.png$/i.test(name)) return "image/png";
  if (/\.webp$/i.test(name)) return "image/webp";
  if (/\.jpe?g$/i.test(name)) return "image/jpeg";
  return "application/pdf";
}

function isImageName(name: string) {
  return /\.(jpe?g|png|webp)$/i.test(name);
}

/** Copy staged OCR inbox bytes into chart-file slots; remove inbox objects afterward. */
export async function fileInboxPathsToChart(input: {
  patientId: string;
  paths: string[];
  hints: OnboardDraft["documentHints"];
  pageLabels?: { label: string }[];
}) {
  const paths = input.paths.filter(isOcrInboxPath).slice(0, 6);
  const uploaded: { slotId: string; fileName: string }[] = [];
  const errors: string[] = [];
  if (!paths.length) return { uploaded, errors, artifacts: [] as string[] };

  const files: { name: string; buffer: Buffer }[] = [];
  for (const path of paths) {
    const downloaded = await downloadOcrInboxFile(path);
    if (!downloaded.ok) {
      errors.push(downloaded.message);
      continue;
    }
    files.push({ name: downloaded.name.replace(/^\d+_/, "").replace(/^[a-f0-9-]{8}_/i, ""), buffer: downloaded.buffer });
  }

  const slots = chartSlotsForOnboardFiles(
    files.map((file) => ({ name: file.name, type: contentTypeFor(file.name) })),
    input.hints,
    input.pageLabels,
  );
  const clinicalSlots = slots.filter((slot) => slot !== "photo-id" && slot !== "insurance-card");
  const supabase = createSupabaseAdminClient();

  for (const file of files) {
    const contentType = contentTypeFor(file.name);
    let useSlots: string[];
    if (isImageName(file.name)) {
      useSlots = [];
      if (slots.includes("photo-id")) useSlots.push("photo-id");
      if (slots.includes("insurance-card")) useSlots.push("insurance-card");
      if (!useSlots.length) useSlots = ["outside-records"];
    } else {
      useSlots = (clinicalSlots.length ? clinicalSlots : ["outside-records"]).slice(0, 4);
    }
    for (const slotId of useSlots) {
      const path = `${input.patientId}/${slotId}/${objectKey(file.name)}`;
      const uploadedFile = await supabase.storage.from(bucket).upload(path, file.buffer, {
        contentType,
        upsert: false,
      });
      if (uploadedFile.error) {
        errors.push(`${file.name} → ${slotId}: ${uploadedFile.error.message}`);
        continue;
      }
      uploaded.push({ slotId, fileName: file.name });
    }
  }

  await Promise.all(paths.map((path) => removeOcrInboxFile(path)));
  return { uploaded, errors, artifacts: [] as string[] };
}

export async function storeOcrTextArtifact(patientId: string, corpus: string, fingerprint = "") {
  const text = corpus.trim();
  if (!text) return { ok: false as const, path: "", message: "Empty OCR corpus." };
  const supabase = createSupabaseAdminClient();
  const stamp = Date.now();
  const hash = fingerprint.slice(0, 12) || crypto.randomUUID().slice(0, 8);
  const path = `${patientId}/ocr-import/${stamp}-${hash}.txt`;
  const uploaded = await supabase.storage.from(bucket).upload(path, Buffer.from(text, "utf8"), {
    contentType: "text/plain; charset=utf-8",
    upsert: false,
  });
  if (uploaded.error) return { ok: false as const, path: "", message: uploaded.error.message };
  return { ok: true as const, path, message: "" };
}

export function applyFiledSlotsToPatient(patient: Patient, uploaded: { slotId: string; fileName: string }[]): Patient {
  if (!uploaded.length) return patient;
  return { ...patient, documents: markSlotsFromUploads(patient.documents, uploaded) };
}
