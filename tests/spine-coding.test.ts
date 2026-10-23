import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCodeLibrary } from "@/lib/coding/codes";
import { keepQuotedFacts, quoteInNote, type CodingFacts } from "@/lib/coding/facts";
import { spineSuggestionsEnabled } from "@/lib/coding/flags";
import { codeVisit, loadOfficeRules, resetOfficeRulesCache } from "@/lib/coding/spine";

type Fixture = {
  id: string;
  title: string;
  expectedCptAnyOf: string[];
  expectedIcdAnyOf: string[];
  expectedModifiersAnyOf?: string[];
  expectedModifiersOnCpt?: Record<string, string[]>;
  forbiddenCptPrefixes?: string[];
  forbiddenIcdPrefixes?: string[];
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
      ["M51.17", 1, "HNP radiculopathy lumbosacral"],
      ["M51.16", 1, "HNP radiculopathy lumbar"],
      ["M51.26", 1, "HNP lumbar other"],
      ["M51.04", 1, "Thoracic HNP myelopathy"],
      ["M51.360", 1, "DDD lumbar"],
      ["M50.122", 1, "Cervical HNP radiculopathy"],
      ["M50.022", 1, "Cervical HNP myelopathy"],
      ["M48.062", 1, "Stenosis with NC"],
      ["M48.061", 1, "Stenosis lumbar"],
      ["M48.02", 1, "Stenosis cervical"],
      ["M48.8X2", 1, "OPLL cervical"],
      ["M43.16", 1, "Spondylolisthesis lumbar"],
      ["M43.17", 1, "Spondylolisthesis lumbosacral"],
      ["M43.07", 1, "Spondylolysis"],
      ["M54.16", 1, "Radiculopathy lumbar"],
      ["M54.12", 1, "Radiculopathy cervical"],
      ["M54.50", 1, "Low back pain"],
      ["M54.5", 0, "Low back pain category"],
      ["M54.2", 1, "Cervicalgia"],
      ["M54.6", 1, "Thoracic pain"],
      ["M54.41", 1, "Sciatica right"],
      ["M54.31", 1, "Sciatica left"],
      ["M62.830", 1, "Muscle spasm"],
      ["M53.3", 1, "Coccydynia"],
      ["M47.12", 1, "Cervical myelopathy"],
      ["M47.812", 1, "Cervical spondylosis"],
      ["M47.816", 1, "Lumbar spondylosis"],
      ["M47.819", 1, "Spondylosis unspecified"],
      ["M96.1", 1, "Postlaminectomy"],
      ["M96.0", 1, "Pseudarthrosis"],
      ["T84.216A", 1, "Hardware breakdown"],
      ["G83.4", 1, "Cauda equina"],
      ["C79.51", 1, "Bone metastasis"],
      ["M84.58XA", 1, "Pathologic fx neoplasm"],
      ["Z85.3", 1, "History breast cancer"],
      ["M46.26", 1, "Discitis"],
      ["G06.1", 1, "Epidural abscess"],
      ["E11.9", 1, "T2DM"],
      ["M45.6", 1, "AS lumbar"],
      ["M46.1", 1, "Sacroiliitis"],
      ["Z47.89", 1, "Aftercare"],
      ["Z98.1", 1, "Fusion status"],
      ["M41.86", 1, "Scoliosis adult"],
      ["M41.84", 1, "Scoliosis thoracic"],
      ["M41.9", 1, "Scoliosis unspecified"],
      ["M41.125", 1, "AIS"],
      ["S32.011A", 1, "L1 burst"],
      ["S13.4XXA", 1, "Cervical sprain"],
      ["S39.012A", 1, "Lumbar strain"],
      ["S12.112A", 1, "Dens fx"],
      ["M80.08XD", 1, "Osteoporotic fx subsequent"],
      ["S14.124A", 1, "Central cord"],
      ["M79.18", 1, "Myofascial pain"],
      ["G97.1", 1, "Post dural puncture headache"],
      ["M80.08XA", 1, "Osteoporotic fx initial"],
      ["G97.41", 1, "Dural tear"],
      ["T84.84XA", 1, "Hardware pain"],
      ["Z47.2", 1, "Aftercare explant"],
      ["T81.42XA", 1, "SSI"],
      ["T84.7XXA", 1, "Implant infection"],
      ["M51.36", 1, "DDD lumbar"],
      ["M51.360", 1, "DDD lumbar other"],
    ],
  },
  {
    release: "procedures test",
    effectiveFrom: "2026-10-01",
    rows: [
      ["99202", "", "A", "XXX"],
      ["99203", "", "A", "XXX"],
      ["99204", "", "A", "XXX"],
      ["99205", "", "A", "XXX"],
      ["99212", "", "A", "XXX"],
      ["99213", "", "A", "XXX"],
      ["99214", "", "A", "XXX"],
      ["99215", "", "A", "XXX"],
      ["99242", "", "A", "XXX"],
      ["99243", "", "A", "XXX"],
      ["99244", "", "A", "XXX"],
      ["99245", "", "A", "XXX"],
      ["99024", "", "B", "XXX"],
      ["72082", "", "A", "XXX"],
      ["72081", "", "A", "XXX"],
      ["64479", "", "A", "XXX"],
      ["64480", "", "A", "ZZZ"],
      ["64483", "", "A", "XXX"],
      ["64484", "", "A", "ZZZ"],
      ["62323", "", "A", "XXX"],
      ["62321", "", "A", "XXX"],
      ["64490", "", "A", "XXX"],
      ["64491", "", "A", "ZZZ"],
      ["64492", "", "A", "ZZZ"],
      ["64493", "", "A", "XXX"],
      ["64494", "", "A", "ZZZ"],
      ["64495", "", "A", "ZZZ"],
      ["64633", "", "A", "XXX"],
      ["64634", "", "A", "ZZZ"],
      ["64635", "", "A", "XXX"],
      ["64636", "", "A", "ZZZ"],
      ["27096", "", "A", "XXX"],
      ["20552", "", "A", "XXX"],
      ["20553", "", "A", "XXX"],
      ["62273", "", "A", "XXX"],
      ["63030", "", "A", "090"],
      ["63035", "", "A", "ZZZ"],
      ["22551", "", "A", "090"],
      ["22552", "", "A", "ZZZ"],
      ["22633", "", "A", "090"],
      ["22630", "", "A", "090"],
      ["22600", "", "A", "090"],
      ["22614", "", "A", "ZZZ"],
      ["63047", "", "A", "090"],
      ["63048", "", "A", "ZZZ"],
      ["63045", "", "A", "090"],
      ["22513", "", "A", "090"],
      ["22514", "", "A", "090"],
      ["22856", "", "A", "090"],
      ["22840", "", "A", "XXX"],
      ["22842", "", "A", "XXX"],
      ["22845", "", "A", "XXX"],
      ["22846", "", "A", "XXX"],
      ["22853", "", "A", "XXX"],
      ["63650", "", "A", "XXX"],
      ["22850", "", "A", "XXX"],
      ["22830", "", "A", "XXX"],
      ["22558", "", "A", "090"],
      ["22585", "", "A", "ZZZ"],
      ["22015", "", "A", "XXX"],
      ["27279", "", "A", "090"],
    ],
  },
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

