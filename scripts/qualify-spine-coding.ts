/**
 * Strenuous offline qualification for spine code generation.
 * Usage: npx tsx scripts/qualify-spine-coding.ts
 * Optional live extraction: OPENAI_API_KEY=... npx tsx scripts/qualify-spine-coding.ts --extract
 */
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { buildCodeLibrary, claimCodeProblems, checkDiagnosis, checkProcedure } from "../lib/coding/codes";
import { keepQuotedFacts, type CodingFacts } from "../lib/coding/facts";
import { codeVisit, resetSpineRulesCache } from "../lib/coding/spine";

type Fixture = {
  id: string;
  title: string;
  expectedCptAnyOf: string[];
  expectedIcdAnyOf: string[];
  forbiddenCptPrefixes?: string[];
  forbiddenIcdPrefixes?: string[];
  facts: CodingFacts;
};

type CaseResult = {
  id: string;
  ok: boolean;
  cpts: string[];
  icds: string[];
  problems: string[];
  errors: string[];
};

function matchesPattern(code: string, pattern: string) {
  const trimmed = pattern.trim();
  if (trimmed.endsWith("*")) return code.startsWith(trimmed.slice(0, -1));
  return code === trimmed;
}

function isForbiddenIcd(code: string, pattern: string) {
  const prefix = pattern.trim();
  if (prefix.endsWith("*")) return code.startsWith(prefix.slice(0, -1));
  if (code === prefix) return true;
  if (!code.startsWith(prefix)) return false;
  const next = code[prefix.length];
  if (next && /[0-9]/.test(next)) return false;
  return true;
}

const root = process.cwd();
const fixtures = JSON.parse(
  readFileSync(path.join(root, "tests/fixtures/spine-office-facts.json"), "utf8"),
) as Fixture[];
const notes = new Map(
  (
    JSON.parse(readFileSync(path.join(root, "docs/spine-coding/baseline-2026-10-22/cases.json"), "utf8")) as {
      id: string;
      note: string;
    }[]
  ).map((item) => [item.id, item.note]),
);

resetSpineRulesCache();
const library = buildCodeLibrary(
  JSON.parse(readFileSync(path.join(root, "data/coding/icd10cm.json"), "utf8")),
  JSON.parse(readFileSync(path.join(root, "data/coding/procedures.json"), "utf8")),
  {
    ptp: JSON.parse(readFileSync(path.join(root, "data/coding/ncci-ptp.json"), "utf8")),
    mue: JSON.parse(readFileSync(path.join(root, "data/coding/mue.json"), "utf8")),
    addon: JSON.parse(readFileSync(path.join(root, "data/coding/addon-primaries.json"), "utf8")),
  },
);

const results: CaseResult[] = [];

