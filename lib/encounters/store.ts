import "server-only";
import { codeLibrary } from "@/lib/coding/library";
import { suggestVisitCodes } from "@/lib/coding/suggest";
import { approvalStatus, reviewCodes, type LineChoice } from "@/lib/encounters/approve";
import { transcribeAudio, writeClinicalNote } from "@/lib/encounters/openai";
import { runVisitPipeline, type VisitSnapshot } from "@/lib/encounters/pipeline";
import {
  acceptedAudioType,
  audioByteLimit,
  audioContentType,
  audioExtension,
  audioPaths,
  encounterStatuses,
  type Encounter,
  type EncounterProgress,
  type EncounterStatus,
  type VisitCode,
  type VisitLine,
} from "@/lib/encounters/types";
import { isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/env";
import type { Json } from "@/lib/supabase/database";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { getStaffSession } from "@/lib/supabase/session";

const bucket = "visit-audio";

type EncounterRow = {
  id: string;
  clinician_id: string;
  patient_label: string;
  appointment_id: string;
  note_approved: boolean;
  status: EncounterStatus;
  audio_path: string | null;
  audio_content_type: string;
  transcript: string;
  medical_practice: string;
  note_clinical: string;
  icd10: Json;
  billing_codes: Json;
  progress: Json;
  error: string | null;
  created_at: string;
  updated_at: string;
};

export function visitStorageReady() {
  return isSupabaseConfigured() && isServiceRoleConfigured();
}

export async function staffSession() {
  const session = await getStaffSession();
  if (!session || session.userId === "demo-admin") return null;
  return session;
}

function client() {
  return createSupabaseAdminClient();
}

function asStatus(value: string): EncounterStatus {
  return encounterStatuses.find((status) => status === value) ?? "error";
}

type CodeRecord = { code: string; description: string; approved: boolean; units?: unknown; modifiers?: unknown; diagnoses?: unknown };

function codeRecords(value: Json) {
  if (!Array.isArray(value)) return [];
  const records: CodeRecord[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as { code?: unknown; description?: unknown; approved?: unknown; units?: unknown; modifiers?: unknown; diagnoses?: unknown };
    if (typeof record.code !== "string" || typeof record.description !== "string") continue;
    records.push({ ...record, code: record.code, description: record.description, approved: record.approved === true });
  }
  return records;
}

function stringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

function asCodes(value: Json): VisitCode[] {
  return codeRecords(value).map(({ code, description, approved }) => ({ code, description, approved }));
}

function asLines(value: Json): VisitLine[] {
  return codeRecords(value).map((record) => ({
    code: record.code,
    description: record.description,
    approved: record.approved,
    units: typeof record.units === "number" && Number.isInteger(record.units) && record.units > 0 ? record.units : 1,
    modifiers: stringList(record.modifiers),
    diagnoses: stringList(record.diagnoses),
  }));
}

function asProgress(value: Json): EncounterProgress | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const record = value as { step?: unknown; started_at?: unknown };
  if (typeof record.step !== "string" || typeof record.started_at !== "string") return null;
  return { step: record.step, startedAt: record.started_at };
}

