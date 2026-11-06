import type { Allergy, InjuryCase, Medication, Patient, Problem, Sex } from "@/lib/rcm/types";
import { defaultDocuments, emptyInjuryCase, withChart } from "@/lib/rcm/chart";

/** Fields staff must confirm before chart write. Never invent tradingPartnerId. */
export type OnboardFieldConfidence = "high" | "medium" | "low" | "missing";

export type OnboardDraft = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: Sex;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
  payerName: string;
  memberId: string;
  reasonForVisit: string;
  medicalHistory: string;
  problems: Array<Pick<Problem, "name" | "icd" | "status" | "onset">>;
  medications: Array<Pick<Medication, "name" | "dose" | "frequency" | "status">>;
  allergies: Array<Pick<Allergy, "substance" | "reaction" | "severity">>;
  injuryCase: Pick<
    InjuryCase,
    | "caseNumber"
    | "claimNumber"
    | "dateOfInjury"
    | "description"
    | "carrierName"
    | "attorneyName"
    | "attorneyFirm"
    | "attorneyPhone"
    | "attorneyEmail"
    | "notes"
  > | null;
  documentHints: Array<"outside-records" | "photo-id" | "insurance-card" | "no-fault-comp" | "outside-imaging">;
  fieldConfidence: Partial<Record<keyof OnboardDraft, OnboardFieldConfidence>>;
  warnings: string[];
  sourceSummary: string;
};

export const emptyOnboardDraft = (): OnboardDraft => ({
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  sex: "unknown",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "",
  postalCode: "",
  payerName: "",
  memberId: "",
  reasonForVisit: "",
  medicalHistory: "",
  problems: [],
  medications: [],
  allergies: [],
  injuryCase: null,
  documentHints: ["outside-records"],
  fieldConfidence: {},
  warnings: [],
  sourceSummary: "",
});

const onboardSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    firstName: { type: "string" },
    lastName: { type: "string" },
    dateOfBirth: { type: "string", description: "YYYY-MM-DD when known, else empty" },
    sex: { type: "string", enum: ["female", "male", "other", "unknown"] },
    phone: { type: "string" },
    email: { type: "string" },
    address: { type: "string" },
    city: { type: "string" },
    state: { type: "string" },
    postalCode: { type: "string" },
    payerName: { type: "string" },
    memberId: { type: "string" },
    reasonForVisit: { type: "string" },
    medicalHistory: { type: "string" },
    problems: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          icd: { type: "string" },
          status: { type: "string", enum: ["active", "resolved"] },
          onset: { type: "string" },
        },
        required: ["name", "icd", "status", "onset"],
      },
    },
    medications: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          dose: { type: "string" },
          frequency: { type: "string" },
          status: { type: "string", enum: ["active", "stopped"] },
        },
        required: ["name", "dose", "frequency", "status"],
      },
    },
    allergies: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          substance: { type: "string" },
          reaction: { type: "string" },
          severity: { type: "string", enum: ["mild", "moderate", "severe", "unknown"] },
        },
        required: ["substance", "reaction", "severity"],
      },
    },
    injuryCase: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            caseNumber: { type: "string" },
            claimNumber: { type: "string" },
            dateOfInjury: { type: "string" },
            description: { type: "string" },
            carrierName: { type: "string" },
            attorneyName: { type: "string" },
            attorneyFirm: { type: "string" },
            attorneyPhone: { type: "string" },
            attorneyEmail: { type: "string" },
            notes: { type: "string" },
          },
          required: [
            "caseNumber",
            "claimNumber",
            "dateOfInjury",
            "description",
            "carrierName",
            "attorneyName",
            "attorneyFirm",
            "attorneyPhone",
            "attorneyEmail",
            "notes",
          ],
        },
      ],
    },
    documentHints: {
      type: "array",
      items: {
        type: "string",
        enum: ["outside-records", "photo-id", "insurance-card", "no-fault-comp", "outside-imaging"],
      },
    },
    warnings: { type: "array", items: { type: "string" } },
    sourceSummary: { type: "string" },
  },
  required: [
    "firstName",
    "lastName",
    "dateOfBirth",
    "sex",
    "phone",
    "email",
    "address",
    "city",
    "state",
    "postalCode",
    "payerName",
    "memberId",
    "reasonForVisit",
    "medicalHistory",
    "problems",
    "medications",
    "allergies",
    "injuryCase",
    "documentHints",
    "warnings",
    "sourceSummary",
  ],
} as const;

const instructions = `You mine outside medical records for a spine practice chart draft.
Return JSON only. Leave a field empty when the document does not clearly state it.
Never invent email, phone, address, member id, or insurance payer. Never invent Stedi trading partner ids.
Prefer billable ICD-10 codes only when they appear in the packet; otherwise put the condition name and leave icd empty.
Map MVA / no-fault / NF / workers' compensation / DOI into injuryCase when present.
reasonForVisit should be a short staff-facing summary from HPI or chief complaint.
documentHints: include photo-id / insurance-card only if those pages appear; always include outside-records for clinical packets; no-fault-comp when NF/WC papers appear; outside-imaging when MRI/CT reports appear.
warnings: list gaps staff must fill (missing phone, email, member id, etc.).`;

