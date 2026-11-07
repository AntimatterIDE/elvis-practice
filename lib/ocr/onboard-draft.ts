import type { Allergy, InjuryCase, Medication, Patient, Problem, Sex } from "@/lib/rcm/types";
import { defaultDocuments, emptyInjuryCase, withChart } from "@/lib/rcm/chart";
import { normalizeIcdCode } from "@/lib/ocr/icd-normalize";

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
If only ICD-9 appears, leave icd empty and put the legacy code in a short name suffix (e.g. "Cervical strain (847.0)") — never invent ICD-10 from ICD-9.
Map MVA / no-fault / NF / workers' compensation / DOI into injuryCase when present.
reasonForVisit: one short line from HPI or chief complaint (not a page dump).
medicalHistory: compact prose summary of past medical history only (a few sentences, under ~800 characters). Never paste raw OCR tables, machine settings, or full page text.
surgicalHistory: short list of prior surgeries when stated.
injuryCase.notes: short case narrative (mechanism, complaints, attorney) — not EMG tables or imaging technique.
imagingFindings: short MRI/CT/EMG impression bullets only (findings, not technique parameters).
Fill PCP, referring, pharmacy, and emergency contact only when clearly stated.
documentHints: include photo-id / insurance-card only if those pages appear; always include outside-records for clinical packets; no-fault-comp when NF/WC papers appear; outside-imaging when MRI/CT/EMG reports appear.
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

