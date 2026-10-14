export const encounterStatuses = [
  "uploaded",
  "transcribing",
  "generating",
  "generating_icd10",
  "generating_cpt",
  "review",
  "approved",
  "error",
] as const;

export type EncounterStatus = (typeof encounterStatuses)[number];

export type VisitCode = {
  code: string;
  description: string;
  level: 1 | 2 | 3;
  approved: boolean;
};

export type EncounterProgress = {
  step: string;
  startedAt: string;
};

export type Encounter = {
  id: string;
  clinicianId: string;
  patientLabel: string;
  appointmentId: string;
  noteApproved: boolean;
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
  createdAt: string;
  updatedAt: string;
};

export const audioByteLimit = 25 * 1024 * 1024;

const audioTypes = new Set([
  "audio/webm",
  "audio/mp4",
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/m4a",
  "audio/x-m4a",
  "video/webm",
  "video/mp4",
]);

export function audioContentType(value: string) {
  return value.split(";")[0]?.trim().toLowerCase() ?? "";
}

export function acceptedAudioType(value: string) {
  return audioTypes.has(audioContentType(value));
}

export function audioExtension(value: string) {
  switch (audioContentType(value)) {
    case "audio/mpeg":
      return "mp3";
    case "audio/mp4":
    case "audio/m4a":
    case "audio/x-m4a":
      return "m4a";
    case "audio/wav":
    case "audio/x-wav":
      return "wav";
    case "video/mp4":
      return "mp4";
    default:
      return "webm";
  }
}

export function activeEncounter(status: EncounterStatus) {
  return status === "transcribing" || status === "generating" || status === "generating_icd10" || status === "generating_cpt";
}

export function audioPaths(value: string | null) {
  if (!value) return [];
  return value
    .split("\n")
    .map((path) => path.trim())
    .filter(Boolean);
}
