import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { buildCodeLibrary, claimCodeProblems } from "@/lib/coding/codes";

const library = buildCodeLibrary(
  JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/icd10cm.json"), "utf8")),
  JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/procedures.json"), "utf8")),
  {
    ptp: JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/ncci-ptp.json"), "utf8")),
    mue: JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/mue.json"), "utf8")),
    addon: JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/addon-primaries.json"), "utf8")),
  },
);

const dos = "2026-10-22";

describe("claim validator known-bad set", () => {
  it("rejects a retired / non-billable ICD category (M54.5)", () => {
    const problems = claimCodeProblems(library, {
      dateOfService: dos,
      lines: [{ cpt: "99213", modifiers: [], diagnoses: ["M54.5"], includeOnBill: true, units: 1 }],
    });
    expect(problems.some((problem) => problem.includes("M54.5"))).toBe(true);
  });

  it("rejects an unknown procedure code", () => {
    const problems = claimCodeProblems(library, {
      dateOfService: dos,
      lines: [{ cpt: "99999", modifiers: [], diagnoses: ["M54.50"], includeOnBill: true, units: 1 }],
    });
    expect(problems.some((problem) => problem.includes("99999"))).toBe(true);
  });

  it("rejects an add-on without its primary", () => {
    const problems = claimCodeProblems(library, {
      dateOfService: dos,
      lines: [{ cpt: "63048", modifiers: [], diagnoses: ["M48.062"], includeOnBill: true, units: 1 }],
    });
    expect(problems.some((problem) => /add-on/i.test(problem))).toBe(true);
  });

  it("rejects units over the MUE", () => {
    const mue = library.ncci?.mue.get("99213");
    if (mue == null) return;
    const problems = claimCodeProblems(library, {
      dateOfService: dos,
      lines: [{ cpt: "99213", modifiers: [], diagnoses: ["M54.50"], includeOnBill: true, units: mue + 5 }],
    });
    expect(problems.some((problem) => /MUE/i.test(problem))).toBe(true);
  });

  it("rejects an NCCI pair that cannot be billed together (indicator 0) when present", () => {
    // Pick a known spine PTP pair from the loaded subset if available.
    const sample = [...(library.ncci?.ptp.entries() ?? [])].find(([, indicator]) => indicator === 0);
    if (!sample) return;
    const [key] = sample;
    const [column1, column2] = key.split("|");
    const problems = claimCodeProblems(library, {
      dateOfService: dos,
      lines: [
        { cpt: column1, modifiers: [], diagnoses: ["M48.062"], includeOnBill: true, units: 1 },
        { cpt: column2, modifiers: [], diagnoses: ["M48.062"], includeOnBill: true, units: 1 },
      ],
    });
    expect(problems.some((problem) => /NCCI pair that cannot be billed together/i.test(problem))).toBe(true);
  });

  it("rejects an NCCI pair that needs a modifier when none is present", () => {
    const sample = [...(library.ncci?.ptp.entries() ?? [])].find(([, indicator]) => indicator === 1);
    if (!sample) return;
    const [key] = sample;
    const [column1, column2] = key.split("|");
    const problems = claimCodeProblems(library, {
      dateOfService: dos,
      lines: [
        { cpt: column1, modifiers: [], diagnoses: ["M48.062"], includeOnBill: true, units: 1 },
        { cpt: column2, modifiers: [], diagnoses: ["M48.062"], includeOnBill: true, units: 1 },
      ],
    });
    expect(problems.some((problem) => /NCCI pair/i.test(problem) && /modifier/i.test(problem))).toBe(true);
  });

  it("accepts a clean office claim", () => {
    const problems = claimCodeProblems(library, {
      dateOfService: dos,
      lines: [
        {
          cpt: "99214",
          modifiers: [],
          diagnoses: ["M48.062"],
          includeOnBill: true,
          units: 1,
        },
      ],
    });
    expect(problems).toEqual([]);
  });
});
