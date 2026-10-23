import { existsSync, readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { claimCodeProblems, type CodeLibrary } from "@/lib/coding/codes";
import type {
  CodingFacts,
  Complexity,
  DiagnosisFacts,
  FactStatus,
  ProcedureFacts,
  VisitKind,
} from "@/lib/coding/facts";

export type CodedLine = {
  cpt: string;
  units: number;
  modifiers: string[];
  diagnosisPointers: string[];
  rule: string;
  quote: string;
};

export type CodedDiagnosis = {
  icd: string;
  rule: string;
  quote: string;
};

export type CodeVisitResult = {
  lines: CodedLine[];
  diagnoses: CodedDiagnosis[];
  warnings: string[];
};

type VisitCodeTable = Record<Complexity, string> | { code: string };

type DiagnosisRule = {
  id: string;
  condition: string;
  region?: string[];
  withAny?: string[];
  side?: string;
  levelsAny?: string[];
  preferRegion?: string;
  status?: FactStatus;
  icd: string;
};

type ProcedureRule = {
  id: string;
  name: string;
  region?: string[];
  cpt: string;
  addonCpt?: string;
  thirdLevelCpt?: string;
  lateralityModifiers?: boolean;
  bilateralModifier?: string;
  minLevels?: number;
  maxLevels?: number;
  /** When true, primary line units = level count (e.g. interbody cages). Default units are always 1. */
  unitsFromLevels?: boolean;
};

type RulePack = {
  id: string;
  version: string;
  visitCodes?: Record<string, VisitCodeTable>;
  procedures?: ProcedureRule[];
  diagnoses?: DiagnosisRule[];
};

export type SpineRules = {
  id: string;
  version: string;
  visitCodes: Record<string, VisitCodeTable>;
  procedures: ProcedureRule[];
  diagnoses: DiagnosisRule[];
};

let cachedRules: SpineRules | null = null;

function rulesDir() {
  return path.join(process.cwd(), "data/coding/spine-rules");
}

function readPack(fileName: string): RulePack {
  return JSON.parse(readFileSync(path.join(rulesDir(), fileName), "utf8")) as RulePack;
}

/** Merge office + injections (+ any other *.json packs) into one rule set. */
export function loadSpineRules(source?: SpineRules | RulePack): SpineRules {
  if (source) {
    cachedRules = null;
    return {
      id: source.id,
      version: source.version,
      visitCodes: source.visitCodes ?? {},
      procedures: source.procedures ?? [],
      diagnoses: source.diagnoses ?? [],
    };
  }
  if (cachedRules) return cachedRules;

  const dir = rulesDir();
  if (!existsSync(dir)) {
    throw new Error("Spine rule packs are missing from data/coding/spine-rules.");
  }
  const files = readdirSync(dir)
    .filter((file) => file.endsWith(".json"))
    .sort((left, right) => {
      // Office first so visit tables win; other packs append procedures/diagnoses.
      if (left === "office.json") return -1;
      if (right === "office.json") return 1;
      return left.localeCompare(right);
    });

  const merged: SpineRules = { id: "spine", version: "", visitCodes: {}, procedures: [], diagnoses: [] };
  for (const file of files) {
    const pack = readPack(file);
    merged.version = merged.version ? `${merged.version}+${pack.version}` : pack.version;
    if (pack.visitCodes) Object.assign(merged.visitCodes, pack.visitCodes);
    if (pack.procedures) merged.procedures.push(...pack.procedures);
    if (pack.diagnoses) merged.diagnoses.push(...pack.diagnoses);
  }
  cachedRules = merged;
  return merged;
}

/** @deprecated Prefer loadSpineRules — kept for existing imports/tests. */
export function loadOfficeRules(source?: unknown): SpineRules {
  return loadSpineRules(source as SpineRules | undefined);
}

export function resetOfficeRulesCache() {
  cachedRules = null;
}

export const resetSpineRulesCache = resetOfficeRulesCache;

function normalizeLevel(value: string) {
  return value.toUpperCase().replace(/\s+/g, "").replace(/\//g, "-").replace(/TO/g, "-");
}

function levelsMatch(factLevels: string[] | undefined, wanted: string[] | undefined) {
  if (!wanted?.length) return true;
  if (!factLevels?.length) return false;
  const have = new Set(factLevels.map(normalizeLevel));
  return wanted.some((level) => have.has(normalizeLevel(level)));
}

function regionMatches(factRegion: string | null | undefined, wanted: string[] | undefined) {
  if (!wanted?.length) return true;
  if (!factRegion) return false;
  const region = factRegion.toLowerCase();
  if (wanted.some((entry) => entry.toLowerCase() === region)) return true;
  // Broaden only lumbosacral facts onto lumbar rules (not the reverse — keeps L4-5 ≠ L5-S1).
  if (region === "lumbosacral" && wanted.some((entry) => entry.toLowerCase() === "lumbar")) return true;
  return false;
}

function withMatches(factWith: string[] | undefined, wanted: string[] | undefined) {
  if (!wanted?.length) return true;
  const have = new Set((factWith ?? []).map((entry) => entry.toLowerCase()));
  return wanted.some((entry) => have.has(entry.toLowerCase()));
}

function effectiveRegion(diagnosis: DiagnosisFacts) {
  const levels = (diagnosis.levels ?? []).map(normalizeLevel);
  if (levels.some((level) => level.includes("L5-S1") || level === "L5S1" || level.includes("S1"))) {
    return "lumbosacral";
  }
  if (levels.some((level) => /^L\d/.test(level) || level.includes("L"))) return "lumbar";
  if (levels.some((level) => /^C\d/.test(level) || level.startsWith("C"))) return "cervical";
  if (levels.some((level) => /^T\d/.test(level) || level.startsWith("T"))) return "thoracic";
  return diagnosis.region?.toLowerCase() ?? null;
}

function procedureRegion(procedure: ProcedureFacts) {
  if (procedure.levels?.length) {
    const joined = procedure.levels.map(normalizeLevel).join(" ");
    if (/^C|T1[0-2]|T[1-9]/.test(joined) && !joined.includes("L")) {
      if (joined.includes("T") && !joined.startsWith("C")) return "thoracic";
      return "cervical";
    }
    if (joined.includes("L5-S1") || joined.includes("S1")) return "lumbosacral";
    if (joined.includes("L")) return "lumbar";
  }
  return null;
}

function levelCount(procedure: ProcedureFacts) {
  const levels = procedure.levels ?? [];
  if (levels.length) return levels.length;
  return 1;
}

function matchDiagnosis(diagnosis: DiagnosisFacts, rules: DiagnosisRule[]): DiagnosisRule | null {
  const region = effectiveRegion(diagnosis);
  const candidates = rules.filter((rule) => {
    if (rule.condition !== diagnosis.condition) return false;
    const requiredStatus = rule.status ?? "current";
    if (diagnosis.status !== requiredStatus) return false;
    if (rule.side && rule.side !== diagnosis.side) return false;
    if (!regionMatches(region, rule.region)) return false;
    if (!withMatches(diagnosis.with, rule.withAny)) return false;
    if (!levelsMatch(diagnosis.levels, rule.levelsAny)) return false;
    return true;
  });
  if (!candidates.length) return null;
  candidates.sort((left, right) => {
    const score = (rule: DiagnosisRule) =>
      (rule.withAny?.length ?? 0) * 10 +
      (rule.levelsAny?.length ?? 0) * 5 +
      (rule.region?.length ? 2 : 0) +
      (rule.side ? 1 : 0);
    return score(right) - score(left);
  });
  return candidates[0] ?? null;
}

function matchProcedure(procedure: ProcedureFacts, rules: ProcedureRule[]): ProcedureRule | null {
  const region = procedureRegion(procedure);
  const count = levelCount(procedure);
  const candidates = rules.filter((rule) => {
    if (rule.name !== procedure.name) return false;
    if (!regionMatches(region, rule.region)) return false;
    if (rule.minLevels != null && count < rule.minLevels) return false;
    if (rule.maxLevels != null && count > rule.maxLevels) return false;
    return true;
  });
  if (!candidates.length) return null;
  candidates.sort((left, right) => (right.region?.length ?? 0) - (left.region?.length ?? 0));
  return candidates[0] ?? null;
}

function visitCpt(kind: VisitKind, complexity: Complexity, rules: SpineRules): { cpt: string; rule: string } | null {
  const table = rules.visitCodes[kind];
  if (!table) return null;
  if ("code" in table) return { cpt: table.code, rule: `visit.${kind}` };
  const cpt = table[complexity];
  return cpt ? { cpt, rule: `visit.${kind}.${complexity}` } : null;
}

function visitModifiers(facts: CodingFacts): string[] {
  const visit = facts.visit;
  if (!visit) return [];
  const modifiers: string[] = [];
  if (visit.kind === "telehealth_new" || visit.kind === "telehealth_established") modifiers.push("95");
  if (visit.decisionForSurgery) modifiers.push("57");
  if (visit.unrelatedToGlobalSurgery) modifiers.push("24");
  if (visit.significantSeparateProblem) modifiers.push("25");
  return modifiers;
}

function procedureModifiers(procedure: ProcedureFacts, rule: ProcedureRule): string[] {
  const modifiers: string[] = [];
  if (procedure.side === "bilateral" && rule.bilateralModifier) {
    modifiers.push(rule.bilateralModifier);
  } else if (rule.lateralityModifiers || rule.bilateralModifier) {
    if (procedure.side === "left") modifiers.push("LT");
    if (procedure.side === "right") modifiers.push("RT");
    if (procedure.side === "bilateral") modifiers.push(rule.bilateralModifier ?? "50");
  }
  if (procedure.globalModifier) modifiers.push(procedure.globalModifier);
  return modifiers;
}

function emitProcedureLines(
  procedure: ProcedureFacts,
  rule: ProcedureRule,
  pointers: string[],
): CodedLine[] {
  const modifiers = procedureModifiers(procedure, rule);
  const count = levelCount(procedure);
  const primaryUnits = rule.unitsFromLevels ? Math.max(1, count) : 1;
  // Laterality / global modifiers belong on every line from this procedure (primary + add-ons).
  const lines: CodedLine[] = [
    {
      cpt: rule.cpt,
      units: primaryUnits,
      modifiers: [...modifiers],
      diagnosisPointers: pointers,
      rule: rule.id,
      quote: procedure.quote,
    },
  ];
  if (count >= 2 && rule.addonCpt) {
    lines.push({
      cpt: rule.addonCpt,
      units: rule.thirdLevelCpt ? 1 : Math.max(1, count - 1),
      modifiers: [...modifiers],
      diagnosisPointers: pointers,
      rule: `${rule.id}.addon`,
      quote: procedure.quote,
    });
  }
  if (count >= 3 && rule.thirdLevelCpt) {
    lines.push({
      cpt: rule.thirdLevelCpt,
      units: Math.max(1, count - 2),
      modifiers: [...modifiers],
      diagnosisPointers: pointers,
      rule: `${rule.id}.third`,
      quote: procedure.quote,
    });
  }
  return lines;
}

/** E/M on the same day as a procedure needs 25 (or 57 when decision-for-surgery). */
function ensureSameDayVisitModifiers(lines: CodedLine[], facts: CodingFacts): CodedLine[] {
  const visit = facts.visit;
  if (!visit) return lines;
  const hasProcedure = lines.some((line) => !/^992\d{2}$|^99024$/.test(line.cpt));
  const hasEm = lines.some((line) => /^992\d{2}$/.test(line.cpt));
  if (!hasProcedure || !hasEm) return lines;
  return lines.map((line) => {
    if (!/^992\d{2}$/.test(line.cpt)) return line;
    const modifiers = [...line.modifiers];
    if (visit.decisionForSurgery) {
      if (!modifiers.includes("57")) modifiers.push("57");
    } else if (visit.significantSeparateProblem || hasProcedure) {
      // Same-day E/M + procedure: bill with 25 when separately significant (default for combo visits).
      if (!modifiers.includes("25") && !modifiers.includes("57")) modifiers.push("25");
    }
    return { ...line, modifiers };
  });
}

/** Drop add-on CPT lines when their primary was not coded (common when OCR drops the main procedure). */
function dropOrphanAddonLines(lines: CodedLine[], library?: CodeLibrary): CodedLine[] {
  if (!library?.ncci || !lines.length) return lines;
  const onClaim = new Set(lines.map((line) => line.cpt));
  return lines.filter((line) => {
    const primaries = library.ncci?.addonPrimaries.get(line.cpt);
    if (!primaries?.size) return true;
    return [...primaries].some((primary) => onClaim.has(primary));
  });
}

/** When rules intentionally emit an NCCI indicator-1 pair, attach 59 so the claim is billable. */
function applyNcciBypassModifiers(lines: CodedLine[], library?: CodeLibrary): CodedLine[] {
  if (!library?.ncci || lines.length < 2) return lines;
  const next = lines.map((line) => ({ ...line, modifiers: [...line.modifiers] }));
  for (let i = 0; i < next.length; i += 1) {
    for (let j = 0; j < next.length; j += 1) {
      if (i === j) continue;
      const indicator = library.ncci.ptp.get(`${next[i].cpt}|${next[j].cpt}`);
      if (indicator !== 1) continue;
      const hasBypass = [...next[i].modifiers, ...next[j].modifiers].some((modifier) =>
        ["59", "XE", "XP", "XS", "XU", "25", "57", "58", "78", "79", "LT", "RT", "50"].includes(modifier),
      );
      if (hasBypass) continue;
      // Prefer the later / secondary line (add-on, plate, exploration).
      if (!next[j].modifiers.includes("59")) next[j].modifiers.push("59");
    }
  }
  return next;
}

function clampUnitsToMue(lines: CodedLine[], library?: CodeLibrary): CodedLine[] {
  if (!library?.ncci) return lines;
  return lines.map((line) => {
    const mue = library.ncci?.mue.get(line.cpt);
    if (mue == null || line.units <= mue) return line;
    return { ...line, units: mue };
  });
}

/**
 * Pure rules: facts → CPT/ICD numbers. No network.
 * Packs: office (E/M + diagnoses + imaging) and injections (ESI/MBB/RFA/SI/TPI).
 */
function neutralizePlannedProcedures(facts: CodingFacts): CodingFacts {
  return {
    ...facts,
    procedures: facts.procedures.map((procedure) => {
      if (!procedure.performed) return procedure;
      const quote = procedure.quote.toLowerCase();
      const planned = /(recommend|planned|schedule|consider|refer for|decision for|to undergo)/i.test(quote);
      const done = /(performed|completed|underwent|injected|implanted|procedure:|operative|fluoroscop)/i.test(quote);
      if (planned && !done) return { ...procedure, performed: false };
      // Office visit notes that only name a block/injection in the plan (not a procedure note).
      if (
        facts.visit &&
        !done &&
        /medial_branch|transforaminal|interlaminar|facet_rfa|si_joint_injection|blood_patch|trigger_point/.test(
          procedure.name,
        )
      ) {
        return { ...procedure, performed: false };
      }
      return procedure;
    }),
  };
}

export function codeVisit(
  facts: CodingFacts,
  library?: CodeLibrary,
  rules: SpineRules = loadSpineRules(),
  dateOfService = "2026-10-22",
): CodeVisitResult {
  const warnings: string[] = [];
  const diagnoses: CodedDiagnosis[] = [];
  const seenIcd = new Set<string>();
  facts = neutralizePlannedProcedures(facts);

  for (const rawDiagnosis of facts.diagnoses) {
    // Models sometimes emit accompanying findings as the primary condition name.
    const diagnosis =
      rawDiagnosis.condition === "neurogenic_claudication"
        ? {
            ...rawDiagnosis,
            condition: "stenosis",
            region: rawDiagnosis.region ?? "lumbar",
            with: [...new Set([...(rawDiagnosis.with ?? []), "neurogenic_claudication"])],
          }
        : rawDiagnosis;
    if (diagnosis.status === "ruled_out" || diagnosis.status === "negated" || diagnosis.status === "suspected") {
      warnings.push(`Skipped ${diagnosis.condition} (${diagnosis.status}) — not coded as active disease.`);
      continue;
    }
    const rule = matchDiagnosis(diagnosis, rules.diagnoses);
    if (!rule) {
      if (diagnosis.status === "history") {
        warnings.push(`Skipped history “${diagnosis.condition}” — no Z-code rule.`);
      } else {
        warnings.push(`No rule matched diagnosis “${diagnosis.condition}” (${diagnosis.region ?? "no region"}).`);
      }
      continue;
    }
    if (seenIcd.has(rule.icd)) continue;
    seenIcd.add(rule.icd);
    diagnoses.push({ icd: rule.icd, rule: rule.id, quote: diagnosis.quote });
  }

  const lines: CodedLine[] = [];
  const pointers = diagnoses.slice(0, 4).map((item) => item.icd);
  const visit = facts.visit;

  const performedProcedureLines: CodedLine[] = [];
  for (const procedure of facts.procedures) {
    if (!procedure.performed) continue;
    const rule = matchProcedure(procedure, rules.procedures);
    if (!rule) {
      warnings.push(
        `Procedure “${procedure.name}” was performed but no rule emits that CPT yet — code it by search.`,
      );
      continue;
    }
    performedProcedureLines.push(...emitProcedureLines(procedure, rule, pointers));
  }

  // Consult codes only when the note supports a true consultation request.
  let codingVisit = visit;
  if (codingVisit?.kind === "consult") {
    const support = `${codingVisit.quote} ${facts.diagnoses.map((item) => item.quote).join(" ")}`.toLowerCase();
    if (!/(request of|referred by|second opinion|consultation requested|consulted at)/i.test(support)) {
      const kind: VisitKind = /new patient|new pt|establishing care/i.test(support)
        ? "office_new"
        : "office_established";
      codingVisit = { ...codingVisit, kind };
      warnings.push(`Remapped consult → ${kind} (no requesting-provider language).`);
    }
  }

  // Operative / procedure-day notes sometimes mis-tag visit as post_op_global; prefer the work done today.
  const suppressPostOpVisit = codingVisit?.kind === "post_op_global" && performedProcedureLines.length > 0;
  if (codingVisit && !suppressPostOpVisit) {
    const coded = visitCpt(codingVisit.kind, codingVisit.complexity, rules);
    if (coded) {
      lines.push({
        cpt: coded.cpt,
        units: 1,
        modifiers: visitModifiers({ ...facts, visit: codingVisit }),
        diagnosisPointers: pointers,
        rule: coded.rule,
        quote: codingVisit.quote,
      });
    } else {
      warnings.push(`No visit CPT mapping for kind “${codingVisit.kind}”.`);
    }
  } else if (suppressPostOpVisit) {
    warnings.push("Skipped post_op_global visit because performed procedures were coded today.");
  }

  lines.push(...performedProcedureLines);

  const withVisitMods = ensureSameDayVisitModifiers(lines, { ...facts, visit: codingVisit });
  const withoutOrphans = dropOrphanAddonLines(withVisitMods, library);
  const billed = clampUnitsToMue(applyNcciBypassModifiers(withoutOrphans, library), library);

  if (!codingVisit && !billed.length) {
    warnings.push("No visit or performed procedure — nothing to suggest.");
  }

  if (library) {
    const problems = claimCodeProblems(library, {
      dateOfService,
      lines: billed.map((line) => ({
        cpt: line.cpt,
        modifiers: line.modifiers,
        diagnoses: line.diagnosisPointers,
        includeOnBill: line.cpt !== "99024",
        units: line.units,
      })),
    });
    warnings.push(...problems.map((problem) => `Validator: ${problem}`));
  }

  return { lines: billed, diagnoses, warnings };
}