for (const fixture of fixtures) {
  const errors: string[] = [];
  const note = notes.get(fixture.id);
  if (!note) errors.push("missing baseline note");
  const checked = note ? keepQuotedFacts(note, fixture.facts) : { facts: fixture.facts, warnings: [] };
  for (const warning of checked.warnings) errors.push(warning.message);

  const coded = codeVisit(checked.facts, library);
  const cpts = coded.lines.map((line) => line.cpt);
  const icds = coded.diagnoses.map((item) => item.icd);

  if (fixture.expectedCptAnyOf.length) {
    if (!fixture.expectedCptAnyOf.some((code) => cpts.includes(code))) {
      errors.push(`CPT miss: got [${cpts.join(", ")}] expected any of [${fixture.expectedCptAnyOf.join(", ")}]`);
    }
  } else if (cpts.length) {
    errors.push(`CPT unexpected: [${cpts.join(", ")}]`);
  }

  if (fixture.expectedIcdAnyOf.length) {
    if (!fixture.expectedIcdAnyOf.some((pattern) => icds.some((code) => matchesPattern(code, pattern)))) {
      errors.push(`ICD miss: got [${icds.join(", ")}] expected any of [${fixture.expectedIcdAnyOf.join(", ")}]`);
    }
  } else if (icds.length) {
    errors.push(`ICD unexpected: [${icds.join(", ")}]`);
  }

  for (const prefix of fixture.forbiddenCptPrefixes ?? []) {
    if (cpts.some((code) => code.startsWith(prefix))) errors.push(`forbidden CPT prefix ${prefix}`);
  }
  for (const prefix of fixture.forbiddenIcdPrefixes ?? []) {
    if (icds.some((code) => isForbiddenIcd(code, prefix))) errors.push(`forbidden ICD ${prefix}`);
  }

  for (const icd of icds) {
    const check = checkDiagnosis(library, icd);
    if (!check.ok) errors.push(check.message);
  }
  for (const cpt of cpts) {
    const check = checkProcedure(library, cpt);
    if (!check.ok) errors.push(check.message);
  }

  const problems = claimCodeProblems(library, {
    dateOfService: "2026-10-22",
    lines: coded.lines.map((line) => ({
      cpt: line.cpt,
      modifiers: line.modifiers,
      diagnoses: line.diagnosisPointers.length ? line.diagnosisPointers : icds.slice(0, 1),
      includeOnBill: line.cpt !== "99024",
      units: line.units,
    })),
  });
  errors.push(...problems);

  results.push({
    id: fixture.id,
    ok: errors.length === 0,
    cpts,
    icds,
    problems,
    errors,
  });
}

const passed = results.filter((item) => item.ok).length;
const failed = results.filter((item) => !item.ok);

const gate = {
  generatedAt: new Date().toISOString(),
  fixtureCount: fixtures.length,
  passed,
  failed: failed.length,
  productionLibrary: {
    diagnoses: library.diagnoses.billable.length,
    procedures: library.procedures.list.length,
    ncciPairs: library.ncci?.ptp.size ?? 0,
  },
  mustBeZero: {
    failedFixtures: failed.length,
    nonBillableOrRetired: results.filter((item) =>
      item.errors.some((error) => /not a billable code|not a code in|category/i.test(error)),
    ).length,
    validatorProblems: results.filter((item) => item.problems.length > 0).length,
  },
  qualifyForSuggestions: failed.length === 0,
  stillNeededForLaunch: [
    "Dr. Francois sign-off on office / injection / surgery rule tables",
    "≥150 de-identified real notes with confirmed codes (plan §8 gate)",
    "Optional: live extraction eval (OPENAI_API_KEY + --extract)",
    "Set SPINE_CODING_SUGGESTIONS=true only after the above",
  ],
  failures: failed.map((item) => ({ id: item.id, errors: item.errors })),
};

const outDir = path.join(root, "docs/spine-coding/baseline-2026-10-22");
mkdirSync(outDir, { recursive: true });
const outPath = path.join(outDir, "qualify-results.json");
writeFileSync(outPath, `${JSON.stringify(gate, null, 2)}\n`);

console.log(`Spine coding qualification: ${passed}/${fixtures.length} passed`);
console.log(`Production CMS: ${gate.productionLibrary.diagnoses} ICD billable, ${gate.productionLibrary.procedures} procedures, ${gate.productionLibrary.ncciPairs} NCCI pairs`);
console.log(`Qualify for suggestions (fixture+validator bar): ${gate.qualifyForSuggestions ? "YES" : "NO"}`);
if (failed.length) {
  for (const item of failed) {
    console.log(`  FAIL ${item.id}: ${item.errors.join(" | ")}`);
  }
  process.exitCode = 1;
} else {
  console.log("Still needed before turning SPINE_CODING_SUGGESTIONS on:");
  for (const item of gate.stillNeededForLaunch) console.log(`  - ${item}`);
}
console.log(`Wrote ${outPath}`);

if (process.argv.includes("--extract")) {
  console.log("For live extraction eval run: npm run test:extract");
}
