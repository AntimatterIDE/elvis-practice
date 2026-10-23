import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCodeLibrary } from "@/lib/coding/codes";
import { keepQuotedFacts, quoteInNote, type CodingFacts } from "@/lib/coding/facts";
import { codeVisit, loadOfficeRules } from "@/lib/coding/spine";
import { spineSuggestionsEnabled } from "@/lib/coding/flags";

type Fixture = {
  id: string;
  title: string;
  expectedCptAnyOf: string[];
  expectedIcdAnyOf: string[];
  expectedModifiersAnyOf?: string[];
  forbiddenCptPrefixes?: string[];
  forbiddenIcdExact?: string[];
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

const testLibrary = buildCodeLibrary(
  {
    release: "ICD-10-CM test",
    effectiveFrom: "2026-10-01",
    rows: [
      ["M51.17", 1, "Intervertebral disc disorders with radiculopathy, lumbosacral region"],
      ["M48.062", 1, "Spinal stenosis, lumbar region with neurogenic claudication"],
      ["M43.16", 1, "Spondylolisthesis, lumbar region"],
      ["M54.16", 1, "Radiculopathy, lumbar region"],
      ["M54.50", 1, "Low back pain, unspecified"],
      ["M54.5", 0, "Low back pain"],
      ["M54.2", 1, "Cervicalgia"],
      ["M62.830", 1, "Muscle spasm of back"],
      ["Z47.89", 1, "Encounter for other orthopedic aftercare"],
      ["Z98.1", 1, "Arthrodesis status"],
    ],
  },
  {
    release: "procedures test",
    effectiveFrom: "2026-10-01",
    rows: [
      ["99204", "", "A", "XXX"],
      ["99214", "", "A", "XXX"],
      ["99215", "", "A", "XXX"],
      ["99213", "", "A", "XXX"],
      ["99212", "", "A", "XXX"],
      ["99024", "", "B", "XXX"],
    ],
  },
);

describe("office spine rules", () => {
  it("loads the office rule pack", () => {
    const rules = loadOfficeRules();
    expect(rules.id).toBe("office");
    const officeNew = rules.visitCodes.office_new as Record<string, string>;
    expect(officeNew.moderate).toBe("99204");
  });

  it("keeps suggestions off by default", () => {
    expect(spineSuggestionsEnabled({})).toBe(false);
    expect(spineSuggestionsEnabled({ SPINE_CODING_SUGGESTIONS: "true" })).toBe(true);
  });

  for (const fixture of fixtures) {
    it(`${fixture.id}: ${fixture.title}`, () => {
      const note = baselineNotes.get(fixture.id);
      expect(note, `missing baseline note for ${fixture.id}`).toBeTruthy();
      const checked = keepQuotedFacts(note!, fixture.facts);
      expect(checked.warnings, checked.warnings.map((item) => item.message).join("; ")).toEqual([]);

      const result = codeVisit(checked.facts, testLibrary);
      const cpts = result.lines.map((line) => line.cpt);
      const icds = result.diagnoses.map((item) => item.icd);
      const modifiers = result.lines.flatMap((line) => line.modifiers);

      expect(fixture.expectedCptAnyOf.some((code) => cpts.includes(code))).toBe(true);
      expect(fixture.expectedIcdAnyOf.some((code) => icds.includes(code))).toBe(true);

      for (const prefix of fixture.forbiddenCptPrefixes ?? []) {
        expect(cpts.some((code) => code.startsWith(prefix))).toBe(false);
      }
      for (const code of fixture.forbiddenIcdExact ?? []) {
        expect(icds).not.toContain(code);
      }
      for (const modifier of fixture.expectedModifiersAnyOf ?? []) {
        expect(modifiers).toContain(modifier);
      }

      // Planned procedures must not become CPT lines.
      expect(cpts.some((code) => code.startsWith("63") || code.startsWith("22"))).toBe(false);
    });
  }

  it("drops facts whose quotes are not in the note", () => {
    const note = baselineNotes.get("E02")!;
    const bad = keepQuotedFacts(note, {
      visit: {
        kind: "office_established",
        complexity: "moderate",
        quote: "This sentence is not in the note at all.",
      },
      procedures: [],
      diagnoses: [
        {
          condition: "stenosis",
          region: "lumbar",
          with: ["neurogenic_claudication"],
          status: "current",
          quote: "also missing",
        },
      ],
      injury: null,
    });
    expect(bad.facts.visit).toBeNull();
    expect(bad.facts.diagnoses).toEqual([]);
    expect(bad.warnings.length).toBeGreaterThan(0);
  });

  it("matches L5-S1 quotes that use an en dash", () => {
    const note = baselineNotes.get("E01")!;
    expect(quoteInNote(note, "L5-S1 disc herniation")).toBe(true);
  });

  it("codes against the production CMS library without inventing retired M54.5", () => {
    const fixture = fixtures.find((item) => item.id === "E08")!;
    const production = buildCodeLibrary(
      JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/icd10cm.json"), "utf8")),
      JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/procedures.json"), "utf8")),
      {
        ptp: JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/ncci-ptp.json"), "utf8")),
        mue: JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/mue.json"), "utf8")),
        addon: JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/addon-primaries.json"), "utf8")),
      },
    );
    const result = codeVisit(fixture.facts, production);
    expect(result.diagnoses.map((item) => item.icd)).not.toContain("M54.5");
    expect(result.diagnoses.some((item) => item.icd === "M54.50" || item.icd === "M54.2")).toBe(true);
    expect(result.warnings.some((warning) => warning.startsWith("Validator:"))).toBe(false);
  });
});
