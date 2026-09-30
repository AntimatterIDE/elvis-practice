export type CsvRow = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  payerName: string;
  memberId: string;
  dateOfService: string;
  cpt: string;
  description: string;
  charge: number;
  icd: string;
};

const HEADERS = ["first", "last", "dob", "payer", "member", "dos", "cpt", "description", "charge", "icd"] as const;

export type CsvParseResult = { ok: true; rows: CsvRow[] } | { ok: false; error: string };

function splitCsvLine(line: string) {
  const cells: string[] = [];
  let current = "";
  let quoted = false;
  for (const char of line) {
    if (char === '"') {
      quoted = !quoted;
      continue;
    }
    if (char === "," && !quoted) {
      cells.push(current.trim());
      current = "";
      continue;
    }
    current += char;
  }
  cells.push(current.trim());
  return cells;
}

export function parsePracticeCsv(text: string): CsvParseResult {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (lines.length < 2) {
    return { ok: false, error: "Add a header row and at least one patient row." };
  }

  const header = splitCsvLine(lines[0]).map((cell) => cell.toLowerCase());
  const missing = HEADERS.filter((name) => !header.includes(name));
  if (missing.length > 0) {
    return { ok: false, error: `Missing columns: ${missing.join(", ")}.` };
  }

  const index = new Map(header.map((name, position) => [name, position]));
  const rows: CsvRow[] = [];

  for (const line of lines.slice(1)) {
    const cells = splitCsvLine(line);
    const read = (name: (typeof HEADERS)[number]) => cells[index.get(name) ?? -1] ?? "";
    const charge = Number(read("charge"));
    if (!read("first") || !read("last")) {
      return { ok: false, error: "Each row needs a first and last name." };
    }
    if (!Number.isFinite(charge)) {
      return { ok: false, error: `Charge is not a number for ${read("first")} ${read("last")}.` };
    }
    rows.push({
      firstName: read("first"),
      lastName: read("last"),
      dateOfBirth: read("dob"),
      payerName: read("payer") || "Unknown payer",
      memberId: read("member"),
      dateOfService: read("dos"),
      cpt: read("cpt") || "99213",
      description: read("description") || "Imported service",
      charge,
      icd: read("icd"),
    });
  }

  return { ok: true, rows };
}
