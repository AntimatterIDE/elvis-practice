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
  surgicalHistory: string;
  pcpName: string;
  pcpPhone: string;
  referringName: string;
  referringPhone: string;
  pharmacyName: string;
  pharmacyPhone: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  imagingFindings: string;
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
  surgicalHistory: "",
  pcpName: "",
  pcpPhone: "",
  referringName: "",
  referringPhone: "",
  pharmacyName: "",
  pharmacyPhone: "",
  emergencyName: "",
  emergencyPhone: "",
  emergencyRelation: "",
  imagingFindings: "",
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
    surgicalHistory: { type: "string" },
    pcpName: { type: "string" },
    pcpPhone: { type: "string" },
    referringName: { type: "string" },
    referringPhone: { type: "string" },
    pharmacyName: { type: "string" },
    pharmacyPhone: { type: "string" },
    emergencyName: { type: "string" },
    emergencyPhone: { type: "string" },
    emergencyRelation: { type: "string" },
    imagingFindings: { type: "string" },
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
    "surgicalHistory",
    "pcpName",
    "pcpPhone",
    "referringName",
    "referringPhone",
    "pharmacyName",
    "pharmacyPhone",
    "emergencyName",
    "emergencyPhone",
    "emergencyRelation",
    "imagingFindings",
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
Fill surgicalHistory, PCP, referring, pharmacy, and emergency contact only when clearly stated.
imagingFindings: short MRI/CT/EMG impression summary when imaging pages appear.
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
  base.surgicalHistory = asString(data.surgicalHistory);
  base.pcpName = asString(data.pcpName);
  base.pcpPhone = asString(data.pcpPhone);
  base.referringName = asString(data.referringName);
  base.referringPhone = asString(data.referringPhone);
  base.pharmacyName = asString(data.pharmacyName);
  base.pharmacyPhone = asString(data.pharmacyPhone);
  base.emergencyName = asString(data.emergencyName);
  base.emergencyPhone = asString(data.emergencyPhone);
  base.emergencyRelation = asString(data.emergencyRelation);
  base.imagingFindings = asString(data.imagingFindings);
  base.sourceSummary = asString(data.sourceSummary);
  // Ignore miner-emitted warnings — three-pass merges leave stale "missing X" after fields fill.
  base.warnings = [];
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
  return refreshOnboardWarnings(base);
}

/** Rebuild soft gaps from the current draft fields (safe after merge or staff edits). */
export function refreshOnboardWarnings(draft: OnboardDraft): OnboardDraft {
  const warnings: string[] = [];
  if (!draft.firstName.trim() || !draft.lastName.trim()) {
    warnings.push("Confirm first and last name before saving.");
  }
  if (!draft.phone.trim()) warnings.push("Phone missing — still required for intake/claims contact.");
  if (!draft.email.trim()) warnings.push("Email missing — patient portal invite needs an email.");
  if (!draft.memberId.trim()) {
    warnings.push("Member id missing — upload insurance card or enter manually before claim submit.");
  }
  if (!draft.payerName.trim()) {
    warnings.push("Payer name missing — pick Stedi trading partner in claim form; never invent it.");
  }
  return { ...draft, warnings };
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

/** Chart slots that should receive packet bytes on confirm. */
export function chartSlotsForOnboardFiles(
  files: Array<{ name: string; type?: string }>,
  hints: OnboardDraft["documentHints"],
  pageLabels: { label: string }[] = [],
): string[] {
  const slots = new Set<string>();
  const labels = new Set(pageLabels.map((item) => item.label));
  const hasPdf = files.some((file) => (file.type || "").includes("pdf") || /\.pdf$/i.test(file.name));

  if (hasPdf || hints.includes("outside-records")) slots.add("outside-records");
  if (hints.includes("outside-imaging") || labels.has("imaging") || labels.has("emg_ncv")) {
    slots.add("outside-imaging");
  }
  if (hints.includes("no-fault-comp")) slots.add("no-fault-comp");
  if (hints.includes("photo-id") || labels.has("photo_id")) slots.add("photo-id");
  if (hints.includes("insurance-card") || labels.has("insurance_card")) slots.add("insurance-card");
  if (labels.has("consult")) slots.add("consultation-report");
  if (labels.has("pt_note")) slots.add("follow-up-reports");

  if (!slots.size) slots.add("outside-records");
  return [...slots];
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
    } else if (note && !slot.note.includes(note.slice(0, 40))) {
      slot.note = [slot.note, note].filter(Boolean).join(" · ").slice(0, 240);
    }
  }
  return next;
}

