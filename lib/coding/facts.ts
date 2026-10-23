/** Clinical facts extracted from a note. Never carries CPT/ICD numbers. */

export type FactStatus = "current" | "history" | "ruled_out" | "negated" | "suspected";

export type VisitKind =
  | "office_new"
  | "office_established"
  | "consult"
  | "post_op_global"
  | "telehealth_new"
  | "telehealth_established";

export type Complexity = "straightforward" | "low" | "moderate" | "high";

export type VisitFacts = {
  kind: VisitKind;
  complexity: Complexity;
  totalMinutes?: number | null;
  decisionForSurgery?: boolean;
  unrelatedToGlobalSurgery?: boolean;
  significantSeparateProblem?: boolean;
  quote: string;
};

/** Global-period return modifiers on a procedure performed today. */
export type ProcedureGlobalModifier = "58" | "78" | "79";

export type ProcedureFacts = {
  name: string;
  levels?: string[];
  side?: "left" | "right" | "bilateral" | "none" | null;
  performed: boolean;
  /** Staged (58), related return to OR (78), or unrelated procedure in global (79). */
  globalModifier?: ProcedureGlobalModifier | null;
  quote: string;
};

export type DiagnosisFacts = {
  condition: string;
  region?: string | null;
  levels?: string[];
  side?: "left" | "right" | "bilateral" | "none" | null;
  with?: string[];
  status: FactStatus;
  quote: string;
};

export type InjuryFacts = {
  workRelated: boolean;
  autoAccident: boolean;
  date?: string | null;
  cause?: string | null;
  quote?: string | null;
};

export type CodingFacts = {
  visit: VisitFacts | null;
  procedures: ProcedureFacts[];
  diagnoses: DiagnosisFacts[];
  injury: InjuryFacts | null;
};

export type FactWarning = { kind: string; message: string; quote?: string };

/** Normalize whitespace/case so quote checks survive OCR and line wraps. */
export function normalizeForQuote(text: string) {
  return text
    .toLowerCase()
    .replace(/[\u2010-\u2015\u2212]/g, "-")
    .replace(/\s+/g, " ")
    .trim();
}

export function quoteInNote(note: string, quote: string) {
  if (!quote.trim()) return false;
  return normalizeForQuote(note).includes(normalizeForQuote(quote));
}

/** Drop any fact whose quote is missing from the note. Never invents codes. */
export function keepQuotedFacts(note: string, facts: CodingFacts): { facts: CodingFacts; warnings: FactWarning[] } {
  const warnings: FactWarning[] = [];

  let visit = facts.visit;
  if (visit) {
    if (!quoteInNote(note, visit.quote)) {
      warnings.push({ kind: "visit", message: "Visit fact dropped — quote not found in the note.", quote: visit.quote });
      visit = null;
    }
  }

  const procedures: ProcedureFacts[] = [];
  for (const procedure of facts.procedures) {
    if (!quoteInNote(note, procedure.quote)) {
      warnings.push({
        kind: "procedure",
        message: `Procedure “${procedure.name}” dropped — quote not found in the note.`,
        quote: procedure.quote,
      });
      continue;
    }
    procedures.push(procedure);
  }

  const diagnoses: DiagnosisFacts[] = [];
  for (const diagnosis of facts.diagnoses) {
    if (!quoteInNote(note, diagnosis.quote)) {
      warnings.push({
        kind: "diagnosis",
        message: `Diagnosis “${diagnosis.condition}” dropped — quote not found in the note.`,
        quote: diagnosis.quote,
      });
      continue;
    }
    diagnoses.push(diagnosis);
  }

  let injury = facts.injury;
  if (injury?.quote && !quoteInNote(note, injury.quote)) {
    warnings.push({ kind: "injury", message: "Injury fact dropped — quote not found in the note.", quote: injury.quote });
    injury = null;
  }

  return { facts: { visit, procedures, diagnoses, injury }, warnings };
}

const visitKinds = new Set<VisitKind>([
  "office_new",
  "office_established",
  "consult",
  "post_op_global",
  "telehealth_new",
  "telehealth_established",
]);

const complexities = new Set<Complexity>(["straightforward", "low", "moderate", "high"]);
const statuses = new Set<FactStatus>(["current", "history", "ruled_out", "negated", "suspected"]);

function asString(value: unknown) {
  return typeof value === "string" ? value : "";
}

function asStringList(value: unknown) {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === "string") : [];
}

