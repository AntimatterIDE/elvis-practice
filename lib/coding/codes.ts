import type { AddonRow, MueRow, PtpRow } from "@/lib/coding/ncci-sources";
import { icd10Code, type DiagnosisRow, type ProcedureRow } from "@/lib/coding/sources";

type CodeTable<Row> = { release: string; effectiveFrom: string; rows: Row[] };

type DiagnosisEntry = { code: string; compact: string; billable: boolean; description: string; search: string };

type ProcedureEntry = { code: string; description: string; status: string; globalDays: string; search: string };

export type NcciLibrary = {
  effectiveFrom: string;
  ptp: Map<string, 0 | 1 | 9>;
  mue: Map<string, number>;
  addonPrimaries: Map<string, Set<string>>;
  releases: { ptp: string; mue: string; addon: string };
};

export type CodeLibrary = {
  diagnoses: {
    release: string;
    effectiveFrom: string;
    byCode: Map<string, DiagnosisEntry>;
    billable: DiagnosisEntry[];
  };
  procedures: {
    release: string;
    effectiveFrom: string;
    byCode: Map<string, ProcedureEntry>;
    list: ProcedureEntry[];
  };
  ncci?: NcciLibrary;
};

/** Modifiers that can satisfy an NCCI PTP edit when the indicator is 1. */
const ncciBypassModifiers = new Set([
  "25",
  "27",
  "58",
  "59",
  "78",
  "79",
  "91",
  "XE",
  "XP",
  "XS",
  "XU",
  "LT",
  "RT",
  "50",
  "E1",
  "E2",
  "E3",
  "E4",
  "FA",
  "F1",
  "F2",
  "F3",
  "F4",
  "F5",
  "F6",
  "F7",
  "F8",
  "F9",
  "TA",
  "T1",
  "T2",
  "T3",
  "T4",
  "T5",
  "T6",
  "T7",
  "T8",
  "T9",
  "LC",
  "LD",
  "LM",
  "RI",
  "RC",
]);

export type CodeMatch = { code: string; description: string; note: string };

export type CodeCheck = { ok: true; code: string; description: string } | { ok: false; message: string };

const searchLimit = 20;

function codeTable<Row>(value: unknown, name: string): CodeTable<Row> {
  const record = value as Partial<CodeTable<Row>> | null;
  if (!record || typeof record.release !== "string" || typeof record.effectiveFrom !== "string" || !Array.isArray(record.rows)) {
    throw new Error(`The ${name} code file is not in the expected format.`);
  }
  return record as CodeTable<Row>;
}

export function buildCodeLibrary(icd10: unknown, procedures: unknown, ncci?: unknown): CodeLibrary {
  const icdTable = codeTable<DiagnosisRow>(icd10, "ICD-10-CM");
  const procedureTable = codeTable<ProcedureRow>(procedures, "procedure");
  const diagnosisEntries = icdTable.rows.map(([code, billable, description]) => ({
    code,
    compact: code.replace(".", ""),
    billable: billable === 1,
    description,
    search: description.toLowerCase(),
  }));
  const procedureEntries = procedureTable.rows.map(([code, description, status, globalDays]) => ({
    code,
    description,
    status,
    globalDays,
    search: description.toLowerCase(),
  }));
  return {
    diagnoses: {
      release: icdTable.release,
      effectiveFrom: icdTable.effectiveFrom,
      byCode: new Map(diagnosisEntries.map((entry) => [entry.code, entry])),
      billable: diagnosisEntries.filter((entry) => entry.billable),
    },
    procedures: {
      release: procedureTable.release,
      effectiveFrom: procedureTable.effectiveFrom,
      byCode: new Map(procedureEntries.map((entry) => [entry.code, entry])),
      list: procedureEntries,
    },
    ncci: ncci ? buildNcciLibrary(ncci as { ptp: unknown; mue: unknown; addon: unknown }) : undefined,
  };
}

