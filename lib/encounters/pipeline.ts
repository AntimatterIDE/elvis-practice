import {
  audioByteLimit,
  audioExtension,
  audioPaths,
  type EncounterProgress,
  type EncounterStatus,
  type VisitCode,
  type VisitLine,
} from "@/lib/encounters/types";

export type VisitSnapshot = {
  id: string;
  status: EncounterStatus;
  audioPath: string | null;
  audioContentType: string;
  transcript: string;
  medicalPractice: string;
  noteClinical: string;
  icd10: VisitCode[];
  billingCodes: VisitLine[];
  progress: EncounterProgress | null;
  error: string | null;
};

export type VisitIo = {
  download: (path: string) => Promise<{ bytes: Uint8Array; contentType: string }>;
  transcribe: (file: { bytes: Uint8Array; contentType: string; filename: string }) => Promise<string>;
  writeNote: (transcript: string) => Promise<{ medicalPractice: string; noteClinical: string }>;
  /** Optional. When present and spine suggestions are enabled, fills review codes from facts+rules. */
  suggestCodes?: (note: string) => Promise<{ icd10: VisitCode[]; billingCodes: VisitLine[] }>;
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
      const paths = audioPaths(visit.audioPath);
      if (paths.length === 0) throw new Error("The recording was not stored.");
      visit = { ...visit, status: "transcribing", progress: stamp(io, "transcribing") };
      await io.save(visit);
      const pieces: string[] = [];
      for (const [index, audioPath] of paths.entries()) {
        const file = await io.download(audioPath);
        if (file.bytes.byteLength > audioByteLimit) {
          throw new Error("One segment of this recording is over 25 MB. Record a shorter stretch, then continue the same visit.");
        }
        if (file.bytes.byteLength < 1) continue;
        const contentType = file.contentType || visit.audioContentType || "audio/webm";
        const transcript = await io.transcribe({
          bytes: file.bytes,
          contentType,
          filename: `part-${index}.${audioExtension(contentType)}`,
        });
        if (transcript.trim()) pieces.push(transcript.trim());
      }
      if (pieces.length === 0) throw new Error("The transcript came back empty.");
      visit = {
        ...visit,
        transcript: pieces.join("\n\n"),
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
      visit = { ...visit, medicalPractice: note.medicalPractice, noteClinical: note.noteClinical };
    }

    // Suggestions stay empty unless the caller wires suggestCodes and enables SPINE_CODING_SUGGESTIONS.
    if (io.suggestCodes && !visit.icd10.length && !visit.billingCodes.length && visit.noteClinical.trim()) {
      const suggested = await io.suggestCodes(visit.noteClinical);
      visit = { ...visit, icd10: suggested.icd10, billingCodes: suggested.billingCodes };
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