type ResponsePayload = {
  output_text?: string;
  output?: { content?: { text?: string; type?: string }[] }[];
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

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asSex(value: unknown): Sex {
  return value === "female" || value === "male" || value === "other" || value === "unknown" ? value : "unknown";
}

export function normalizeOnboardDraft(raw: unknown): OnboardDraft {
  const base = emptyOnboardDraft();
  if (!raw || typeof raw !== "object") return base;
  const data = raw as Record<string, unknown>;
  base.firstName = asString(data.firstName);
  base.lastName = asString(data.lastName);
  base.dateOfBirth = asString(data.dateOfBirth).slice(0, 10);
  base.sex = asSex(data.sex);
  base.phone = asString(data.phone);
  base.email = asString(data.email);
  base.address = asString(data.address);
  base.city = asString(data.city);
  base.state = asString(data.state);
  base.postalCode = asString(data.postalCode);
  base.payerName = asString(data.payerName);
  base.memberId = asString(data.memberId);
  base.reasonForVisit = asString(data.reasonForVisit);
  base.medicalHistory = asString(data.medicalHistory);
  base.sourceSummary = asString(data.sourceSummary);
  base.warnings = Array.isArray(data.warnings) ? data.warnings.map(asString).filter(Boolean) : [];
  base.documentHints = Array.isArray(data.documentHints)
    ? (data.documentHints.filter(
        (item): item is OnboardDraft["documentHints"][number] =>
          item === "outside-records" ||
          item === "photo-id" ||
          item === "insurance-card" ||
          item === "no-fault-comp" ||
          item === "outside-imaging",
      ) as OnboardDraft["documentHints"])
    : ["outside-records"];
  if (!base.documentHints.includes("outside-records")) base.documentHints.unshift("outside-records");

  base.problems = Array.isArray(data.problems)
    ? data.problems
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const name = asString(row.name);
          if (!name) return null;
          return {
            name,
            icd: asString(row.icd),
            status: row.status === "resolved" ? ("resolved" as const) : ("active" as const),
            onset: asString(row.onset),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .slice(0, 20)
    : [];

  base.medications = Array.isArray(data.medications)
    ? data.medications
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const name = asString(row.name);
          if (!name) return null;
          return {
            name,
            dose: asString(row.dose),
            frequency: asString(row.frequency),
            status: row.status === "stopped" ? ("stopped" as const) : ("active" as const),
          };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .slice(0, 30)
    : [];

  base.allergies = Array.isArray(data.allergies)
    ? data.allergies
        .map((item) => {
          if (!item || typeof item !== "object") return null;
          const row = item as Record<string, unknown>;
          const substance = asString(row.substance);
          if (!substance) return null;
          const severity: Allergy["severity"] =
            row.severity === "mild" || row.severity === "moderate" || row.severity === "severe"
              ? row.severity
              : "unknown";
          return { substance, reaction: asString(row.reaction), severity };
        })
        .filter((item): item is NonNullable<typeof item> => item !== null)
        .slice(0, 20)
    : [];

  if (data.injuryCase && typeof data.injuryCase === "object") {
    const row = data.injuryCase as Record<string, unknown>;
    const draft = {
      caseNumber: asString(row.caseNumber),
      claimNumber: asString(row.claimNumber),
      dateOfInjury: asString(row.dateOfInjury).slice(0, 10),
      description: asString(row.description),
      carrierName: asString(row.carrierName),
      attorneyName: asString(row.attorneyName),
      attorneyFirm: asString(row.attorneyFirm),
      attorneyPhone: asString(row.attorneyPhone),
      attorneyEmail: asString(row.attorneyEmail),
      notes: asString(row.notes),
    };
    if (Object.values(draft).some(Boolean)) base.injuryCase = draft;
  }

  const required: Array<keyof OnboardDraft> = ["firstName", "lastName", "dateOfBirth"];
  for (const key of required) {
    const value = base[key];
    base.fieldConfidence[key] = typeof value === "string" && value ? "high" : "missing";
  }
  for (const key of ["phone", "email", "memberId", "payerName"] as const) {
    base.fieldConfidence[key] = base[key] ? "medium" : "missing";
  }
  if (!base.phone) base.warnings.push("Phone missing — still required for intake/claims contact.");
  if (!base.email) base.warnings.push("Email missing — patient portal invite needs an email.");
  if (!base.memberId) base.warnings.push("Member id missing — upload insurance card or enter manually before claim submit.");
  if (!base.payerName) base.warnings.push("Payer name missing — pick Stedi trading partner in claim form; never invent it.");

  return base;
}

/** Prefer clinical pages; drop attorney noise; cap tokens for mining. */
export function buildMinerCorpus(input: {
  text: string;
  pages?: { page: number; text: string; label: string }[];
  formFields?: { name: string; value: string }[];
  tables?: { page: number; rows: string[][] }[];
  maxChars?: number;
}) {
  const maxChars = input.maxChars ?? 48_000;
  const parts: string[] = [];
  if (input.formFields?.length) {
    parts.push(
      "=== FORM FIELDS ===\n" +
        input.formFields.map((field) => `${field.name}: ${field.value}`).join("\n"),
    );
  }
  if (input.pages?.length) {
    const preferred = input.pages.filter((page) =>
      ["consult", "imaging", "emg_ncv", "pt_note", "intake_form", "insurance_card", "photo_id", "other"].includes(
        page.label,
      ),
    );
    const usable = preferred.filter((page) => page.label !== "attorney_noise");
    const ordered = [
      ...usable.filter((page) => ["consult", "intake_form", "photo_id", "insurance_card"].includes(page.label)),
      ...usable.filter((page) => ["imaging", "emg_ncv"].includes(page.label)),
      ...usable.filter((page) => !["consult", "intake_form", "photo_id", "insurance_card", "imaging", "emg_ncv"].includes(page.label)),
    ];
    for (const page of ordered) {
      parts.push(`=== PAGE ${page.page} (${page.label}) ===\n${page.text}`);
    }
  } else if (input.text.trim()) {
    parts.push(input.text);
  }
  if (input.tables?.length) {
    for (const table of input.tables.slice(0, 20)) {
      const body = table.rows.map((row) => row.join(" | ")).join("\n");
      parts.push(`=== TABLE page ${table.page} ===\n${body}`);
    }
  }
  const joined = parts.join("\n\n");
  return joined.length > maxChars ? joined.slice(0, maxChars) : joined;
}

export async function mineOnboardDraft(corpus: string): Promise<OnboardDraft> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const draft = emptyOnboardDraft();
    draft.warnings.push("OPENAI_API_KEY is not configured — OCR text was extracted but not mined.");
    draft.sourceSummary = corpus.slice(0, 400);
    return draft;
  }
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: 3000,
      text: {
        format: {
          type: "json_schema",
          name: "outside_records_onboard_draft",
          strict: true,
          schema: onboardSchema,
        },
      },
      input: [
        { role: "system", content: instructions },
        { role: "user", content: corpus },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const payload = (await response.json()) as ResponsePayload;
  if (!response.ok) {
    const draft = emptyOnboardDraft();
    draft.warnings.push(payload.error?.message?.slice(0, 300) || "Mining failed.");
    return draft;
  }
  const text = responseText(payload).trim();
  if (!text) {
    const draft = emptyOnboardDraft();
    draft.warnings.push("Mining returned empty output.");
    return draft;
  }
  try {
    return normalizeOnboardDraft(JSON.parse(text) as unknown);
  } catch {
    const draft = emptyOnboardDraft();
    draft.warnings.push("Mining returned invalid JSON.");
    return draft;
  }
}

/** Document slots cleared after staff confirms OCR onboard (gap policy). */
export function applyOnboardDocumentHints(
  documents: Patient["documents"],
  hints: OnboardDraft["documentHints"],
  note: string,
): Patient["documents"] {
  const next = documents.map((item) => ({ ...item }));
  for (const hint of hints) {
    const slot = next.find((item) => item.id === hint);
    if (!slot) continue;
    if (slot.status === "missing") {
      slot.status = "received";
      slot.note = note || "Imported from outside records OCR";
    }
  }
  return next;
}

export function patientFromOnboardDraft(draft: OnboardDraft, id: string): Patient {
  const input = {
    firstName: draft.firstName.trim() || "Unknown",
    lastName: draft.lastName.trim() || "Patient",
    dateOfBirth: draft.dateOfBirth,
    sex: draft.sex,
    memberId: draft.memberId,
    payerName: draft.payerName || "Self-pay",
    phone: draft.phone,
    email: draft.email,
    address: draft.address,
    city: draft.city,
    state: draft.state,
    postalCode: draft.postalCode,
  };
  const note = draft.sourceSummary || "Outside records OCR import";
  const documents = applyOnboardDocumentHints(defaultDocuments(), draft.documentHints, note);
  const cases =
    draft.injuryCase && Object.values(draft.injuryCase).some(Boolean)
      ? [{ ...emptyInjuryCase(`case_${id}`), ...draft.injuryCase, attorneyAddress: "" }]
      : [];
  const nid = () => `id_${crypto.randomUUID().slice(0, 8)}`;
  return {
    ...withChart(input, {
      medicalHistory: [draft.reasonForVisit, draft.medicalHistory].filter(Boolean).join("\n\n"),
      problems: draft.problems.map((problem) => ({ id: nid(), ...problem })),
      medications: draft.medications.map((med) => ({ id: nid(), ...med })),
      allergies: draft.allergies.map((allergy) => ({ id: nid(), ...allergy })),
      allergiesReviewed: draft.allergies.length > 0,
      documents,
      cases,
      accountNotes: draft.warnings.length
        ? [
            {
              id: nid(),
              body: `OCR onboard gaps: ${draft.warnings.join(" ")}`,
              audience: "front_desk",
              createdAt: new Date().toISOString(),
              resolved: false,
            },
          ]
        : [],
    }),
    id,
    createdAt: new Date().toISOString(),
    mrn: "",
  };
}