export function buildNcciLibrary(input: {
  ptp: unknown;
  mue: unknown;
  addon: unknown;
}): NcciLibrary {
  const ptpTable = codeTable<PtpRow>(input.ptp, "NCCI PTP");
  const mueTable = codeTable<MueRow>(input.mue, "NCCI MUE");
  const addonTable = codeTable<AddonRow>(input.addon, "NCCI add-on");
  const effectiveFrom = [ptpTable.effectiveFrom, mueTable.effectiveFrom, addonTable.effectiveFrom].sort().at(-1)!;
  const ptp = new Map<string, 0 | 1 | 9>();
  for (const [column1, column2, modifier] of ptpTable.rows) {
    ptp.set(`${column1}|${column2}`, modifier);
  }
  const mue = new Map<string, number>();
  for (const [code, units] of mueTable.rows) mue.set(code, units);
  const addonPrimaries = new Map<string, Set<string>>();
  for (const [addon, primary] of addonTable.rows) {
    const set = addonPrimaries.get(addon) ?? new Set<string>();
    set.add(primary);
    addonPrimaries.set(addon, set);
  }
  return {
    effectiveFrom,
    ptp,
    mue,
    addonPrimaries,
    releases: { ptp: ptpTable.release, mue: mueTable.release, addon: addonTable.release },
  };
}

function startsWord(text: string, word: string) {
  for (let index = text.indexOf(word); index !== -1; index = text.indexOf(word, index + 1)) {
    if (index === 0 || !/[a-z0-9]/.test(text[index - 1])) return true;
  }
  return false;
}

function textMatches<Entry extends { search: string }>(entries: Entry[], query: string) {
  const words = query.toLowerCase().split(/[^a-z0-9]+/).filter(Boolean);
  if (!words.length) return [];
  const phrase = query.trim().toLowerCase();
  return entries
    .filter((entry) => words.every((word) => startsWord(entry.search, word)))
    .sort(
      (left, right) =>
        Number(!left.search.includes(phrase)) - Number(!right.search.includes(phrase)) || left.search.length - right.search.length,
    );
}

const globalNotes: Record<string, string> = {
  "000": "0-day global",
  "010": "10-day global",
  "090": "90-day global",
  ZZZ: "add-on code",
};

const medicareNotes: Record<string, string> = {
  B: "Medicare bundles it",
  I: "not valid for Medicare",
  N: "not covered by Medicare",
};

function procedureMatch(entry: ProcedureEntry): CodeMatch {
  const note = [globalNotes[entry.globalDays], medicareNotes[entry.status]].filter(Boolean).join(" · ");
  return { code: entry.code, description: entry.description, note };
}

export function searchDiagnoses(library: CodeLibrary, query: string): CodeMatch[] {
  if (query.trim().length < 2) return [];
  const key = query.trim().replaceAll(".", "").toUpperCase();
  const found = /^[A-Z][0-9][0-9A-Z]{0,5}$/.test(key)
    ? library.diagnoses.billable.filter((entry) => entry.compact.startsWith(key))
    : textMatches(library.diagnoses.billable, query);
  return found.slice(0, searchLimit).map((entry) => ({ code: entry.code, description: entry.description, note: "" }));
}

export function searchProcedures(library: CodeLibrary, query: string): CodeMatch[] {
  if (query.trim().length < 2) return [];
  const key = query.trim().toUpperCase();
  const found = /^[0-9][0-9A-Z]{0,4}$/.test(key) || /^[A-Z][0-9]{1,4}$/.test(key)
    ? library.procedures.list.filter((entry) => entry.code.startsWith(key))
    : textMatches(library.procedures.list, query);
  return found.slice(0, searchLimit).map(procedureMatch);
}

function either(codes: string[]) {
  if (codes.length < 2) return codes.join("");
  return `${codes.slice(0, -1).join(", ")}${codes.length > 2 ? "," : ""} or ${codes.at(-1)}`;
}

export function checkDiagnosis(library: CodeLibrary, value: string): CodeCheck {
  const code = icd10Code(value);
  if (!code) return { ok: false, message: "Enter a diagnosis code." };
  const entry = library.diagnoses.byCode.get(code);
  if (entry?.billable) return { ok: true, code, description: entry.description };
  if (entry) {
    const options = library.diagnoses.billable.filter((item) => item.code.startsWith(code)).slice(0, 3);
    const hint = options.length ? `, such as ${either(options.map((item) => item.code))}` : "";
    return { ok: false, message: `${code} is a category, not a billable code. Use a more specific code${hint}.` };
  }
  return { ok: false, message: `${code} is not a code in ${library.diagnoses.release}.` };
}

