import type { EncounterProgress, EncounterStatus, VisitCode } from "@/lib/encounters/types";
import { audioByteLimit, audioExtension } from "@/lib/encounters/types";

export type VisitSnapshot = {
  id: string;
  status: EncounterStatus;
  audioPath: string | null;
  audioContentType: string;
  transcript: string;
  medicalPractice: string;
  noteClinical: string;
  icd10: VisitCode[];
  billingCodes: VisitCode[];
  progress: EncounterProgress | null;
  error: string | null;
};

export type VisitIo = {
  download: (path: string) => Promise<{ bytes: Uint8Array; contentType: string }>;
  transcribe: (file: { bytes: Uint8Array; contentType: string; filename: string }) => Promise<string>;
  writeNote: (transcript: string) => Promise<{ medicalPractice: string; noteClinical: string }>;
  codeNote: (note: string) => { icd10: VisitCode[]; billingCodes: VisitCode[] };
  save: (patch: VisitSnapshot) => Promise<void>;
  now?: () => string;
};

function stamp(io: VisitIo, step: string): EncounterProgress {
  return { step, startedAt: io.now?.() ?? new Date().toISOString() };
}

export async function runVisitPipeline(start: VisitSnapshot, io: VisitIo): Promise<VisitSnapshot> {
  let visit: VisitSnapshot = { ...start, error: null };
  try {
    if (!visit.transcript.trim()) {
      const audioPath = visit.audioPath;
      if (!audioPath) throw new Error("The recording was not stored.");
      visit = { ...visit, status: "transcribing", progress: stamp(io, "transcribing") };
      await io.save(visit);
      const file = await io.download(audioPath);
      if (file.bytes.byteLength > audioByteLimit) {
        throw new Error("This recording is over 25 MB. Record a shorter visit.");
      }
      const contentType = file.contentType || visit.audioContentType || "audio/webm";
      const transcript = await io.transcribe({
        bytes: file.bytes,
        contentType,
        filename: `visit.${audioExtension(contentType)}`,
      });
      if (!transcript.trim()) throw new Error("The transcript came back empty.");
      visit = {
        ...visit,
        transcript: transcript.trim(),
        status: "generating",
        progress: stamp(io, "generating"),
      };
      await io.save(visit);
    }

    if (!visit.noteClinical.trim()) {
      if (visit.status !== "generating") {
        visit = { ...visit, status: "generating", progress: stamp(io, "generating") };
        await io.save(visit);
      }
      const note = await io.writeNote(visit.transcript);
      visit = {
        ...visit,
        medicalPractice: note.medicalPractice,
        noteClinical: note.noteClinical,
        status: "generating_icd10",
        progress: stamp(io, "generating_icd10"),
      };
      await io.save(visit);
    }

    const needsIcd = visit.icd10.length === 0;
    const needsCpt = visit.billingCodes.length === 0;
    if (needsIcd || needsCpt) {
      const coded = io.codeNote(visit.noteClinical);
      if (needsIcd) {
        visit = {
          ...visit,
          icd10: coded.icd10,
          status: "generating_icd10",
          progress: stamp(io, "generating_icd10"),
        };
        await io.save(visit);
      }
      if (needsCpt) {
        visit = {
          ...visit,
          billingCodes: coded.billingCodes,
          status: "generating_cpt",
          progress: stamp(io, "generating_cpt"),
        };
        await io.save(visit);
      }
    }

    visit = { ...visit, status: "review", progress: stamp(io, "review"), error: null };
    await io.save(visit);
    return visit;
  } catch (error) {
    const message = error instanceof Error ? error.message : "The visit could not be processed.";
    visit = {
      ...visit,
      status: "error",
      error: message.slice(0, 500),
      progress: stamp(io, "error"),
    };
    await io.save(visit);
    throw new Error(message);
  }
}
