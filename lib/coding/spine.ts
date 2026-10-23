import { readFileSync } from "node:fs";
import path from "node:path";
import { claimCodeProblems, type CodeLibrary } from "@/lib/coding/codes";
import type { CodingFacts, Complexity, DiagnosisFacts, FactStatus, VisitKind } from "@/lib/coding/facts";

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
  cpt: string;
};

type OfficeRules = {
  id: string;
  version: string;
  visitCodes: Record<string, VisitCodeTable>;
  procedures?: ProcedureRule[];
  diagnoses: DiagnosisRule[];
};

let cachedRules: OfficeRules | null = null;

export function loadOfficeRules(source?: unknown): OfficeRules {
  if (source) {
    cachedRules = null;
    return source as OfficeRules;
  }
  cachedRules ??= JSON.parse(
    readFileSync(path.join(process.cwd(), "data/coding/spine-rules/office.json"), "utf8"),
  ) as OfficeRules;
  return cachedRules;
}

/** Clear the on-disk cache (tests that rewrite office.json). */
export function resetOfficeRulesCache() {
  cachedRules = null;
}

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
  return wanted.some((entry) => entry.toLowerCase() === region);
}

function withMatches(factWith: string[] | undefined, wanted: string[] | undefined) {
  if (!wanted?.length) return true;
  const have = new Set((factWith ?? []).map((entry) => entry.toLowerCase()));
  return wanted.some((entry) => have.has(entry.toLowerCase()));
}

/** Prefer lumbosacral HNP when levels mention L5-S1 even if region says lumbar. */
function effectiveRegion(diagnosis: DiagnosisFacts) {
  const levels = (diagnosis.levels ?? []).map(normalizeLevel);
  if (levels.some((level) => level.includes("L5-S1") || level === "L5S1")) return "lumbosacral";
  return diagnosis.region?.toLowerCase() ?? null;
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

function visitCpt(kind: VisitKind, complexity: Complexity, rules: OfficeRules): { cpt: string; rule: string } | null {
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

/**
 * Pure rules: facts → CPT/ICD numbers. No network.
 * Office / consult / post-op + in-office imaging. Surgery/injection CPT come later.
 */
export function codeVisit(
  facts: CodingFacts,
  library?: CodeLibrary,
  rules: OfficeRules = loadOfficeRules(),
  dateOfService = "2026-10-22",
): CodeVisitResult {
  const warnings: string[] = [];
  const diagnoses: CodedDiagnosis[] = [];
  const seenIcd = new Set<string>();

  for (const diagnosis of facts.diagnoses) {
    if (diagnosis.status === "ruled_out" || diagnosis.status === "negated" || diagnosis.status === "suspected") {
      warnings.push(`Skipped ${diagnosis.condition} (${diagnosis.status}) — not coded as active disease.`);
      continue;
    }
    const rule = matchDiagnosis(diagnosis, rules.diagnoses);
    if (!rule) {
      if (diagnosis.status === "history") {
        warnings.push(`Skipped history “${diagnosis.condition}” — no Z-code rule.`);
      } else {
        warnings.push(`No office rule matched diagnosis “${diagnosis.condition}” (${diagnosis.region ?? "no region"}).`);
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
  if (visit) {
    const coded = visitCpt(visit.kind, visit.complexity, rules);
    if (coded) {
      lines.push({
        cpt: coded.cpt,
        units: 1,
        modifiers: visitModifiers(facts),
        diagnosisPointers: pointers,
        rule: coded.rule,
        quote: visit.quote,
      });
    } else {
      warnings.push(`No visit CPT mapping for kind “${visit.kind}”.`);
    }
  } else {
    warnings.push("No visit fact — no E/M or post-op CPT suggested.");
  }

  const procedureRules = rules.procedures ?? [];
  for (const procedure of facts.procedures) {
    if (!procedure.performed) continue;
    const rule = procedureRules.find((entry) => entry.name === procedure.name);
    if (!rule) {
      warnings.push(
        `Procedure “${procedure.name}” was performed but office rules do not emit that CPT yet — code it by search.`,
      );
      continue;
    }
    lines.push({
      cpt: rule.cpt,
      units: 1,
      modifiers: [],
      diagnosisPointers: pointers,
      rule: rule.id,
      quote: procedure.quote,
    });
  }

  if (library) {
    const problems = claimCodeProblems(library, {
      dateOfService,
      lines: lines.map((line) => ({
        cpt: line.cpt,
        modifiers: line.modifiers,
        diagnoses: line.diagnosisPointers,
        includeOnBill: line.cpt !== "99024",
        units: line.units,
      })),
    });
    warnings.push(...problems.map((problem) => `Validator: ${problem}`));
  }

  return { lines, diagnoses, warnings };
}