function fromRow(row: EncounterRow): Encounter {
  return {
    id: row.id,
    clinicianId: row.clinician_id,
    patientLabel: row.patient_label,
    appointmentId: row.appointment_id ?? "",
    noteApproved: row.note_approved === true,
    status: asStatus(row.status),
    audioPath: row.audio_path,
    audioContentType: row.audio_content_type,
    transcript: row.transcript,
    medicalPractice: row.medical_practice,
    noteClinical: row.note_clinical,
    icd10: asCodes(row.icd10),
    billingCodes: asLines(row.billing_codes),
    progress: asProgress(row.progress),
    error: row.error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function progressJson(progress: EncounterProgress | null): Json {
  if (!progress) return {};
  return { step: progress.step, started_at: progress.startedAt };
}

function codesJson(codes: VisitCode[]): Json {
  return codes.map((code) => ({ code: code.code, description: code.description, approved: code.approved }));
}

function linesJson(lines: VisitLine[]): Json {
  return lines.map((line) => ({
    code: line.code,
    description: line.description,
    approved: line.approved,
    units: line.units,
    modifiers: line.modifiers,
    diagnoses: line.diagnoses,
  }));
}

async function ready(supabase: ReturnType<typeof client>) {
  const existing = await supabase.storage.getBucket(bucket);
  if (existing.data) return true;
  const created = await supabase.storage.createBucket(bucket, {
    public: false,
    fileSizeLimit: audioByteLimit,
    allowedMimeTypes: [
      "audio/webm",
      "audio/mp4",
      "audio/mpeg",
      "audio/wav",
      "audio/x-wav",
      "audio/m4a",
      "audio/x-m4a",
      "video/webm",
      "video/mp4",
    ],
  });
  return !created.error || /already exists/i.test(created.error.message);
}

export async function listEncounters() {
  const supabase = client();
  const { data, error } = await supabase.from("encounters").select("*").order("created_at", { ascending: false }).limit(40);
  if (error) throw new Error(error.message);
  return ((data ?? []) as EncounterRow[]).map(fromRow);
}

export async function getEncounter(id: string) {
  const supabase = client();
  const { data, error } = await supabase.from("encounters").select("*").eq("id", id).maybeSingle();
  if (error) throw new Error(error.message);
  return data ? fromRow(data as EncounterRow) : null;
}

type AudioPart = { contentType: string; byteSize: number };

function readParts(input: { contentType: string; byteSize: number; parts?: AudioPart[] }) {
  const source = input.parts && input.parts.length > 0 ? input.parts : [{ contentType: input.contentType, byteSize: input.byteSize }];
  if (source.length > 12) {
    return { ok: false as const, message: "This visit has too many segments. Generate the note, then start another visit." };
  }
  const parts: AudioPart[] = [];
  for (const part of source) {
    const contentType = audioContentType(part.contentType);
    if (!acceptedAudioType(contentType)) {
      return { ok: false as const, message: "Record or choose a webm, mp3, m4a, wav, or mp4 file." };
    }
    if (!Number.isFinite(part.byteSize) || part.byteSize < 1 || part.byteSize > audioByteLimit) {
      return { ok: false as const, message: "Each recording segment has to be 25 MB or smaller." };
    }
    parts.push({ contentType, byteSize: part.byteSize });
  }
  return { ok: true as const, parts };
}

async function signUploads(paths: string[], upsert: boolean) {
  const supabase = client();
  const uploads: { path: string; signedUrl: string }[] = [];
  for (const path of paths) {
    const signed = await supabase.storage.from(bucket).createSignedUploadUrl(path, upsert ? { upsert: true } : undefined);
    if (signed.error || !signed.data) return { ok: false as const, message: "That recording could not be stored." };
    uploads.push({ path, signedUrl: signed.data.signedUrl });
  }
  return { ok: true as const, uploads };
}

export async function createEncounter(input: {
  clinicianId: string;
  patientLabel: string;
  appointmentId?: string;
  contentType: string;
  byteSize: number;
  parts?: AudioPart[];
}) {
  const parsed = readParts(input);
  if (!parsed.ok) return parsed;
  const label = input.patientLabel.trim().slice(0, 120);
  const supabase = client();
  if (!(await ready(supabase))) return { ok: false as const, message: "Visit audio is not available yet." };

  const created = await supabase
    .from("encounters")
    .insert({
      clinician_id: input.clinicianId,
      patient_label: label,
      appointment_id: (input.appointmentId ?? "").trim().slice(0, 80),
      status: "uploaded",
      audio_content_type: parsed.parts[0]?.contentType ?? "",
      progress: { step: "uploaded", started_at: new Date().toISOString() },
    })
    .select("*")
    .single();
  if (created.error || !created.data) return { ok: false as const, message: "That visit could not be started." };

  const encounter = fromRow(created.data as EncounterRow);
  const paths = parsed.parts.map(
    (part, index) => `encounters/${encounter.id}/part-${index}.${audioExtension(part.contentType)}`,
  );
  const signed = await signUploads(paths, false);
  if (!signed.ok) {
    await supabase.from("encounters").delete().eq("id", encounter.id);
    return signed;
  }
  const saved = await supabase
    .from("encounters")
    .update({ audio_path: paths.join("\n"), updated_at: new Date().toISOString() })
    .eq("id", encounter.id)
    .select("*")
    .single();
  if (saved.error || !saved.data) {
    await supabase.from("encounters").delete().eq("id", encounter.id);
    return { ok: false as const, message: "That recording could not be stored." };
  }
  return {
    ok: true as const,
    encounter: fromRow(saved.data as EncounterRow),
    signedUrl: signed.uploads[0]?.signedUrl ?? "",
    uploads: signed.uploads,
  };
}

export async function resignEncounterUploads(id: string) {
  const existing = await getEncounter(id);
  if (!existing) return { ok: false as const, status: 404, message: "That visit could not be found." };
  if (existing.status !== "uploaded" && existing.status !== "error") {
    return { ok: false as const, status: 409, message: "This visit is already being processed." };
  }
  const paths = audioPaths(existing.audioPath);
  if (paths.length === 0) return { ok: false as const, status: 400, message: "That recording could not be stored." };
  const signed = await signUploads(paths, true);
  if (!signed.ok) return { ok: false as const, status: 502, message: signed.message };
  return { ok: true as const, uploads: signed.uploads, encounter: existing };
}

export async function deleteDraftEncounter(id: string) {
  const existing = await getEncounter(id);
  if (!existing) return { ok: true as const };
  if (existing.transcript.trim() || existing.noteClinical.trim() || (existing.status !== "uploaded" && existing.status !== "error")) {
    return { ok: false as const, status: 409, message: "This visit already has a note." };
  }
  const supabase = client();
  const paths = audioPaths(existing.audioPath);
  if (paths.length > 0) await supabase.storage.from(bucket).remove(paths);
  const removed = await supabase.from("encounters").delete().eq("id", id);
  if (removed.error) return { ok: false as const, status: 502, message: removed.error.message };
  return { ok: true as const };
}

/** One-shot cleanup for labeled QA test visits (and their audio). Staff-only. */
export async function purgeQaTestEncounters() {
  const supabase = client();
  const listed = await supabase.from("encounters").select("id,patient_label,audio_path").ilike("patient_label", "QA TEST%").limit(200);
  if (listed.error) return { ok: false as const, status: 502, message: listed.error.message, deleted: [] as string[] };
  const rows = (listed.data ?? []) as { id: string; patient_label: string; audio_path: string | null }[];
  const deleted: string[] = [];
  for (const row of rows) {
    const paths = audioPaths(row.audio_path);
    if (paths.length > 0) await supabase.storage.from(bucket).remove(paths);
    const removed = await supabase.from("encounters").delete().eq("id", row.id);
    if (removed.error) return { ok: false as const, status: 502, message: removed.error.message, deleted };
    deleted.push(row.id);
  }
  return { ok: true as const, deleted };
}

async function saveSnapshot(visit: VisitSnapshot) {
  const supabase = client();
  const saved = await supabase
    .from("encounters")
    .update({
      status: visit.status,
      transcript: visit.transcript,
      medical_practice: visit.medicalPractice,
      note_clinical: visit.noteClinical,
      icd10: codesJson(visit.icd10),
      billing_codes: linesJson(visit.billingCodes),
      progress: progressJson(visit.progress),
      error: visit.error,
      updated_at: new Date().toISOString(),
    })
    .eq("id", visit.id)
    .select("*")
    .single();
  if (saved.error || !saved.data) throw new Error(saved.error?.message || "The visit could not be saved.");
  return fromRow(saved.data as EncounterRow);
}

function snapshot(encounter: Encounter): VisitSnapshot {
  return {
    id: encounter.id,
    status: encounter.status,
    audioPath: encounter.audioPath,
    audioContentType: encounter.audioContentType,
    transcript: encounter.transcript,
    medicalPractice: encounter.medicalPractice,
    noteClinical: encounter.noteClinical,
    icd10: encounter.icd10,
    billingCodes: encounter.billingCodes,
    progress: encounter.progress,
    error: encounter.error,
  };
}

async function suggestedCodesFromNote(note: string): Promise<{ icd10: VisitCode[]; billingCodes: VisitLine[] }> {
  const library = codeLibrary();
  const suggested = await suggestVisitCodes(note, { library });
  if (!suggested.enabled) return { icd10: [], billingCodes: [] };
  // Surface suggestions even when the validator flags something — staff fixes before Ready/Stedi.
  const icd10: VisitCode[] = suggested.coding.diagnoses.map((item) => {
    const checked = library.diagnoses.byCode.get(item.icd);
    return {
      code: item.icd,
      description: checked?.description ?? "",
      approved: false,
    };
  });
  const billingCodes: VisitLine[] = suggested.coding.lines.map((line) => {
    const checked = library.procedures.byCode.get(line.cpt);
    return {
      code: line.cpt,
      description: checked?.description ?? "",
      approved: false,
      units: line.units,
      modifiers: line.modifiers,
      diagnoses: line.diagnosisPointers,
    };
  });
  return { icd10, billingCodes };
}

export async function processEncounter(id: string, retry = false) {
  const existing = await getEncounter(id);
  if (!existing) return { ok: false as const, status: 404, message: "That visit could not be found." };
  if (existing.status === "review" || existing.status === "approved") return { ok: true as const, encounter: existing };

  const stale = Date.now() - new Date(existing.updatedAt).getTime() > 120_000;
  const claimFrom: EncounterStatus[] = ["uploaded", "error"];
  if (retry && stale) claimFrom.push("transcribing", "generating", "generating_icd10", "generating_cpt");
  if (!claimFrom.includes(existing.status)) {
    return { ok: false as const, status: 409, message: "This visit is already being processed.", encounter: existing };
  }

  const supabase = client();
  const startedAt = new Date().toISOString();
  const nextStatus: EncounterStatus = !existing.transcript.trim() ? "transcribing" : "generating";
  const claimed = await supabase
    .from("encounters")
    .update({
      status: nextStatus,
      error: null,
      progress: { step: nextStatus, started_at: startedAt },
      updated_at: startedAt,
    })
    .eq("id", id)
    .in("status", claimFrom)
    .select("*")
    .maybeSingle();
  if (claimed.error) return { ok: false as const, status: 502, message: claimed.error.message };
  if (!claimed.data) {
    const current = await getEncounter(id);
    if (current?.status === "review" || current?.status === "approved") return { ok: true as const, encounter: current };
    return { ok: false as const, status: 409, message: "This visit is already being processed.", encounter: current };
  }

  try {
    const encounter = await runVisitPipeline(snapshot(fromRow(claimed.data as EncounterRow)), {
      download: async (path) => {
        const file = await supabase.storage.from(bucket).download(path);
        if (file.error || !file.data) throw new Error("The recording could not be opened.");
        const bytes = new Uint8Array(await file.data.arrayBuffer());
        return { bytes, contentType: file.data.type || existing.audioContentType };
      },
      transcribe: transcribeAudio,
      writeNote: writeClinicalNote,
      suggestCodes: suggestedCodesFromNote,
      save: async (patch) => {
        await saveSnapshot(patch);
      },
    });
    const saved = await getEncounter(id);
    return { ok: true as const, encounter: saved ?? { ...existing, ...encounter, clinicianId: existing.clinicianId, patientLabel: existing.patientLabel, createdAt: existing.createdAt, updatedAt: existing.updatedAt } };
  } catch (error) {
    const message = error instanceof Error ? error.message : "The visit could not be processed.";
    const saved = await getEncounter(id);
    return { ok: false as const, status: 502, message, encounter: saved ?? undefined };
  }
}

/** Fill or replace unapproved codes on a review/approved visit from the clinical note. */
export async function suggestEncounterCodes(id: string, replace = false) {
  const existing = await getEncounter(id);
  if (!existing) return { ok: false as const, status: 404, message: "That visit could not be found." };
  if (existing.status !== "review" && existing.status !== "approved") {
    return { ok: false as const, status: 409, message: "Suggest codes after the note is ready for review." };
  }
  if (!existing.noteClinical.trim()) {
    return { ok: false as const, status: 409, message: "This visit does not have a note yet." };
  }
  const hasCodes = existing.icd10.length > 0 || existing.billingCodes.length > 0;
  if (hasCodes && !replace) return { ok: true as const, encounter: existing };

  const startedAt = new Date().toISOString();
  const supabase = client();
  const claimed = await supabase
    .from("encounters")
    .update({
      status: "generating_icd10",
      error: null,
      progress: { step: "generating_icd10", started_at: startedAt },
      updated_at: startedAt,
    })
    .eq("id", id)
    .in("status", ["review", "approved"])
    .select("*")
    .maybeSingle();
  if (claimed.error) return { ok: false as const, status: 502, message: claimed.error.message };
  if (!claimed.data) {
    return { ok: false as const, status: 409, message: "This visit is already being processed.", encounter: existing };
  }

  try {
    const codes = await suggestedCodesFromNote(existing.noteClinical);
    const saved = await supabase
      .from("encounters")
      .update({
        status: "review",
        note_approved: existing.noteApproved,
        icd10: codesJson(codes.icd10),
        billing_codes: linesJson(codes.billingCodes),
        progress: { step: "review", started_at: new Date().toISOString() },
        error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .select("*")
      .single();
    if (saved.error || !saved.data) throw new Error(saved.error?.message || "The codes could not be saved.");
    return { ok: true as const, encounter: fromRow(saved.data as EncounterRow) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Codes could not be suggested.";
    await supabase
      .from("encounters")
      .update({
        status: "review",
        progress: { step: "review", started_at: new Date().toISOString() },
        error: message,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id);
    const saved = await getEncounter(id);
    return { ok: false as const, status: 502, message, encounter: saved ?? undefined };
  }
}

export async function reviewEncounter(
  id: string,
  input: { noteApproved: boolean; icd10: string[]; billingCodes: LineChoice[] },
) {
  const existing = await getEncounter(id);
  if (!existing) return { ok: false as const, status: 404, message: "That visit could not be found." };
  if (existing.status !== "review" && existing.status !== "approved") {
    return { ok: false as const, status: 409, message: "Approve the note after it is written." };
  }
  const reviewed = reviewCodes(codeLibrary(), input);
  if (!reviewed.ok) return { ok: false as const, status: 400, message: reviewed.error };
  const noteApproved = input.noteApproved === true;
  const status = approvalStatus(noteApproved, reviewed.icd10, reviewed.billingCodes);
  const supabase = client();
  const saved = await supabase
    .from("encounters")
    .update({
      note_approved: noteApproved,
      icd10: codesJson(reviewed.icd10),
      billing_codes: linesJson(reviewed.billingCodes),
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["review", "approved"])
    .select("*")
    .maybeSingle();
  if (saved.error) return { ok: false as const, status: 502, message: saved.error.message };
  if (!saved.data) return { ok: false as const, status: 409, message: "Approve the note after it is written." };
  return { ok: true as const, encounter: fromRow(saved.data as EncounterRow) };
}