/** Fold OCR corpus into history + injury notes so long clinical text has a chart home. */
export function enrichOnboardDraftFromCorpus(draft: OnboardDraft, corpus: string): OnboardDraft {
  const excerpt = corpus.replace(/\s+/g, " ").trim().slice(0, 6_000);
  if (!excerpt) return draft;
  const next = { ...draft };
  if (!next.medicalHistory.includes(excerpt.slice(0, 80))) {
    next.medicalHistory = [next.medicalHistory, `Outside records excerpt:\n${excerpt}`]
      .filter(Boolean)
      .join("\n\n")
      .trim();
  }

  if (next.injuryCase) {
    const injury = { ...next.injuryCase };
    if (!injury.notes.includes("Outside records excerpt")) {
      injury.notes = [injury.notes, `Outside records excerpt:\n${excerpt.slice(0, 2_500)}`]
        .filter(Boolean)
        .join("\n\n")
        .trim();
    }
    next.injuryCase = injury;
  }

  if (!next.sourceSummary) {
    next.sourceSummary = excerpt.slice(0, 240);
  }
  return next;
}

export function markSlotsFromUploads(
  documents: Patient["documents"],
  uploaded: { slotId: string; fileName: string }[],
): Patient["documents"] {
  if (!uploaded.length) return documents;
  const bySlot = new Map<string, string[]>();
  for (const item of uploaded) {
    const list = bySlot.get(item.slotId) ?? [];
    list.push(item.fileName);
    bySlot.set(item.slotId, list);
  }
  return documents.map((doc) => {
    const names = bySlot.get(doc.id);
    if (!names?.length) return doc;
    return {
      ...doc,
      status: doc.status === "missing" ? "received" : doc.status,
      note: `Filed: ${[...new Set(names)].join(", ")}`.slice(0, 240),
    };
  });
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
      ? [
          {
            ...emptyInjuryCase(`case_${id}`),
            ...draft.injuryCase,
            attorneyAddress: "",
            notes: draft.injuryCase.notes || draft.injuryCase.description || "",
          },
        ]
      : [];
  const nid = () => `id_${crypto.randomUUID().slice(0, 8)}`;
  const historyParts = [draft.reasonForVisit, draft.medicalHistory];
  if (draft.imagingFindings) historyParts.push(`Imaging findings:\n${draft.imagingFindings}`);
  const medicalHistory = historyParts.filter(Boolean).join("\n\n");
  return {
    ...withChart(input, {
      medicalHistory,
      surgicalHistory: draft.surgicalHistory,
      pcpName: draft.pcpName,
      pcpPhone: draft.pcpPhone,
      referringName: draft.referringName,
      referringPhone: draft.referringPhone,
      pharmacyName: draft.pharmacyName,
      pharmacyPhone: draft.pharmacyPhone,
      emergencyName: draft.emergencyName,
      emergencyPhone: draft.emergencyPhone,
      emergencyRelation: draft.emergencyRelation,
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

function pickFilled(base: string, next: string) {
  return next.trim() ? next.trim() : base;
}

/** Merge three section drafts; prefer non-empty; union lists and hints. */
export function mergeSectionDrafts(parts: OnboardDraft[]): OnboardDraft {
  const out = emptyOnboardDraft();
  if (!parts.length) return out;
  for (const part of parts) {
    out.firstName = pickFilled(out.firstName, part.firstName);
    out.lastName = pickFilled(out.lastName, part.lastName);
    out.dateOfBirth = pickFilled(out.dateOfBirth, part.dateOfBirth);
    if (out.sex === "unknown" && part.sex !== "unknown") out.sex = part.sex;
    out.phone = pickFilled(out.phone, part.phone);
    out.email = pickFilled(out.email, part.email);
    out.address = pickFilled(out.address, part.address);
    out.city = pickFilled(out.city, part.city);
    out.state = pickFilled(out.state, part.state);
    out.postalCode = pickFilled(out.postalCode, part.postalCode);
    out.payerName = pickFilled(out.payerName, part.payerName);
    out.memberId = pickFilled(out.memberId, part.memberId);
    out.reasonForVisit = pickFilled(out.reasonForVisit, part.reasonForVisit);
    out.medicalHistory = [out.medicalHistory, part.medicalHistory].filter(Boolean).join("\n\n");
    out.surgicalHistory = pickFilled(out.surgicalHistory, part.surgicalHistory);
    out.pcpName = pickFilled(out.pcpName, part.pcpName);
    out.pcpPhone = pickFilled(out.pcpPhone, part.pcpPhone);
    out.referringName = pickFilled(out.referringName, part.referringName);
    out.referringPhone = pickFilled(out.referringPhone, part.referringPhone);
    out.pharmacyName = pickFilled(out.pharmacyName, part.pharmacyName);
    out.pharmacyPhone = pickFilled(out.pharmacyPhone, part.pharmacyPhone);
    out.emergencyName = pickFilled(out.emergencyName, part.emergencyName);
    out.emergencyPhone = pickFilled(out.emergencyPhone, part.emergencyPhone);
    out.emergencyRelation = pickFilled(out.emergencyRelation, part.emergencyRelation);
    out.imagingFindings = pickFilled(out.imagingFindings, part.imagingFindings);
    out.sourceSummary = pickFilled(out.sourceSummary, part.sourceSummary);
    out.problems = [...out.problems, ...part.problems].slice(0, 20);
    out.medications = [...out.medications, ...part.medications].slice(0, 30);
    out.allergies = [...out.allergies, ...part.allergies].slice(0, 20);
    if (!out.injuryCase && part.injuryCase) out.injuryCase = part.injuryCase;
    else if (out.injuryCase && part.injuryCase) {
      const a = out.injuryCase;
      const b = part.injuryCase;
      out.injuryCase = {
        caseNumber: pickFilled(a.caseNumber, b.caseNumber),
        claimNumber: pickFilled(a.claimNumber, b.claimNumber),
        dateOfInjury: pickFilled(a.dateOfInjury, b.dateOfInjury),
        description: pickFilled(a.description, b.description),
        carrierName: pickFilled(a.carrierName, b.carrierName),
        attorneyName: pickFilled(a.attorneyName, b.attorneyName),
        attorneyFirm: pickFilled(a.attorneyFirm, b.attorneyFirm),
        attorneyPhone: pickFilled(a.attorneyPhone, b.attorneyPhone),
        attorneyEmail: pickFilled(a.attorneyEmail, b.attorneyEmail),
        notes: [a.notes, b.notes].filter(Boolean).join("\n\n"),
      };
    }
    for (const hint of part.documentHints) {
      if (!out.documentHints.includes(hint)) out.documentHints.push(hint);
    }
  }
  if (!out.documentHints.includes("outside-records")) out.documentHints.unshift("outside-records");
  return normalizeOnboardDraft(out);
}

const DEMOGRAPHICS_LABELS = new Set(["photo_id", "insurance_card", "intake_form", "other"]);
const CLINICAL_LABELS = new Set(["consult", "pt_note", "intake_form"]);
const INJURY_LABELS = new Set(["imaging", "emg_ncv", "other"]);

export function buildSectionCorpus(
  input: Parameters<typeof buildMinerCorpus>[0],
  section: "demographics" | "clinical" | "injury",
  maxChars = 24_000,
) {
  const labels =
    section === "demographics" ? DEMOGRAPHICS_LABELS : section === "clinical" ? CLINICAL_LABELS : INJURY_LABELS;
  const pages = (input.pages ?? []).filter((page) => labels.has(page.label) && page.label !== "attorney_noise");
  if (pages.length) {
    return buildMinerCorpus({ ...input, pages, text: "", maxChars });
  }
  return buildMinerCorpus({ ...input, maxChars });
}

const sectionFocus: Record<"demographics" | "clinical" | "injury", string> = {
  demographics:
    "Focus on demographics, contact, address, insurance payer/member id, emergency contact, PCP, referring, and pharmacy. Leave clinical lists empty unless clearly on ID/card pages.",
  clinical:
    "Focus on chief complaint, medical and surgical history, problems, medications, and allergies. Leave injuryCase null unless DOI is in these pages.",
  injury:
    "Focus on injury/no-fault/workers' comp case fields, imaging/EMG findings, and documentHints for imaging or no-fault papers.",
};

/** Three parallel section mines, then merge + corpus enrich. */
export async function mineOnboardDraftSectioned(
  input: Parameters<typeof buildMinerCorpus>[0],
): Promise<{ draft: OnboardDraft; corpus: string }> {
  const fullCorpus = buildMinerCorpus(input);
  const [demographics, clinical, injury] = await Promise.all([
    mineOnboardDraft(
      `${sectionFocus.demographics}\n\n${buildSectionCorpus(input, "demographics")}`,
    ),
    mineOnboardDraft(`${sectionFocus.clinical}\n\n${buildSectionCorpus(input, "clinical")}`),
    mineOnboardDraft(`${sectionFocus.injury}\n\n${buildSectionCorpus(input, "injury")}`),
  ]);
  const merged = mergeSectionDrafts([demographics, clinical, injury]);
  return { draft: enrichOnboardDraftFromCorpus(merged, fullCorpus), corpus: fullCorpus };
}

/** Map draft values onto intake field ids via mapsTo. */
export function intakeAnswersFromOnboardDraft(
  fields: Array<{ id: string; mapsTo: string | null }>,
  draft: OnboardDraft,
): Record<string, string> {
  const byMap: Partial<Record<string, string>> = {
    firstName: draft.firstName,
    lastName: draft.lastName,
    dateOfBirth: draft.dateOfBirth,
    sex: draft.sex === "unknown" ? "" : draft.sex,
    phone: draft.phone,
    email: draft.email,
    address: draft.address,
    city: draft.city,
    state: draft.state,
    postalCode: draft.postalCode,
    payerName: draft.payerName,
    memberId: draft.memberId,
    emergencyName: draft.emergencyName,
    emergencyPhone: draft.emergencyPhone,
    emergencyRelation: draft.emergencyRelation,
    pharmacyName: draft.pharmacyName,
    pharmacyPhone: draft.pharmacyPhone,
  };
  const answers: Record<string, string> = {};
  for (const field of fields) {
    if (!field.mapsTo) continue;
    const value = byMap[field.mapsTo]?.trim();
    if (value) answers[field.id] = value;
  }
  return answers;
}