export function checkProcedure(library: CodeLibrary, value: string): CodeCheck {
  const code = value.trim().toUpperCase();
  if (!code) return { ok: false, message: "Enter a procedure code." };
  const entry = library.procedures.byCode.get(code);
  if (!entry) return { ok: false, message: `${code} is not a code in ${library.procedures.release}.` };
  return { ok: true, code, description: entry.description };
}

export function modifierProblem(value: string) {
  if (/^[0-9A-Z]{2}$/.test(value)) return "";
  return `${value} is not a modifier. A modifier is two letters or digits, such as 25, 59, LT, or RT.`;
}

function lineHasNcciBypass(modifiers: string[]) {
  return modifiers.some((modifier) => ncciBypassModifiers.has(modifier));
}

// Codes are only checked for dates of service the loaded code files cover.
export function claimCodeProblems(
  library: CodeLibrary,
  claim: { dateOfService: string; lines: { cpt: string; modifiers: string[]; diagnoses: string[]; includeOnBill: boolean; units?: number }[] },
) {
  const problems: string[] = [];
  const checkProcedures = claim.dateOfService >= library.procedures.effectiveFrom;
  const checkDiagnoses = claim.dateOfService >= library.diagnoses.effectiveFrom;
  const checkNcci = Boolean(library.ncci) && claim.dateOfService >= (library.ncci?.effectiveFrom ?? "");
  const billed = claim.lines
    .map((line, index) => ({ line, index }))
    .filter(({ line }) => line.includeOnBill && line.cpt);

  for (const { line, index } of billed) {
    const label = `Line ${index + 1}`;
    if (checkProcedures) {
      const procedure = checkProcedure(library, line.cpt);
      if (!procedure.ok) problems.push(`${label}: ${procedure.message}`);
    }
    for (const modifier of line.modifiers) {
      const problem = modifierProblem(modifier);
      if (problem) problems.push(`${label}: ${problem}`);
    }
    if (checkDiagnoses) {
      for (const diagnosis of line.diagnoses) {
        const checked = checkDiagnosis(library, diagnosis);
        if (!checked.ok) problems.push(`${label}: ${checked.message}`);
      }
    }
    if (checkNcci && library.ncci) {
      const code = line.cpt.trim().toUpperCase();
      const mue = library.ncci.mue.get(code);
      const units = line.units;
      if (mue != null && typeof units === "number" && Number.isFinite(units) && units > mue) {
        problems.push(`${label}: ${code} is over the Medicare MUE of ${mue} unit${mue === 1 ? "" : "s"} for one day.`);
      }
      const primaries = library.ncci.addonPrimaries.get(code);
      const procedure = library.procedures.byCode.get(code);
      if (primaries?.size || procedure?.globalDays === "ZZZ") {
        const onClaim = new Set(billed.map((item) => item.line.cpt.trim().toUpperCase()));
        const allowed = primaries ?? null;
        const hasPrimary = allowed
          ? [...allowed].some((primary) => onClaim.has(primary))
          : [...onClaim].some((other) => other !== code);
        if (!hasPrimary) {
          problems.push(
            allowed
              ? `${label}: ${code} is an add-on. Put one of its primary codes on the same claim (for example ${[...allowed].slice(0, 3).join(", ")}).`
              : `${label}: ${code} is an add-on (ZZZ global). Put its primary procedure on the same claim.`,
          );
        }
      }
    }
  }

  if (checkNcci && library.ncci) {
    for (let i = 0; i < billed.length; i += 1) {
      for (let j = 0; j < billed.length; j += 1) {
        if (i === j) continue;
        const left = billed[i];
        const right = billed[j];
        const column1 = left.line.cpt.trim().toUpperCase();
        const column2 = right.line.cpt.trim().toUpperCase();
        const indicator = library.ncci.ptp.get(`${column1}|${column2}`);
        if (indicator == null || indicator === 9) continue;
        const bypass = lineHasNcciBypass(left.line.modifiers) || lineHasNcciBypass(right.line.modifiers);
        if (indicator === 0) {
          problems.push(
            `Lines ${left.index + 1} and ${right.index + 1}: ${column1} and ${column2} are an NCCI pair that cannot be billed together.`,
          );
        } else if (!bypass) {
          problems.push(
            `Lines ${left.index + 1} and ${right.index + 1}: ${column1} and ${column2} are an NCCI pair. Add a modifier such as 59, XE, XP, XS, or XU if both are truly distinct.`,
          );
        }
      }
    }
  }

  return problems;
}