/** Parse model JSON into CodingFacts. Strips any accidental code-looking fields. */
export function parseCodingFacts(value: unknown): CodingFacts {
  const record = (value && typeof value === "object" ? value : {}) as Record<string, unknown>;
  const visitRaw = record.visit && typeof record.visit === "object" ? (record.visit as Record<string, unknown>) : null;
  const visit =
    visitRaw && visitKinds.has(visitRaw.kind as VisitKind) && complexities.has(visitRaw.complexity as Complexity)
      ? {
          kind: visitRaw.kind as VisitKind,
          complexity: visitRaw.complexity as Complexity,
          totalMinutes: typeof visitRaw.totalMinutes === "number" ? visitRaw.totalMinutes : null,
          decisionForSurgery: Boolean(visitRaw.decisionForSurgery),
          unrelatedToGlobalSurgery: Boolean(visitRaw.unrelatedToGlobalSurgery),
          significantSeparateProblem: Boolean(visitRaw.significantSeparateProblem),
          quote: asString(visitRaw.quote),
        }
      : null;

  const procedureAliases: Record<string, string> = {
    tfesi: "transforaminal_esi",
    transforaminal_epidural: "transforaminal_esi",
    transforaminal_epidural_steroid_injection: "transforaminal_esi",
    epidural_steroid_injection: "interlaminar_esi",
    interlaminar_epidural: "interlaminar_esi",
    interlaminar_epidural_steroid_injection: "interlaminar_esi",
    mbb: "medial_branch_block",
    medial_branch_blocks: "medial_branch_block",
    facet_block: "medial_branch_block",
    radiofrequency_ablation: "facet_rfa",
    rfa: "facet_rfa",
    balloon_kyphoplasty: "kyphoplasty",
    vertebroplasty: "kyphoplasty",
    anterior_cervical_discectomy_and_fusion: "acdf",
    anterior_cervical_discectomy_fusion: "acdf",
    lumbar_microdiscectomy: "microdiscectomy",
    discectomy: "microdiscectomy",
    blood_patch: "epidural_blood_patch",
    pedicle_screw_instrumentation: "posterior_instrumentation",
    cage: "interbody_cage",
    interbody_cages: "interbody_cage",
    anterior_plate: "anterior_instrumentation",
  };

  const diagnosisAliases: Record<string, string> = {
    cervical_spondylotic_myelopathy: "spondylotic_myelopathy",
    lumbar_radiculopathy: "radiculopathy",
    cervical_radiculopathy: "radiculopathy",
    herniated_disc: "disc_herniation",
    herniated_nucleus_pulposus: "disc_herniation",
    hnp: "disc_herniation",
    spinal_stenosis: "stenosis",
    lumbar_stenosis: "stenosis",
    compression_fracture: "osteoporotic_fracture",
    vertebral_compression_fracture: "osteoporotic_fracture",
    pathological_fracture: "osteoporotic_fracture",
    facet_arthropathy: "spondylosis",
    lumbar_facet_arthropathy: "spondylosis",
    failed_back_surgery_syndrome: "postlaminectomy_syndrome",
    neck_pain: "cervicalgia",
    mid_back_pain: "thoracic_pain",
  };

  const procedures = (Array.isArray(record.procedures) ? record.procedures : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => {
      const rawName = asString(item.name).toLowerCase().replace(/\s+/g, "_");
      const globalRaw = asString(item.globalModifier);
      const globalModifier = (["58", "78", "79"].includes(globalRaw)
        ? globalRaw
        : null) as ProcedureFacts["globalModifier"];
      return {
        name: procedureAliases[rawName] ?? rawName,
        levels: asStringList(item.levels),
        side: (["left", "right", "bilateral", "none"].includes(asString(item.side))
          ? asString(item.side)
          : null) as ProcedureFacts["side"],
        performed: Boolean(item.performed),
        globalModifier,
        quote: asString(item.quote),
      };
    })
    .filter((item) => item.name && item.quote);

  const diagnoses = (Array.isArray(record.diagnoses) ? record.diagnoses : [])
    .filter((item): item is Record<string, unknown> => Boolean(item) && typeof item === "object")
    .map((item) => {
      const rawCondition = asString(item.condition).toLowerCase().replace(/\s+/g, "_");
      return {
        condition: diagnosisAliases[rawCondition] ?? rawCondition,
        region: asString(item.region).toLowerCase() || null,
        levels: asStringList(item.levels),
        side: (["left", "right", "bilateral", "none"].includes(asString(item.side))
          ? asString(item.side)
          : null) as DiagnosisFacts["side"],
        with: asStringList(item.with).map((entry) => entry.toLowerCase().replace(/\s+/g, "_")),
        status: (statuses.has(item.status as FactStatus) ? item.status : "current") as FactStatus,
        quote: asString(item.quote),
      };
    })
    .filter((item) => item.condition && item.quote)
    // Model must never supply codes; drop anything that looks like one.
    .filter((item) => !/^[A-TV-Z][0-9][0-9A-Z]/.test(item.condition) && !/^\d{5}$/.test(item.condition));

  const injuryRaw = record.injury && typeof record.injury === "object" ? (record.injury as Record<string, unknown>) : null;
  const injury = injuryRaw
    ? {
        workRelated: Boolean(injuryRaw.workRelated),
        autoAccident: Boolean(injuryRaw.autoAccident),
        date: asString(injuryRaw.date) || null,
        cause: asString(injuryRaw.cause) || null,
        quote: asString(injuryRaw.quote) || null,
      }
    : null;

  return { visit, procedures, diagnoses, injury };
}
