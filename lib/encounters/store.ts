import "server-only";
import { applyCodeApproval, approvalStatus } from "@/lib/encounters/approve";
import { codeClinicalNote } from "@/lib/encounters/catalog";
import { transcribeAudio, writeClinicalNote } from "@/lib/encounters/openai";
import { runVisitPipeline, type VisitSnapshot } from "@/lib/encounters/pipeline";
import {
  acceptedAudioType,
  audioByteLimit,
  audioContentType,
  audioExtension,
  encounterStatuses,
  type Encounter,
  type EncounterProgress,
  type EncounterStatus,
  type VisitCode,
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

function asCodes(value: Json): VisitCode[] {
  if (!Array.isArray(value)) return [];
  const codes: VisitCode[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) continue;
    const record = item as { code?: unknown; description?: unknown; level?: unknown; approved?: unknown };
    if (typeof record.code !== "string" || typeof record.description !== "string") continue;
    const level = record.level === 1 || record.level === 2 || record.level === 3 ? record.level : 3;
    codes.push({
      code: record.code,
      description: record.description,
      level,
      approved: record.approved === true,
    });
  }
  return codes;
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
    billingCodes: asCodes(row.billing_codes),
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
  return codes.map((code) => ({
    code: code.code,
    description: code.description,
    level: code.level,
    approved: code.approved,
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

export async function createEncounter(input: {
  clinicianId: string;
  patientLabel: string;
  appointmentId?: string;
  contentType: string;
  byteSize: number;
}) {
  const contentType = audioContentType(input.contentType);
  if (!acceptedAudioType(contentType)) {
    return { ok: false as const, message: "Record or choose a webm, mp3, m4a, wav, or mp4 file." };
  }
  if (!Number.isFinite(input.byteSize) || input.byteSize < 1 || input.byteSize > audioByteLimit) {
    return { ok: false as const, message: "Each recording has to be 25 MB or smaller." };
  }
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
      audio_content_type: contentType,
      progress: { step: "uploaded", started_at: new Date().toISOString() },
    })
    .select("*")
    .single();
  if (created.error || !created.data) return { ok: false as const, message: "That visit could not be started." };

  const encounter = fromRow(created.data as EncounterRow);
  const path = `encounters/${encounter.id}/recording.${audioExtension(contentType)}`;
  const signed = await supabase.storage.from(bucket).createSignedUploadUrl(path);
  if (signed.error || !signed.data) {
    await supabase.from("encounters").delete().eq("id", encounter.id);
    return { ok: false as const, message: "That recording could not be stored." };
  }
  const saved = await supabase
    .from("encounters")
    .update({ audio_path: path, updated_at: new Date().toISOString() })
    .eq("id", encounter.id)
    .select("*")
    .single();
  if (saved.error || !saved.data) {
    await supabase.from("encounters").delete().eq("id", encounter.id);
    return { ok: false as const, message: "That recording could not be stored." };
  }
  return { ok: true as const, encounter: fromRow(saved.data as EncounterRow), signedUrl: signed.data.signedUrl };
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
      billing_codes: codesJson(visit.billingCodes),
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
  const nextStatus: EncounterStatus = !existing.transcript.trim()
    ? "transcribing"
    : !existing.noteClinical.trim()
      ? "generating"
      : existing.icd10.length === 0
        ? "generating_icd10"
        : "generating_cpt";
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
      codeNote: codeClinicalNote,
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

export async function reviewEncounter(
  id: string,
  input: { noteApproved: boolean; icd10: string[]; billingCodes: string[] },
) {
  const existing = await getEncounter(id);
  if (!existing) return { ok: false as const, status: 404, message: "That visit could not be found." };
  if (existing.status !== "review" && existing.status !== "approved") {
    return { ok: false as const, status: 409, message: "Approve the note after the codes are ready." };
  }
  const icd10 = applyCodeApproval(existing.icd10, input.icd10);
  const billingCodes = applyCodeApproval(existing.billingCodes, input.billingCodes);
  if (!icd10 || !billingCodes) return { ok: false as const, status: 400, message: "Those codes are not on this visit." };
  const noteApproved = input.noteApproved === true;
  const status = approvalStatus(noteApproved, icd10, billingCodes);
  const supabase = client();
  const saved = await supabase
    .from("encounters")
    .update({
      note_approved: noteApproved,
      icd10: codesJson(icd10),
      billing_codes: codesJson(billingCodes),
      status,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .in("status", ["review", "approved"])
    .select("*")
    .maybeSingle();
  if (saved.error) return { ok: false as const, status: 502, message: saved.error.message };
  if (!saved.data) return { ok: false as const, status: 409, message: "Approve the note after the codes are ready." };
  return { ok: true as const, encounter: fromRow(saved.data as EncounterRow) };
}
