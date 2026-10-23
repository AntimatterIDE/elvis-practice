/**
 * Live extraction eval against baseline notes (costs OpenAI calls).
 * Usage: OPENAI_API_KEY=... npx tsx --tsconfig tsconfig.json scripts/eval-extraction.ts
 *
 * Compares extracted facts to the hand-checked fixture facts (visit kind, diagnosis
 * conditions, performed procedure names). Does not assert CPT/ICD from the model.
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { extractCodingFacts } from "../lib/coding/extract";
import type { CodingFacts } from "../lib/coding/facts";
import { codeVisit, resetSpineRulesCache } from "../lib/coding/spine";
import { buildCodeLibrary, claimCodeProblems } from "../lib/coding/codes";

type Fixture = {
  id: string;
  title: string;
  expectedCptAnyOf: string[];
  expectedIcdAnyOf: string[];
  facts: CodingFacts;
};

const root = process.cwd();
const limitArg = process.argv.find((arg) => arg.startsWith("--limit="));
const limit = limitArg ? Number(limitArg.split("=")[1]) : undefined;
const idsArg = process.argv.find((arg) => arg.startsWith("--ids="));
const onlyIds = idsArg ? new Set(idsArg.split("=")[1].split(",")) : null;

const fixtures = (
  JSON.parse(readFileSync(path.join(root, "tests/fixtures/spine-office-facts.json"), "utf8")) as Fixture[]
).filter((fixture) => (onlyIds ? onlyIds.has(fixture.id) : true));

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

function matchesPattern(code: string, pattern: string) {
  const trimmed = pattern.trim();
  if (trimmed.endsWith("*")) return code.startsWith(trimmed.slice(0, -1));
  return code === trimmed;
}

const selected = typeof limit === "number" && Number.isFinite(limit) ? fixtures.slice(0, limit) : fixtures;
const rows = [];

for (const fixture of selected) {
  const note = notes.get(fixture.id);
  if (!note) {
    rows.push({ id: fixture.id, ok: false, error: "missing note" });
    continue;
  }
  console.log(`Extracting ${fixture.id}…`);
  const extracted = await extractCodingFacts(note);
  const coded = codeVisit(extracted.facts, library);
  const cpts = coded.lines.map((line) => line.cpt);
  const icds = coded.diagnoses.map((item) => item.icd);
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

  const expectedVisit = fixture.facts.visit?.kind ?? null;
  const gotVisit = extracted.facts.visit?.kind ?? null;
  const expectedDx = new Set(
    fixture.facts.diagnoses.filter((item) => item.status === "current").map((item) => item.condition),
  );
  const gotDx = new Set(
    extracted.facts.diagnoses.filter((item) => item.status === "current").map((item) => item.condition),
  );
  const expectedPx = new Set(
    fixture.facts.procedures.filter((item) => item.performed).map((item) => item.name),
  );
  const gotPx = new Set(extracted.facts.procedures.filter((item) => item.performed).map((item) => item.name));

  const cptHit =
    !fixture.expectedCptAnyOf.length || fixture.expectedCptAnyOf.some((code) => cpts.includes(code));
  const icdHit =
    !fixture.expectedIcdAnyOf.length ||
    fixture.expectedIcdAnyOf.some((pattern) => icds.some((code) => matchesPattern(code, pattern)));

  rows.push({
    id: fixture.id,
    visitMatch: expectedVisit === gotVisit,
    expectedVisit,
    gotVisit,
    dxRecall: [...expectedDx].filter((item) => gotDx.has(item)).length / Math.max(1, expectedDx.size),
    pxRecall: [...expectedPx].filter((item) => gotPx.has(item)).length / Math.max(1, expectedPx.size),
    cptHit,
    icdHit,
    cpts,
    icds,
    extractWarnings: extracted.warnings.map((item) => item.message),
    validatorProblems: problems,
    ok: cptHit && icdHit && problems.length === 0,
  });
}

const passed = rows.filter((row) => row.ok).length;
const out = {
  generatedAt: new Date().toISOString(),
  model: "gpt-5-mini-2025-08-07",
  count: rows.length,
  passed,
  failed: rows.length - passed,
  rows,
};
const outPath = path.join(root, "docs/spine-coding/baseline-2026-10-22/extraction-eval.json");
writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Extraction eval: ${passed}/${rows.length} end-to-end code hits with clean validator`);
console.log(`Wrote ${outPath}`);
if (passed < rows.length) process.exitCode = 1;
