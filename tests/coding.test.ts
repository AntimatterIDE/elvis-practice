import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  buildCodeLibrary,
  checkDiagnosis,
  claimCodeProblems,
  searchDiagnoses,
  searchProcedures,
} from "@/lib/coding/codes";
import { icd10Code, parseCsv, parseFeeSchedule, parseHcpcs, parseIcd10Order, procedureRows } from "@/lib/coding/sources";

function orderLine(order: number, code: string, billable: 0 | 1, description: string) {
  return `${String(order).padStart(5, "0")} ${code.padEnd(7)} ${billable} ${description.slice(0, 60).padEnd(60)} ${description}`;
}

function csvLine(cells: string[]) {
  return cells.map((cell) => (/[",]/.test(cell) ? `"${cell.replaceAll('"', '""')}"` : cell)).join(",");
}

function feeRow(code: string, modifier: string, description: string, status: string, globalDays: string) {
  const cells = Array<string>(22).fill("");
  cells[0] = code;
  cells[1] = modifier;
  cells[2] = description;
  cells[3] = status;
  cells[14] = globalDays;
  return csvLine(cells);
}

function feeSchedule(rows: string[]) {
  const above = Array<string>(22).fill("");
  above[3] = "STATUS";
  above[14] = "GLOB";
  const header = Array<string>(22).fill("");
  header[0] = "HCPCS";
  header[1] = "MOD";
  header[2] = "DESCRIPTION";
  header[3] = "CODE";
  header[14] = "DAYS";
  return [csvLine(["NATIONAL PHYSICIAN FEE SCHEDULE RELATIVE VALUE FILE"]), csvLine(above), csvLine(header), ...rows].join("\r\n");
}

function hcpcsLine(code: string, kind: string, description: string, ends = "") {
  return `${code.padEnd(5)}00100${kind}${description.padEnd(80)}${"".padEnd(28)}`.padEnd(284) + ends.padEnd(8);
}

const library = buildCodeLibrary(
  {
    release: "ICD-10-CM test",
    effectiveFrom: "2026-10-01",
    rows: [
      ["M48.06", 0, "Spinal stenosis, lumbar region"],
      ["M48.061", 1, "Spinal stenosis, lumbar region without neurogenic claudication"],
      ["M48.062", 1, "Spinal stenosis, lumbar region with neurogenic claudication"],
      ["M54.5", 0, "Low back pain"],
      ["M54.50", 1, "Low back pain, unspecified"],
    ],
  },
  {
    release: "procedures test",
    effectiveFrom: "2026-10-01",
    rows: [
      ["63047", "", "A", "090"],
      ["63048", "", "A", "ZZZ"],
      ["99242", "", "I", "XXX"],
      ["J1010", "Injection, methylprednisolone acetate, 1 mg", "E", "XXX"],
    ],
  },
);

describe("CMS code files", () => {
  it("reads the ICD-10-CM order file and marks the billable codes", () => {
    const text = [orderLine(1, "M545", 0, "Low back pain"), orderLine(2, "M5450", 1, "Low back pain, unspecified"), orderLine(3, "A00", 0, "Cholera")].join("\r\n");
    expect(parseIcd10Order(`${text}\r\n`)).toEqual([
      ["M54.5", 0, "Low back pain"],
      ["M54.50", 1, "Low back pain, unspecified"],
      ["A00", 0, "Cholera"],
    ]);
    expect(() => parseIcd10Order("not an order file")).toThrow("Unexpected line");
    expect(icd10Code(" m48062 ")).toBe("M48.062");
  });

  it("reads quoted commas and quotes in the fee schedule CSV", () => {
    expect(parseCsv('a,"b, c","d ""e"""\r\n1,2,3\n')).toEqual([
      ["a", "b, c", 'd "e"'],
      ["1", "2", "3"],
    ]);
  });

  it("keeps the base fee schedule row for each code and fails on a changed layout", () => {
    const entries = parseFeeSchedule(
      feeSchedule([
        feeRow("63047", "", "Fee schedule text", "A", "090"),
        feeRow("63047", "26", "Fee schedule text", "A", "090"),
        feeRow("J1010", "", "Methylprednisolone, 1 mg", "E", "XXX"),
      ]),
    );
    expect([...entries]).toEqual([
      ["63047", { description: "Fee schedule text", status: "A", globalDays: "090" }],
      ["J1010", { description: "Methylprednisolone, 1 mg", status: "E", globalDays: "XXX" }],
    ]);
    expect(() => parseFeeSchedule("HCPCS,MOD,DESCRIPTION\r\n63047,,x")).toThrow("expected");
  });

  it("joins HCPCS continuation lines and separates ended codes", () => {
    const text = [
      hcpcsLine("J1010", "3", "Injection, methylprednisolone acetate, 1"),
      `${hcpcsLine("J1010", "4", "mg").trimEnd()}`,
      hcpcsLine("J1030", "3", "Injection, methylprednisolone acetate, 40 mg", "20240331"),
      hcpcsLine("L0637", "3", "Lumbar-sacral orthosis", "20270101"),
      hcpcsLine("LT", "7", "Left side"),
    ].join("\r\n");
    const hcpcs = parseHcpcs(text, "2026-10-01");
    expect([...hcpcs.current]).toEqual([
      ["J1010", "Injection, methylprednisolone acetate, 1 mg"],
      ["L0637", "Lumbar-sacral orthosis"],
    ]);
    expect([...hcpcs.terminated]).toEqual(["J1030"]);
  });

  it("drops ended codes and keeps only the numbers of CPT and dental codes", () => {
    const fees = parseFeeSchedule(
      feeSchedule([
        feeRow("63047", "", "Fee schedule text", "A", "090"),
        feeRow("D0120", "", "Fee schedule text", "R", "XXX"),
        feeRow("J1010", "", "Methylprednisolone, 1 mg", "E", "XXX"),
        feeRow("J1030", "", "Methylprednisolone, 40 mg", "E", "XXX"),
      ]),
    );
    const hcpcs = parseHcpcs(
      [
        hcpcsLine("J1010", "3", "Injection, methylprednisolone acetate, 1 mg"),
        hcpcsLine("J1030", "3", "Injection, methylprednisolone acetate, 40 mg", "20240331"),
        hcpcsLine("L0637", "3", "Lumbar-sacral orthosis"),
      ].join("\n"),
      "2026-10-01",
    );
    expect(procedureRows(fees, hcpcs)).toEqual([
      ["63047", "", "A", "090"],
      ["D0120", "", "R", "XXX"],
      ["J1010", "Injection, methylprednisolone acetate, 1 mg", "E", "XXX"],
      ["L0637", "Lumbar-sacral orthosis", "", ""],
    ]);
  });
});

describe("code search", () => {
  it("finds billable diagnoses by code prefix or by the start of words", () => {
    expect(searchDiagnoses(library, "m48.06").map((match) => match.code)).toEqual(["M48.061", "M48.062"]);
    expect(searchDiagnoses(library, "M4806").map((match) => match.code)).toEqual(["M48.061", "M48.062"]);
    expect(searchDiagnoses(library, "stenosis claudication").map((match) => match.code)).toEqual(["M48.062", "M48.061"]);
    expect(searchDiagnoses(library, "low back")[0]).toEqual({ code: "M54.50", description: "Low back pain, unspecified", note: "" });
    expect(searchDiagnoses(library, "nosis")).toEqual([]);
    expect(searchDiagnoses(library, "M")).toEqual([]);
  });

  it("finds procedures by code and flags add-on, global, and Medicare status", () => {
    expect(searchProcedures(library, "6304")).toEqual([
      { code: "63047", description: "", note: "90-day global" },
      { code: "63048", description: "", note: "add-on code" },
    ]);
    expect(searchProcedures(library, "99242")).toEqual([{ code: "99242", description: "", note: "not valid for Medicare" }]);
    expect(searchProcedures(library, "j10").map((match) => match.code)).toEqual(["J1010"]);
    expect(searchProcedures(library, "methylprednisolone").map((match) => match.code)).toEqual(["J1010"]);
  });

  it("explains a code that is not in the release", () => {
    expect(checkDiagnosis(library, "M51.17")).toEqual({ ok: false, message: "M51.17 is not a code in ICD-10-CM test." });
    expect(checkDiagnosis(library, "m54.50")).toEqual({ ok: true, code: "M54.50", description: "Low back pain, unspecified" });
  });
});

describe("claim code check", () => {
  const line = { cpt: "63047", modifiers: [] as string[], diagnoses: ["M48.062"], includeOnBill: true };

  it("lists every bad code on the lines that will be billed", () => {
    const problems = claimCodeProblems(library, {
      dateOfService: "2026-10-01",
      lines: [
        { ...line, cpt: "J1030", modifiers: ["5"], diagnoses: ["M54.5"] },
        { ...line, cpt: "J9999", includeOnBill: false },
        line,
      ],
    });
    expect(problems).toEqual([
      "Line 1: J1030 is not a code in procedures test.",
      "Line 1: 5 is not a modifier. A modifier is two letters or digits, such as 25, 59, LT, or RT.",
      "Line 1: M54.5 is a category, not a billable code. Use a more specific code, such as M54.50.",
    ]);
  });

  it("does not judge a visit from before the loaded release by its codes", () => {
    const problems = claimCodeProblems(library, {
      dateOfService: "2026-09-30",
      lines: [{ ...line, cpt: "J1030", modifiers: ["LT", "5"], diagnoses: ["M54.5"] }],
    });
    expect(problems).toEqual(["Line 1: 5 is not a modifier. A modifier is two letters or digits, such as 25, 59, LT, or RT."]);
  });
});

describe("loaded code files", () => {
  function table(name: string) {
    return JSON.parse(readFileSync(path.join(process.cwd(), "data/coding", name), "utf8")) as {
      release: string;
      effectiveFrom: string;
      sources: { file: string; sha256: string }[];
      rows: [string, ...unknown[]][];
    };
  }

  const icd10 = table("icd10cm.json");
  const procedures = table("procedures.json");

  it("records the release, the date it starts, and the source file hashes", () => {
    expect(icd10).toMatchObject({ release: "ICD-10-CM FY2027", effectiveFrom: "2026-10-01" });
    expect(procedures.effectiveFrom).toBe("2026-10-01");
    for (const source of [...icd10.sources, ...procedures.sources]) expect(source.sha256).toMatch(/^[0-9a-f]{64}$/);
  });

  it("carries no CPT or dental descriptions", () => {
    const described = procedures.rows.filter(([code, description]) => /^[0-9D]/.test(code) && description !== "");
    expect(described).toEqual([]);
  });

  it("knows the spine codes and leaves out ended ones", () => {
    const real = buildCodeLibrary(icd10, procedures);
    expect(checkDiagnosis(real, "M48.062").ok).toBe(true);
    expect(checkDiagnosis(real, "M54.5")).toMatchObject({ ok: false });
    expect(real.procedures.byCode.get("63047")).toMatchObject({ status: "A", globalDays: "090" });
    expect(real.procedures.byCode.get("22853")).toMatchObject({ globalDays: "ZZZ" });
    expect(real.procedures.byCode.has("J1010")).toBe(true);
    expect(real.procedures.byCode.has("J1030")).toBe(false);
  });
});
