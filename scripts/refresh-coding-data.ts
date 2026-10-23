import { createHash } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { parseFeeSchedule, parseHcpcs, parseIcd10Order, procedureRows } from "../lib/coding/sources.ts";

const { values } = parseArgs({
  options: {
    icd: { type: "string" },
    "icd-release": { type: "string" },
    "icd-from": { type: "string" },
    pfs: { type: "string" },
    hcpcs: { type: "string" },
    "procedures-release": { type: "string" },
    "procedures-from": { type: "string" },
  },
});

const required = ["icd", "icd-release", "icd-from", "pfs", "hcpcs", "procedures-release", "procedures-from"] as const;
const missing = required.filter((name) => !values[name]);
if (missing.length) {
  console.error(`Missing ${missing.map((name) => `--${name}`).join(", ")}. See docs/spine-coding/plan.md, section 4.1.`);
  process.exit(1);
}
for (const name of ["icd-from", "procedures-from"] as const) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(values[name] ?? "")) {
    console.error(`--${name} must be a date such as 2026-10-01.`);
    process.exit(1);
  }
}

function source(file: string) {
  const bytes = readFileSync(file);
  return { bytes, entry: { file: path.basename(file), sha256: createHash("sha256").update(bytes).digest("hex") } };
}

function writeTable(
  name: string,
  meta: { release: string; effectiveFrom: string; sources: { file: string; sha256: string }[]; columns: string[] },
  rows: unknown[],
) {
  const head = Object.entries(meta).map(([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`);
  const body = rows.map((row) => JSON.stringify(row)).join(",\n");
  const file = path.join(process.cwd(), "data/coding", name);
  writeFileSync(file, `{\n${head.join(",\n")},\n"rows": [\n${body}\n]\n}\n`);
  console.log(`wrote ${path.relative(process.cwd(), file)}: ${rows.length} rows`);
}

const icd = source(values.icd!);
const diagnoses = parseIcd10Order(icd.bytes.toString("latin1"));
writeTable(
  "icd10cm.json",
  {
    release: values["icd-release"]!,
    effectiveFrom: values["icd-from"]!,
    sources: [icd.entry],
    columns: ["code", "billable", "description"],
  },
  diagnoses,
);

const pfs = source(values.pfs!);
const hcpcs = source(values.hcpcs!);
const procedures = procedureRows(
  parseFeeSchedule(pfs.bytes.toString("latin1")),
  parseHcpcs(hcpcs.bytes.toString("latin1"), values["procedures-from"]!),
);
writeTable(
  "procedures.json",
  {
    release: values["procedures-release"]!,
    effectiveFrom: values["procedures-from"]!,
    sources: [pfs.entry, hcpcs.entry],
    columns: ["code", "description", "status", "globalDays"],
  },
  procedures,
);
