import "server-only";
import { readServerEnv } from "@/lib/env";
import { practice } from "@/lib/site";

/** Structured clinical letter — same information as the visit note, attorney-facing form. */
export type ClinicalLetterDraft = {
  title: string;
  patientName: string;
  dateOfBirth: string;
  dateOfService: string;
  reasonForEvaluation: string;
  historyOfPresentIllness: string;
  relevantHistory: string;
  diagnosticStudies: string;
  examination: string;
  assessment: string[];
  discussionAndPlan: string;
  physicianName: string;
  physicianTitle: string;
};

export type ClinicalLetterContext = {
  patientName: string;
  dateOfBirth?: string;
  dateOfService?: string;
  phone?: string;
  payerName?: string;
  memberId?: string;
  medicalHistory?: string;
  injuryDescription?: string;
  dateOfInjury?: string;
  noteClinical: string;
  medicalPractice?: string;
  diagnoses?: string[];
};

const letterModel = "gpt-5-mini-2025-08-07";

function apiKey() {
  const key = readServerEnv().OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI is not configured.");
  return key;
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringList(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value.map((item) => asString(item)).filter(Boolean).slice(0, 20);
}

export function emptyClinicalLetter(context: ClinicalLetterContext): ClinicalLetterDraft {
  return {
    title: "Clinical Letter",
    patientName: context.patientName.trim() || "Patient",
    dateOfBirth: (context.dateOfBirth || "").trim().slice(0, 10),
    dateOfService: (context.dateOfService || new Date().toISOString().slice(0, 10)).slice(0, 10),
    reasonForEvaluation: "",
    historyOfPresentIllness: "",
    relevantHistory: (context.medicalHistory || "").trim().slice(0, 6_000),
    diagnosticStudies: "",
    examination: "",
    assessment: (context.diagnoses ?? []).filter(Boolean).slice(0, 12),
    discussionAndPlan: "",
    physicianName: practice.physicianName,
    physicianTitle: "Orthopedic Spine Surgeon",
  };
}

/** Normalize model JSON; never invent patient identity beyond context. */
export function normalizeClinicalLetter(raw: unknown, context: ClinicalLetterContext): ClinicalLetterDraft {
  const base = emptyClinicalLetter(context);
  if (!raw || typeof raw !== "object") return fallbackFromNote(context);
  const data = raw as Record<string, unknown>;
  const draft: ClinicalLetterDraft = {
    title: asString(data.title) || base.title,
    patientName: context.patientName.trim() || asString(data.patientName) || base.patientName,
    dateOfBirth: (context.dateOfBirth || asString(data.dateOfBirth) || "").slice(0, 10),
    dateOfService: (context.dateOfService || asString(data.dateOfService) || base.dateOfService).slice(0, 10),
    reasonForEvaluation: asString(data.reasonForEvaluation).slice(0, 4_000),
    historyOfPresentIllness: asString(data.historyOfPresentIllness).slice(0, 12_000),
    relevantHistory: asString(data.relevantHistory).slice(0, 8_000) || base.relevantHistory,
    diagnosticStudies: asString(data.diagnosticStudies).slice(0, 8_000),
    examination: asString(data.examination).slice(0, 8_000),
    assessment: asStringList(data.assessment).length ? asStringList(data.assessment) : base.assessment,
    discussionAndPlan: asString(data.discussionAndPlan).slice(0, 16_000),
    physicianName: practice.physicianName,
    physicianTitle: asString(data.physicianTitle) || base.physicianTitle,
  };
  if (!draft.historyOfPresentIllness && !draft.discussionAndPlan && !draft.reasonForEvaluation) {
    return fallbackFromNote(context);
  }
  return draft;
}

/** Deterministic fallback when the model returns empty/invalid JSON. */
export function fallbackFromNote(context: ClinicalLetterContext): ClinicalLetterDraft {
  const note = context.noteClinical.trim();
  const sections = splitSoap(note);
  return {
    ...emptyClinicalLetter(context),
    reasonForEvaluation: sections.subjective.slice(0, 1_500) || "Clinical visit.",
    historyOfPresentIllness: sections.subjective || note.slice(0, 8_000),
    relevantHistory: [context.medicalHistory, context.injuryDescription && context.dateOfInjury
      ? `Date of injury: ${context.dateOfInjury}. ${context.injuryDescription}`
      : context.injuryDescription]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 8_000),
    diagnosticStudies: sections.objective.slice(0, 6_000),
    examination: sections.objective.slice(0, 6_000),
    assessment: context.diagnoses?.length
      ? context.diagnoses
      : sections.assessment
          .split(/\n+/)
          .map((line) => line.replace(/^\d+[.)]\s*/, "").trim())
          .filter(Boolean)
          .slice(0, 12),
    discussionAndPlan: sections.plan || note.slice(0, 8_000),
  };
}

