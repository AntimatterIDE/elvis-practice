import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCodeLibrary, claimCodeProblems, checkDiagnosis, checkProcedure } from "@/lib/coding/codes";
import { keepQuotedFacts, type CodingFacts } from "@/lib/coding/facts";
import { codeVisit, resetSpineRulesCache } from "@/lib/coding/spine";

type Fixture = {
  id: string;
  title: string;
  expectedCptAnyOf: string[];
  expectedIcdAnyOf: string[];
  expectedModifiersAnyOf?: string[];
  forbiddenCptPrefixes?: string[];
  forbiddenIcdPrefixes?: string[];
  facts: CodingFacts;
};

const fixtures = JSON.parse(
  readFileSync(path.join(process.cwd(), "tests/fixtures/spine-office-facts.json"), "utf8"),
) as Fixture[];

const baselineNotes = new Map(
  (
    JSON.parse(
      readFileSync(path.join(process.cwd(), "docs/spine-coding/baseline-2026-10-22/cases.json"), "utf8"),
    ) as { id: string; note: string }[]
  ).map((item) => [item.id, item.note]),
);

const production = buildCodeLibrary(
  JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/icd10cm.json"), "utf8")),
  JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/procedures.json"), "utf8")),
  {
    ptp: JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/ncci-ptp.json"), "utf8")),
    mue: JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/mue.json"), "utf8")),
    addon: JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/addon-primaries.json"), "utf8")),
  },
);

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

describe("spine coding qualification (production CMS + NCCI)", () => {
  resetSpineRulesCache();

  it("loads the full baseline fixture set", () => {
    expect(fixtures).toHaveLength(60);
    expect(production.diagnoses.billable.length).toBeGreaterThan(10_000);
    expect(production.procedures.list.length).toBeGreaterThan(1_000);
    expect(production.ncci).toBeTruthy();
  });

  for (const fixture of fixtures) {
    it(`qualify ${fixture.id}: ${fixture.title}`, () => {
      const note = baselineNotes.get(fixture.id);
      expect(note, `missing note ${fixture.id}`).toBeTruthy();

      const checked = keepQuotedFacts(note!, fixture.facts);
      expect(checked.warnings.map((item) => item.message)).toEqual([]);

      // Negated / ruled out / suspected must never become ICD.
      for (const diagnosis of checked.facts.diagnoses) {
        if (diagnosis.status === "negated" || diagnosis.status === "ruled_out" || diagnosis.status === "suspected") {
          const result = codeVisit(
            { ...checked.facts, diagnoses: [diagnosis], procedures: [], visit: null },
            production,
          );
          expect(result.diagnoses, `${fixture.id} coded ${diagnosis.status} ${diagnosis.condition}`).toEqual([]);
        }
      }

      // Planned procedures must never become CPT.
      for (const procedure of checked.facts.procedures) {
        if (procedure.performed) continue;
        const result = codeVisit(
          { ...checked.facts, procedures: [procedure], visit: null, diagnoses: [] },
          production,
        );
        expect(result.lines, `${fixture.id} coded planned ${procedure.name}`).toEqual([]);
      }

      const result = codeVisit(checked.facts, production);
      const cpts = result.lines.map((line) => line.cpt);
      const icds = result.diagnoses.map((item) => item.icd);

      if (fixture.expectedCptAnyOf.length) {
        expect(
          fixture.expectedCptAnyOf.some((code) => cpts.includes(code)),
          `${fixture.id} CPT [${cpts.join(", ")}] vs [${fixture.expectedCptAnyOf.join(", ")}] · ${result.warnings.join(" | ")}`,
        ).toBe(true);
      } else {
        expect(cpts).toEqual([]);
      }

      if (fixture.expectedIcdAnyOf.length) {
        expect(
          fixture.expectedIcdAnyOf.some((pattern) => icds.some((code) => matchesPattern(code, pattern))),
          `${fixture.id} ICD [${icds.join(", ")}] vs [${fixture.expectedIcdAnyOf.join(", ")}]`,
        ).toBe(true);
      } else {
        expect(icds).toEqual([]);
      }

      for (const prefix of fixture.forbiddenCptPrefixes ?? []) {
        expect(cpts.some((code) => code.startsWith(prefix))).toBe(false);
      }
      for (const prefix of fixture.forbiddenIcdPrefixes ?? []) {
        expect(icds.some((code) => isForbiddenIcd(code, prefix))).toBe(false);
      }
      for (const modifier of fixture.expectedModifiersAnyOf ?? []) {
        expect(result.lines.flatMap((line) => line.modifiers)).toContain(modifier);
      }

      // Every emitted code must exist and be billable / active in the loaded CMS files.
      for (const icd of icds) {
        const checkedIcd = checkDiagnosis(production, icd);
        expect(checkedIcd.ok, `${fixture.id} ICD ${icd}: ${!checkedIcd.ok ? checkedIcd.message : ""}`).toBe(true);
      }
      for (const cpt of cpts) {
        const checkedCpt = checkProcedure(production, cpt);
        expect(checkedCpt.ok, `${fixture.id} CPT ${cpt}: ${!checkedCpt.ok ? checkedCpt.message : ""}`).toBe(true);
      }

      // Hard claim checks (NCCI / MUE / add-on / billable) must be clean for billed lines.
      const problems = claimCodeProblems(production, {
        dateOfService: "2026-10-22",
        lines: result.lines.map((line) => ({
          cpt: line.cpt,
          modifiers: line.modifiers,
          diagnoses: line.diagnosisPointers.length ? line.diagnosisPointers : icds.slice(0, 1),
          includeOnBill: line.cpt !== "99024",
          units: line.units,
        })),
      });
      expect(problems, `${fixture.id} validator: ${problems.join(" | ")}`).toEqual([]);

      // History-only breast cancer must never become a C50* code.
      if (fixture.id === "X02" || fixture.id === "E18") {
        expect(icds.some((code) => code.startsWith("C50"))).toBe(false);
      }
    });
  }

  it("refuses to code a fabricated quote", () => {
    const note = baselineNotes.get("E02")!;
    const bad = keepQuotedFacts(note, {
      visit: { kind: "office_established", complexity: "moderate", quote: "not in the note" },
      procedures: [],
      diagnoses: [{ condition: "stenosis", region: "lumbar", status: "current", quote: "also missing", with: [] }],
      injury: null,
    });
    expect(bad.facts.visit).toBeNull();
    expect(bad.facts.diagnoses).toEqual([]);
  });
});
