// Parsers for the CMS code files. scripts/refresh-coding-data.ts runs them with
// node --experimental-strip-types, so this file must not import anything.

export type DiagnosisRow = [code: string, billable: 0 | 1, description: string];

export type ProcedureRow = [code: string, description: string, status: string, globalDays: string];

export type FeeScheduleEntry = { description: string; status: string; globalDays: string };

export function icd10Code(value: string) {
  const code = value.replace(/[\s.]/g, "").toUpperCase();
  return code.length > 3 ? `${code.slice(0, 3)}.${code.slice(3)}` : code;
}

export function parseIcd10Order(text: string): DiagnosisRow[] {
  const rows: DiagnosisRow[] = [];
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue;
    const code = line.slice(6, 13).trim();
    const flag = line.charAt(14);
    const description = line.slice(77).trim();
    if (!/^[A-Z][0-9A-Z]{2,6}$/.test(code) || (flag !== "0" && flag !== "1") || !description) {
      throw new Error(`Unexpected line in the ICD-10-CM order file: ${line.slice(0, 40)}`);
    }
    rows.push([icd10Code(code), flag === "1" ? 1 : 0, description]);
  }
  return rows;
}

export function parseCsv(text: string) {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = "";
  let quoted = false;
  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    if (quoted) {
      if (char !== '"') field += char;
      else if (text[index + 1] === '"') {
        field += '"';
        index += 1;
      } else quoted = false;
    } else if (char === '"') quoted = true;
    else if (char === ",") {
      row.push(field);
      field = "";
    } else if (char === "\n" || char === "\r") {
      if (char === "\r" && text[index + 1] === "\n") index += 1;
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
    } else field += char;
  }
  if (field || row.length) {
    row.push(field);
    rows.push(row);
  }
  return rows;
}

// The PPRRVU file splits column names over several header rows. Status is
// column 3 and global days column 14; check both so a layout change fails loudly.
export function parseFeeSchedule(text: string) {
  const rows = parseCsv(text);
  const header = rows.findIndex((row) => row[0] === "HCPCS" && row[1] === "MOD");
  const above = rows[header - 1];
  if (header < 1 || rows[header][2] !== "DESCRIPTION" || above?.[3] !== "STATUS" || above?.[14] !== "GLOB") {
    throw new Error("The fee schedule file does not have the expected HCPCS, MOD, DESCRIPTION, STATUS, and GLOB DAYS columns.");
  }
  const entries = new Map<string, FeeScheduleEntry>();
  for (const row of rows.slice(header + 1)) {
    const code = row[0]?.trim() ?? "";
    if (!code || row[1]?.trim()) continue;
    if (!/^[0-9A-Z]{5}$/.test(code)) throw new Error(`Unexpected code in the fee schedule file: ${code}`);
    entries.set(code, { description: row[2].trim(), status: row[3].trim(), globalDays: row[14].trim() });
  }
  return entries;
}

// Fixed-width HCPCS Level II file: code 1-5, record type 11, long description
// 12-91 (continued on type 4 lines), termination date 285-292.
export function parseHcpcs(text: string, effectiveFrom: string) {
  const cutoff = effectiveFrom.replaceAll("-", "");
  const current = new Map<string, string>();
  const terminated = new Set<string>();
  for (const line of text.split(/\r?\n/)) {
    if (line.length < 12) continue;
    const code = line.slice(0, 5).trim();
    const kind = line.charAt(10);
    const words = line.slice(11, 91).trim();
    if (kind === "3") {
      if (!/^[A-Z][0-9]{4}$/.test(code)) throw new Error(`Unexpected code in the HCPCS file: ${code}`);
      const ends = line.slice(284, 292).trim();
      if (ends && ends < cutoff) terminated.add(code);
      else current.set(code, words);
    } else if (kind === "4" && current.has(code)) {
      current.set(code, `${current.get(code)} ${words}`);
    }
  }
  return { current, terminated };
}

// CPT (codes starting with a digit) belongs to the AMA and dental D codes to
// the ADA. Without a license only their numbers are kept.
export function procedureRows(feeSchedule: Map<string, FeeScheduleEntry>, hcpcs: ReturnType<typeof parseHcpcs>): ProcedureRow[] {
  const codes = new Set([...feeSchedule.keys(), ...hcpcs.current.keys()]);
  return [...codes]
    .filter((code) => !hcpcs.terminated.has(code))
    .sort()
    .map((code) => {
      const fee = feeSchedule.get(code);
      const licensed = /^[0-9D]/.test(code);
      const description = licensed ? "" : (hcpcs.current.get(code) ?? fee?.description ?? "");
      return [code, description, fee?.status ?? "", fee?.globalDays ?? ""];
    });
}