function splitSoap(note: string) {
  const buckets = { subjective: "", objective: "", assessment: "", plan: "" };
  const lines = note.split(/\n/);
  let current: keyof typeof buckets = "subjective";
  for (const line of lines) {
    const header = line.trim().toUpperCase();
    if (/^SUBJECTIVE\b/.test(header) || /^S:\s*$/.test(header) || header === "S") {
      current = "subjective";
      continue;
    }
    if (/^OBJECTIVE\b/.test(header) || /^O:\s*$/.test(header) || header === "O") {
      current = "objective";
      continue;
    }
    if (/^ASSESSMENT\b/.test(header) || /^A:\s*$/.test(header) || header === "A") {
      current = "assessment";
      continue;
    }
    if (/^PLAN\b/.test(header) || /^P:\s*$/.test(header) || header === "P") {
      current = "plan";
      continue;
    }
    buckets[current] += (buckets[current] ? "\n" : "") + line;
  }
  return {
    subjective: buckets.subjective.trim(),
    objective: buckets.objective.trim(),
    assessment: buckets.assessment.trim(),
    plan: buckets.plan.trim(),
  };
}

function letterInstructions() {
  return `You rewrite an existing clinical visit note into one attorney-facing Clinical Letter for an orthopedic spine practice.

Rules:
- Use ONLY facts present in the visit note and chart context. Do not invent diagnoses, MRI findings, exam scores, surgery plans, dates, or causality language that is not supported.
- If a section has no support in the source, leave that string empty ("").
- Keep clinical meaning identical; improve polish and letter structure.
- Assessment must be a JSON array of short numbered findings as plain strings (no leading numbers).
- Title should be "Clinical Letter" unless the note clearly states another visit type already present in the source.
- physicianName and physicianTitle will be overwritten by the practice; you may still return them.

Return ONLY JSON with keys:
title, patientName, dateOfBirth, dateOfService, reasonForEvaluation, historyOfPresentIllness, relevantHistory, diagnosticStudies, examination, assessment, discussionAndPlan, physicianName, physicianTitle`;
}

type ResponsePayload = {
  output_text?: string;
  output?: { content?: { text?: string }[] }[];
  error?: { message?: string };
};

function responseText(payload: ResponsePayload) {
  if (payload.output_text?.trim()) return payload.output_text;
  const parts: string[] = [];
  for (const item of payload.output ?? []) {
    for (const block of item.content ?? []) {
      if (block.text) parts.push(block.text);
    }
  }
  return parts.join("\n");
}

function parseJsonObject(text: string) {
  const trimmed = text.trim();
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced?.[1]?.trim() || trimmed;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1)) as unknown;
  } catch {
    return null;
  }
}

/** Rewrite visit note + chart context into a Clinical Letter draft. */
export async function writeClinicalLetter(context: ClinicalLetterContext): Promise<ClinicalLetterDraft> {
  if (!context.noteClinical.trim()) throw new Error("This visit does not have a note yet.");
  const chartBlock = [
    `Patient name: ${context.patientName}`,
    context.dateOfBirth ? `Date of birth: ${context.dateOfBirth}` : "",
    context.dateOfService ? `Date of service: ${context.dateOfService}` : "",
    context.phone ? `Phone: ${context.phone}` : "",
    context.payerName ? `Payer: ${context.payerName}` : "",
    context.memberId ? `Member id: ${context.memberId}` : "",
    context.dateOfInjury ? `Date of injury: ${context.dateOfInjury}` : "",
    context.injuryDescription ? `Injury: ${context.injuryDescription}` : "",
    context.medicalHistory ? `Chart medical history:\n${context.medicalHistory}` : "",
    context.diagnoses?.length ? `Suggested diagnoses: ${context.diagnoses.join("; ")}` : "",
  ]
    .filter(Boolean)
    .join("\n");

  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: letterModel,
      store: false,
      max_output_tokens: 3500,
      reasoning: { effort: "minimal" },
      text: { verbosity: "low", format: { type: "json_object" } },
      input: [
        { role: "system", content: letterInstructions() },
        {
          role: "user",
          content: `Chart context:\n${chartBlock}\n\nVisit note:\n${context.noteClinical.slice(0, 24_000)}`,
        },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const payload = (await response.json()) as ResponsePayload;
  if (!response.ok) {
    throw new Error(payload.error?.message?.slice(0, 500) || "The clinical letter could not be written.");
  }
  const parsed = parseJsonObject(responseText(payload));
  return normalizeClinicalLetter(parsed, context);
}