function normKey(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

const HONORIFICS = new Set(["mr", "mrs", "ms", "miss", "dr", "doctor", "patient", "pt"]);
/** Alone as the only name token these are discarded; OK as a surname after honorific strip. */
const JUNK_SOLO_NAMES = new Set(["sample", "unknown", "patient", "n/a", "na", "none", "test"]);
/** Role / label tokens that must never be treated as a person name. */
const ROLE_NAME_TOKENS = new Set([
  "referring",
  "physician",
  "provider",
  "radiologist",
  "technologist",
  "attending",
  "ordering",
  "unknown",
]);
const ROLE_NAME_PHRASES = new Set([
  "referring physician",
  "ordering physician",
  "attending physician",
  "referring provider",
  "patient name",
]);

function splitCamelCaseToken(token: string): string[] {
  const parts = token
    .replace(/([a-z])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .split(/\s+/)
    .filter(Boolean);
  return parts.length >= 2 ? parts : [token];
}

function stripHonorific(token: string) {
  return token.replace(/\./g, "").trim();
}

function isJunkNamePart(value: string) {
  const bare = stripHonorific(value).toLowerCase();
  if (!bare) return true;
  if (HONORIFICS.has(bare)) return true;
  if (JUNK_SOLO_NAMES.has(bare)) return true;
  if (ROLE_NAME_TOKENS.has(bare)) return true;
  if (/^[A-Z0-9_-]{25,}$/.test(value) && !/\s/.test(value)) return true;
  return false;
}

function looksCamelCaseBlob(value: string) {
  return /^[A-Za-z]+$/.test(value) && /[a-z][A-Z]/.test(value);
}

function isRoleOrJunkName(value: string) {
  return isJunkNamePart(value);
}

/** Split CamelCase blobs, drop honorifics/junk/role labels. */
export function refineIdentity(draft: OnboardDraft): OnboardDraft {
  let first = draft.firstName.trim();
  let last = draft.lastName.trim();

  if (first && !last && !/\s/.test(first)) {
    const parts = splitCamelCaseToken(first);
    if (parts.length >= 2) {
      first = parts[0] ?? "";
      last = parts.slice(1).join(" ");
    }
  }

  // Miner often puts Sample / SampleRadiculopathyCase — peel repeated first from CamelCase last.
  if (first && last && looksCamelCaseBlob(last)) {
    const parts = splitCamelCaseToken(last);
    if (parts.length >= 2) {
      if (parts[0]?.toLowerCase() === first.toLowerCase()) {
        last = parts.slice(1).join(" ");
      } else {
        last = parts.join(" ");
      }
    }
  }

  const firstParts = first.split(/\s+/).filter(Boolean);
  while (firstParts.length && HONORIFICS.has(stripHonorific(firstParts[0] ?? "").toLowerCase())) {
    firstParts.shift();
  }
  first = firstParts.join(" ");

  // Miner sometimes puts the honorific in lastName (e.g. Buzz / Mr.).
  if (last && HONORIFICS.has(stripHonorific(last).toLowerCase())) last = "";

  const joined = normKey(`${first} ${last}`);
  if (joined && ROLE_NAME_PHRASES.has(joined)) {
    first = "";
    last = "";
  } else if (first && last && isRoleOrJunkName(first) && isRoleOrJunkName(last)) {
    // Unknown Unknown / Referring Physician (token path)
    first = "";
    last = "";
  } else {
    // Role tokens in last (Physician) clear; junk surnames like Sample stay unless dual-junk above.
    if (last && ROLE_NAME_TOKENS.has(stripHonorific(last).toLowerCase())) last = "";
    // Reject junk/role labels only when they are the sole name token.
    if (!last && isRoleOrJunkName(first)) first = "";
  }

  return { ...draft, firstName: first, lastName: last };
}

type ProblemRow = OnboardDraft["problems"][number];
type MedRow = OnboardDraft["medications"][number];
type AllergyRow = OnboardDraft["allergies"][number];

function problemNameKey(name: string) {
  // Collapse "Cervical sprain/strain (847.0)" with "Cervical sprain/strain" for dedupe.
  return normKey(name.replace(/\s*\(\d{3}(?:\.\d{1,2})?\)\s*$/, "").replace(/\s*\([A-TV-Z][0-9][A-Z0-9.]*\)\s*$/i, ""));
}

/** Lift trailing ICD-9/10 from problem name into icd when empty; strip redundant suffix. */
export function liftIcdFromProblemName(row: ProblemRow): ProblemRow {
  const m = row.name.match(/\(([A-TV-Z][0-9][A-Z0-9.]{0,6}|\d{3}(?:\.\d{1,2})?)\)\s*$/i);
  if (!m?.[1]) return row;
  const normalized = normalizeIcdCode(m[1]);
  const cleanedName = row.name.replace(/\s*\([^)]+\)\s*$/, "").trim() || row.name;
  if (row.icd.trim()) {
    // Drop duplicate "(M54.12)" when icd already set.
    if (normalized.icd && normalized.icd.toUpperCase() === row.icd.trim().toUpperCase()) {
      return { ...row, name: cleanedName };
    }
    return row;
  }
  if (!normalized.icd) return row;
  return { ...row, icd: normalized.icd, name: cleanedName };
}

export function dedupeProblems(rows: ProblemRow[]): ProblemRow[] {
  const map = new Map<string, ProblemRow>();
  for (const raw of rows) {
    const row = liftIcdFromProblemName(raw);
    const key = problemNameKey(row.name);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, row);
      continue;
    }
    map.set(key, {
      name: prev.name.length >= row.name.length ? prev.name : row.name,
      icd: prev.icd || row.icd,
      onset: prev.onset || row.onset,
      status: prev.status === "resolved" || row.status === "resolved" ? "resolved" : "active",
    });
  }
  return [...map.values()].slice(0, 20);
}

export function dedupeMedications(rows: MedRow[]): MedRow[] {
  const map = new Map<string, MedRow>();
  for (const row of rows) {
    const key = `${normKey(row.name)}|${normKey(row.dose)}`;
    const prev = map.get(key);
    if (!prev) {
      map.set(key, row);
      continue;
    }
    map.set(key, {
      ...prev,
      frequency: prev.frequency || row.frequency,
      status: prev.status === "stopped" || row.status === "stopped" ? "stopped" : "active",
    });
  }
  return [...map.values()].slice(0, 30);
}

export function dedupeAllergies(rows: AllergyRow[]): AllergyRow[] {
  const map = new Map<string, AllergyRow>();
  for (const row of rows) {
    const key = normKey(row.substance);
    const prev = map.get(key);
    if (!prev) {
      map.set(key, row);
      continue;
    }
    map.set(key, {
      ...prev,
      reaction: prev.reaction || row.reaction,
      severity: prev.severity !== "unknown" ? prev.severity : row.severity,
    });
  }
  return [...map.values()].slice(0, 20);
}