function matchesAny(code: string, patterns: string[]) {
  return patterns.some((pattern) => matchesPattern(code, pattern));
}

/** Forbid retired/category codes without blocking more-specific billable children (M54.5 vs M54.50). */
function isForbiddenIcd(code: string, pattern: string) {
  const prefix = pattern.trim();
  if (prefix.endsWith("*")) return code.startsWith(prefix.slice(0, -1));
  if (code === prefix) return true;
  if (!code.startsWith(prefix)) return false;
  const next = code[prefix.length];
  if (next && /[0-9]/.test(next)) return false;
  return true;
}

describe("office spine code generation", () => {
  resetOfficeRulesCache();

  it("loads merged spine rule packs", () => {
    const rules = loadOfficeRules();
    expect(rules.visitCodes.office_new).toBeTruthy();
    const officeNew = rules.visitCodes.office_new as Record<string, string>;
    expect(officeNew.moderate).toBe("99204");
    expect(rules.procedures.some((rule) => rule.name === "transforaminal_esi")).toBe(true);
    expect(rules.diagnoses.length).toBeGreaterThan(40);
  });

  it("keeps suggestions on by default with an explicit kill-switch", () => {
    expect(spineSuggestionsEnabled({})).toBe(true);
    expect(spineSuggestionsEnabled({ SPINE_CODING_SUGGESTIONS: "true" })).toBe(true);
    expect(spineSuggestionsEnabled({ SPINE_CODING_SUGGESTIONS: "false" })).toBe(false);
  });

  it(`covers ${fixtures.length} baseline fixtures (office + injections + surgery + modifiers)`, () => {
    expect(fixtures.length).toBe(300);
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

      if (fixture.expectedCptAnyOf.length) {
        expect(
          fixture.expectedCptAnyOf.some((code) => cpts.includes(code)),
          `${fixture.id} CPT got [${cpts.join(", ")}] expected any of [${fixture.expectedCptAnyOf.join(", ")}] warnings=${result.warnings.join(" | ")}`,
        ).toBe(true);
      } else {
        expect(cpts, `${fixture.id} expected no CPT`).toEqual([]);
      }

      if (fixture.expectedIcdAnyOf.length) {
        expect(
          fixture.expectedIcdAnyOf.some((pattern) => icds.some((code) => matchesPattern(code, pattern))),
          `${fixture.id} ICD got [${icds.join(", ")}] expected any of [${fixture.expectedIcdAnyOf.join(", ")}]`,
        ).toBe(true);
      } else {
        expect(icds, `${fixture.id} expected no ICD`).toEqual([]);
      }

      for (const prefix of fixture.forbiddenCptPrefixes ?? []) {
        expect(
          cpts.some((code) => code.startsWith(prefix)),
          `${fixture.id} forbidden CPT prefix ${prefix} in [${cpts.join(", ")}]`,
        ).toBe(false);
      }
      for (const prefix of fixture.forbiddenIcdPrefixes ?? []) {
        expect(
          icds.some((code) => isForbiddenIcd(code, prefix)),
          `${fixture.id} forbidden ICD ${prefix} in [${icds.join(", ")}]`,
        ).toBe(false);
      }
      for (const code of fixture.forbiddenIcdExact ?? []) {
        expect(icds).not.toContain(code);
      }
      for (const modifier of fixture.expectedModifiersAnyOf ?? []) {
        expect(modifiers).toContain(modifier);
      }
      for (const [cpt, need] of Object.entries(fixture.expectedModifiersOnCpt ?? {})) {
        const line = result.lines.find((item) => item.cpt === cpt);
        expect(line, `${fixture.id} missing CPT ${cpt} for modifier check`).toBeTruthy();
        for (const modifier of need) {
          expect(line!.modifiers, `${fixture.id} ${cpt} missing ${modifier}`).toContain(modifier);
        }
      }

      // Office/injection fixtures: planned (not performed) surgery must not become CPT.
      const plannedOnly = (fixture.facts.procedures ?? []).every((procedure) => !procedure.performed);
      if (plannedOnly && !fixture.id.startsWith("S")) {
        expect(cpts.some((code) => /^(630|225|226|228)/.test(code))).toBe(false);
      }
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

  it("does not emit retired M54.5 against production ICD files", () => {
    const fixture = fixtures.find((item) => item.id === "E08")!;
    const production = buildCodeLibrary(
      JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/icd10cm.json"), "utf8")),
      JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/procedures.json"), "utf8")),
    );
    const result = codeVisit(fixture.facts, production);
    expect(result.diagnoses.map((item) => item.icd)).not.toContain("M54.5");
    expect(result.diagnoses.some((item) => matchesAny(item.icd, ["M54.50", "M54.2"]))).toBe(true);
  });
});