function parseUsDate(raw: string): string {
  const iso = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(iso)) return iso;
  const m = iso.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{2,4})$/);
  if (!m) return "";
  const month = Number(m[1]);
  const day = Number(m[2]);
  let year = Number(m[3]);
  if (year < 100) year += year >= 70 ? 1900 : 2000;
  if (month < 1 || month > 12 || day < 1 || day > 31) return "";
  return `${String(year).padStart(4, "0")}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function scrapeLabeledName(corpus: string): { firstName: string; lastName: string } | null {
  const comma = corpus.match(
    /(?:patient(?:\s+name)?|name)\s*[:\-]\s*([A-Za-z][A-Za-z'.\-]+),\s*([A-Za-z][A-Za-z'.\-]+)/i,
  );
  if (comma) {
    const last = (comma[1] || "").trim();
    const first = (comma[2] || "").trim();
    if (
      first &&
      last &&
      !HONORIFICS.has(first.toLowerCase()) &&
      !/^X{2,}$/i.test(last) &&
      !/^Y{2,}$/i.test(last) &&
      !/^X{2,}$/i.test(first)
    ) {
      return { firstName: first, lastName: last };
    }
  }
  const spaced = corpus.match(
    /(?:patient(?:\s+name)?|name)\s*[:\-]\s*([A-Za-z][A-Za-z'.\-]+)\s+([A-Za-z][A-Za-z'.\-]+)/i,
  );
  if (spaced) {
    const first = (spaced[1] || "").trim();
    const last = (spaced[2] || "").trim();
    if (first && last && !HONORIFICS.has(first.toLowerCase()) && !/^X{2,}$/i.test(last) && !/^Y{2,}$/i.test(last)) {
      return { firstName: first, lastName: last };
    }
  }
  return null;
}

function scrapeDob(corpus: string): string {
  const m = corpus.match(
    /(?:\bDOB\b|date\s+of\s+birth|birth\s*date)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
  );
  return m ? parseUsDate(m[1] || "") : "";
}

function isTollFreePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  const area = digits.length === 11 && digits.startsWith("1") ? digits.slice(1, 4) : digits.slice(0, 3);
  return /^(800|888|877|866|855|844|833)$/.test(area);
}

function scrapePhone(corpus: string): string {
  // Prefer patient/home/cell over generic letterhead Tel: (often facility/toll-free).
  const preferred = corpus.match(
    /(?:patient\s*(?:phone|tel)?|home\s*phone|cell|mobile|pt\s*phone)\s*[:#\-]?\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i,
  );
  if (preferred?.[1] && !isTollFreePhone(preferred[1])) {
    return preferred[1].replace(/\s+/g, " ").trim();
  }
  const labeled = corpus.match(
    /(?:phone|tel|telephone|cell|mobile)\s*[:#\-]?\s*(\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4})/i,
  );
  if (labeled?.[1] && !isTollFreePhone(labeled[1])) {
    return labeled[1].replace(/\s+/g, " ").trim();
  }
  const any = corpus.match(/\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
  if (any?.[0] && !isTollFreePhone(any[0])) return any[0].replace(/\s+/g, " ").trim();
  return "";
}

function isPlaceholderDate(value: string) {
  return /^Y{2,4}/i.test(value.trim()) || /X{2,}/i.test(value.trim());
}

function scrapeEmail(corpus: string): string {
  const m = corpus.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return m?.[0]?.trim() || "";
}

function scrapeMemberId(corpus: string): string {
  const m = corpus.match(
    /(?:member\s*(?:id|#|number)?|subscriber\s*(?:id|#|number)?|id\s*#)\s*[:\-#]?\s*([A-Z0-9][A-Z0-9\-]{4,20})/i,
  );
  if (!m?.[1]) return "";
  const value = m[1].trim();
  // Avoid bare SSN-shaped values unless explicitly member-labeled (still allow labeled).
  if (/^\d{3}-\d{2}-\d{4}$/.test(value) && !/member|subscriber/i.test(m[0])) return "";
  return value;
}

function scrapeDateOfInjury(corpus: string): string {
  const m = corpus.match(
    /(?:\bDOI\b|date\s+of\s+injury|date\s+of\s+accident|injury\s+date)\s*[:\-]?\s*(\d{4}-\d{2}-\d{2}|\d{1,2}[\/\-.]\d{1,2}[\/\-.]\d{2,4})/i,
  );
  return m ? parseUsDate(m[1] || "") : "";
}

const INJURY_CONTEXT_RE =
  /\b(?:MVA|motor\s+vehicle(?:\s+accident)?|no[-\s]?fault|workers?\s*(?:comp|compensation)|work(?:place)?\s+injur)/i;

/** Seed injuryCase from MVA/NF/WC keywords only — never invent a DOI. */
export function seedInjuryCaseFromCorpus(corpus: string): OnboardDraft["injuryCase"] {
  const m = corpus.match(INJURY_CONTEXT_RE);
  if (!m?.[0]) return null;
  const raw = m[0].replace(/\s+/g, " ").trim();
  let description = raw;
  if (/^mva$/i.test(raw) || /motor\s+vehicle/i.test(raw)) description = "Motor vehicle accident";
  else if (/no[-\s]?fault/i.test(raw)) description = "No-fault injury";
  else if (/workers?\s*(?:comp|compensation)|work(?:place)?\s+injur/i.test(raw)) {
    description = "Work-related injury";
  }
  return {
    caseNumber: "",
    claimNumber: "",
    dateOfInjury: "",
    description,
    carrierName: "",
    attorneyName: "",
    attorneyFirm: "",
    attorneyPhone: "",
    attorneyEmail: "",
    notes: "",
  };
}

const IMAGING_DIAGNOSIS_RE =
  /\b(herniat\w*|disc\s+bulge|bulging\s+disc|stenos\w*|radiculopath\w*|spondylos\w*|sprain\/?strain|sprain|strain)\b/i;
const IMAGING_TECHNIQUE_RE = /\b(technique|sequences?|without\s+contrast|with\s+contrast|protocol|sagittal|axial)\b/i;

/** Lift diagnosis-like imaging impression lines into problems when missing. */
export function liftProblemsFromImagingFindings(draft: OnboardDraft): OnboardDraft {
  const findings = (draft.imagingFindings || "").trim();
  if (!findings) return draft;
  const existing = new Set(draft.problems.map((row) => problemNameKey(row.name)));
  const added: ProblemRow[] = [];
  const chunks = findings
    .split(/[\n;•]+|(?<=\.)\s+(?=[A-Z\-])/)
    .map((part) => part.replace(/^[\-\d.\s]+/, "").trim())
    .filter((part) => part.length >= 8 && part.length <= 160);

  for (const chunk of chunks) {
    if (IMAGING_TECHNIQUE_RE.test(chunk) && !IMAGING_DIAGNOSIS_RE.test(chunk)) continue;
    if (!IMAGING_DIAGNOSIS_RE.test(chunk)) continue;
    const name = chunk.replace(/\s+/g, " ").replace(/\.$/, "").trim();
    const key = problemNameKey(name);
    if (!key || existing.has(key)) continue;
    existing.add(key);
    added.push(liftIcdFromProblemName({ name, icd: "", status: "active", onset: "" }));
    if (draft.problems.length + added.length >= 20) break;
  }
  if (!added.length) return draft;
  return { ...draft, problems: [...draft.problems, ...added] };
}

/** Fill empty contact/identity/DOI from corpus regexes; never invent payer. */
export function refineOnboardDraftFromCorpus(draft: OnboardDraft, corpus: string): OnboardDraft {
  let next = refineIdentity({ ...draft });
  if (next.dateOfBirth && isPlaceholderDate(next.dateOfBirth)) next.dateOfBirth = "";
  if (next.memberId && /^X{3,}$/i.test(next.memberId.trim())) next.memberId = "";
  if (next.phone && isTollFreePhone(next.phone)) next.phone = "";

  const isRedactedToken = (value: string) => /^X{2,}$/i.test(value.trim()) || /^Y{2,}$/i.test(value.trim());
  if (isRedactedToken(next.lastName)) next.lastName = "";
  if (isRedactedToken(next.firstName)) next.firstName = "";
  const nameWeak =
    !next.firstName.trim() ||
    !next.lastName.trim() ||
    looksCamelCaseBlob(next.lastName) ||
    isRoleOrJunkName(next.firstName) ||
    isRoleOrJunkName(next.lastName) ||
    ROLE_NAME_PHRASES.has(normKey(`${next.firstName} ${next.lastName}`));
  if (nameWeak) {
    const scraped = scrapeLabeledName(corpus);
    if (scraped) {
      if (!next.firstName.trim() || isRoleOrJunkName(next.firstName)) {
        next.firstName = scraped.firstName;
      }
      if (!next.lastName.trim() || looksCamelCaseBlob(next.lastName) || isRoleOrJunkName(next.lastName)) {
        next.lastName = scraped.lastName;
      }
      next = refineIdentity(next);
    }
  }
  if (!next.dateOfBirth.trim()) {
    const dob = scrapeDob(corpus);
    if (dob && !isPlaceholderDate(dob)) next.dateOfBirth = dob;
  }
  if (!next.phone.trim()) {
    const phone = scrapePhone(corpus);
    if (phone) next.phone = phone;
  }
  if (!next.email.trim()) {
    const email = scrapeEmail(corpus);
    if (email) next.email = email;
  }
  if (!next.memberId.trim()) {
    const memberId = scrapeMemberId(corpus);
    if (memberId && !/^X{3,}$/i.test(memberId)) next.memberId = memberId;
  }
  const doi = scrapeDateOfInjury(corpus);
  if (doi && !isPlaceholderDate(doi)) {
    if (!next.injuryCase) {
      next.injuryCase = {
        caseNumber: "",
        claimNumber: "",
        dateOfInjury: doi,
        description: "",
        carrierName: "",
        attorneyName: "",
        attorneyFirm: "",
        attorneyPhone: "",
        attorneyEmail: "",
        notes: "",
      };
    } else if (!next.injuryCase.dateOfInjury.trim() || isPlaceholderDate(next.injuryCase.dateOfInjury)) {
      next.injuryCase = { ...next.injuryCase, dateOfInjury: doi };
    }
  } else if (next.injuryCase?.dateOfInjury && isPlaceholderDate(next.injuryCase.dateOfInjury)) {
    next.injuryCase = { ...next.injuryCase, dateOfInjury: "" };
  }
  if (!next.injuryCase || !Object.values(next.injuryCase).some((v) => String(v || "").trim())) {
    const seeded = seedInjuryCaseFromCorpus(corpus);
    if (seeded) next.injuryCase = seeded;
  }
  next = liftProblemsFromImagingFindings(next);
  next.problems = dedupeProblems(next.problems);
  next.medications = dedupeMedications(next.medications);
  next.allergies = dedupeAllergies(next.allergies);
  return refreshOnboardWarnings(next);
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

  let clearedLegacyIcd = false;
  base.problems = Array.isArray(data.problems)
    ? dedupeProblems(
        data.problems
          .map((item) => {
            if (!item || typeof item !== "object") return null;
            const row = item as Record<string, unknown>;
            const name = asString(row.name);
            if (!name) return null;
            const normalized = normalizeIcdCode(asString(row.icd));
            if (normalized.clearedLegacy) clearedLegacyIcd = true;
            return {
              name,
              icd: normalized.icd,
              status: row.status === "resolved" ? ("resolved" as const) : ("active" as const),
              onset: asString(row.onset),
            };
          })
          .filter((item): item is NonNullable<typeof item> => item !== null),
      )
    : [];

  base.medications = Array.isArray(data.medications)
    ? dedupeMedications(
        data.medications
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
          .filter((item): item is NonNullable<typeof item> => item !== null),
      )
    : [];

  base.allergies = Array.isArray(data.allergies)
    ? dedupeAllergies(
        data.allergies
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
          .filter((item): item is NonNullable<typeof item> => item !== null),
      )
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

  const identified = refineIdentity(base);
  base.firstName = identified.firstName;
  base.lastName = identified.lastName;

  const required: Array<keyof OnboardDraft> = ["firstName", "lastName", "dateOfBirth"];
  for (const key of required) {
    const value = base[key];
    base.fieldConfidence[key] = typeof value === "string" && value ? "high" : "missing";
  }
  for (const key of ["phone", "email", "memberId", "payerName"] as const) {
    base.fieldConfidence[key] = base[key] ? "medium" : "missing";
  }
  const withWarnings = refreshOnboardWarnings(base);
  if (clearedLegacyIcd) {
    withWarnings.warnings = [
      ...withWarnings.warnings,
      "Legacy ICD-9 cleared — confirm codes.",
    ];
  }
  return withWarnings;
}

/** Optional chart values that already cover a gap (used by post-upload extract review). */
export type OnboardWarningCoverage = {
  firstName?: string;
  lastName?: string;
  phone?: string;
  email?: string;
  memberId?: string;
  payerName?: string;
};

/** Rebuild soft gaps from the current draft fields (safe after merge or staff edits). */
export function refreshOnboardWarnings(
  draft: OnboardDraft,
  options?: { coveredBy?: OnboardWarningCoverage | null },
): OnboardDraft {
  const covered = options?.coveredBy;
  const has = (value?: string) => Boolean(value?.trim());
  const kept = (draft.warnings || []).filter((item) => /Legacy ICD-9 cleared/i.test(item));
  const warnings: string[] = [...kept];
  const nameOk =
    (draft.firstName.trim() && draft.lastName.trim()) ||
    (has(covered?.firstName) && has(covered?.lastName));
  if (!nameOk) {
    warnings.push("Confirm first and last name before saving.");
  }
  if (!draft.phone.trim() && !has(covered?.phone)) {
    warnings.push("Phone missing — still required for intake/claims contact.");
  }
  if (!draft.email.trim() && !has(covered?.email)) {
    warnings.push("Email missing — patient portal invite needs an email.");
  }
  if (!draft.memberId.trim() && !has(covered?.memberId)) {
    warnings.push("Member id missing — upload insurance card or enter manually before claim submit.");
  }
  if (!draft.payerName.trim() && !has(covered?.payerName)) {
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

export async function mineOnboardDraft(
  corpus: string,
  options: { model?: string; maxOutputTokens?: number } = {},
): Promise<OnboardDraft> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) {
    const draft = emptyOnboardDraft();
    draft.warnings.push("OPENAI_API_KEY is not configured — OCR text was extracted but not mined.");
    draft.sourceSummary = corpus.slice(0, 400);
    return draft;
  }
  const model = options.model?.trim() || process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const maxOutputTokens = options.maxOutputTokens ?? 3000;
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      store: false,
      max_output_tokens: maxOutputTokens,
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

  // One packet → primary clinical homes only (avoid copying the same PDF into every labeled slot).
  if (hasPdf || hints.includes("outside-records")) slots.add("outside-records");
  if (hints.includes("outside-imaging") || labels.has("imaging") || labels.has("emg_ncv")) {
    slots.add("outside-imaging");
  }
  if (hints.includes("no-fault-comp")) slots.add("no-fault-comp");
  if (hints.includes("photo-id") || labels.has("photo_id")) slots.add("photo-id");
  if (hints.includes("insurance-card") || labels.has("insurance_card")) slots.add("insurance-card");

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
      slot.note = note || "Imported from records OCR";
    } else if (note && !slot.note.includes(note.slice(0, 40))) {
      slot.note = [slot.note, note].filter(Boolean).join(" · ").slice(0, 240);
    }
  }
  return next;
}

function stripCorpusDump(value: string) {
  return value
    .replace(/\n*Outside records excerpt:\n[\s\S]*$/i, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Keep chart text fields as staff-readable summaries.
 * Full OCR text belongs in the filed PDF + ocr-import artifact — not pasted into history/notes.
 */
export function enrichOnboardDraftFromCorpus(draft: OnboardDraft, corpus: string): OnboardDraft {
  const next = { ...draft };
  next.medicalHistory = stripCorpusDump(next.medicalHistory).slice(0, 1_500);
  next.imagingFindings = stripCorpusDump(next.imagingFindings).slice(0, 1_200);
  next.surgicalHistory = stripCorpusDump(next.surgicalHistory).slice(0, 800);
  next.reasonForVisit = stripCorpusDump(next.reasonForVisit).slice(0, 240);
  if (next.injuryCase) {
    next.injuryCase = {
      ...next.injuryCase,
      notes: stripCorpusDump(next.injuryCase.notes).slice(0, 1_500),
      description: stripCorpusDump(next.injuryCase.description).slice(0, 240),
    };
  }
  if (!next.sourceSummary.trim()) {
    next.sourceSummary = corpus.replace(/\s+/g, " ").trim().slice(0, 240);
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
  const note = draft.sourceSummary || "Records OCR import";
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
  const historyParts = [
    draft.reasonForVisit ? `Reason for visit: ${draft.reasonForVisit}` : "",
    draft.medicalHistory,
    draft.imagingFindings ? `Imaging / EMG:\n${draft.imagingFindings}` : "",
  ];
  const medicalHistory = historyParts.filter(Boolean).join("\n\n").slice(0, 4_000);
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
const INJURY_NARRATIVE_LABELS = new Set(["consult", "pt_note", "intake_form"]);

export function buildSectionCorpus(
  input: Parameters<typeof buildMinerCorpus>[0],
  section: "demographics" | "clinical" | "injury",
  maxChars = 24_000,
) {
  const labels =
    section === "demographics" ? DEMOGRAPHICS_LABELS : section === "clinical" ? CLINICAL_LABELS : INJURY_LABELS;
  const allPages = input.pages ?? [];
  let pages = allPages.filter((page) => labels.has(page.label) && page.label !== "attorney_noise");

  // Demographics always gets page 1 (MRI/EMG headers often carry Patient/DOB) even when labeled imaging.
  if (section === "demographics" && allPages.length) {
    const page1 = [...allPages].sort((a, b) => a.page - b.page)[0];
    if (page1 && page1.label !== "attorney_noise" && !pages.some((p) => p.page === page1.page)) {
      pages = [page1, ...pages];
    }
  }

  // Injury mine: prepend early narrative / MVA pages so imaging-only packets still see mechanism/DOI.
  if (section === "injury" && allPages.length) {
    const sorted = [...allPages].sort((a, b) => a.page - b.page);
    const extras: typeof allPages = [];
    for (const page of sorted) {
      if (extras.length >= 2) break;
      if (page.label === "attorney_noise") continue;
      if (pages.some((p) => p.page === page.page)) continue;
      const narrative = INJURY_NARRATIVE_LABELS.has(page.label);
      const keyword = INJURY_CONTEXT_RE.test(page.text || "") || /\bDOI\b|date\s+of\s+injury/i.test(page.text || "");
      if (narrative || keyword) extras.push(page);
    }
    if (extras.length) pages = [...extras, ...pages];
  }

  if (pages.length) {
    return buildMinerCorpus({ ...input, pages, text: "", maxChars });
  }
  return buildMinerCorpus({ ...input, maxChars });
}

const sectionFocus: Record<"demographics" | "clinical" | "injury", string> = {
  demographics:
    "Focus on demographics, contact, address, insurance payer/member id, emergency contact, PCP, referring, and pharmacy. Leave clinical lists empty unless clearly on ID/card pages.",
  clinical:
    "Focus on chief complaint, medical and surgical history, problems, medications, and allergies. If DOI or MVA/no-fault/workers' comp mechanism appears on these pages, set injuryCase (description and dateOfInjury when present); do not invent case or claim numbers.",
  injury:
    "Focus on injury/no-fault/workers' comp case fields, imaging/EMG findings, and documentHints for imaging or no-fault papers.",
};

/** Three parallel section mines, then merge + corpus refine/enrich. */
export async function mineOnboardDraftSectioned(
  input: Parameters<typeof buildMinerCorpus>[0],
): Promise<{ draft: OnboardDraft; corpus: string }> {
  const fullCorpus = buildMinerCorpus(input);
  const demoModel = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const clinicalModel = process.env.OPENAI_ONBOARD_MODEL?.trim() || "gpt-4o";
  const [demographics, clinical, injury] = await Promise.all([
    mineOnboardDraft(`${sectionFocus.demographics}\n\n${buildSectionCorpus(input, "demographics")}`, {
      model: demoModel,
      maxOutputTokens: 3000,
    }),
    mineOnboardDraft(`${sectionFocus.clinical}\n\n${buildSectionCorpus(input, "clinical")}`, {
      model: clinicalModel,
      maxOutputTokens: 4000,
    }),
    mineOnboardDraft(`${sectionFocus.injury}\n\n${buildSectionCorpus(input, "injury")}`, {
      model: clinicalModel,
      maxOutputTokens: 4000,
    }),
  ]);
  const merged = mergeSectionDrafts([demographics, clinical, injury]);
  const refined = refineOnboardDraftFromCorpus(merged, fullCorpus);
  return { draft: enrichOnboardDraftFromCorpus(refined, fullCorpus), corpus: fullCorpus };
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
