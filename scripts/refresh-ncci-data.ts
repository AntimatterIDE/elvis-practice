import { createHash } from "node:crypto";
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { parseArgs } from "node:util";
import { parseAddonText, parseMueCsv, parsePtpText } from "../lib/coding/ncci-sources.ts";

const { values } = parseArgs({
  options: {
    ptp: { type: "string", multiple: true },
    "ptp-dir": { type: "string" },
    mue: { type: "string" },
    addon: { type: "string" },
    from: { type: "string", default: "2026-10-01" },
    "ptp-release": { type: "string", default: "Medicare NCCI Practitioner PTP v323r0 (spine subset)" },
    "mue-release": { type: "string", default: "Medicare NCCI Practitioner MUE effective 2026-10-01" },
    "addon-release": { type: "string", default: "Medicare NCCI Add-on Code edits V2026Q4" },
  },
});

if (!values.mue || !values.addon) {
  console.error("Need --mue <csv> --addon <txt> and either --ptp-dir <dir> or repeated --ptp <txt>.");
  process.exit(1);
}
if (!/^\d{4}-\d{2}-\d{2}$/.test(values.from!)) {
  console.error("--from must be a date such as 2026-10-01.");
  process.exit(1);
}

const procedures = JSON.parse(readFileSync(path.join(process.cwd(), "data/coding/procedures.json"), "utf8")) as {
  rows: [string, ...unknown[]][];
};
const allow = new Set(procedures.rows.map((row) => row[0]));
const allowCode = (code: string) => allow.has(code);

function source(file: string) {
  const bytes = readFileSync(file);
  return { text: bytes.toString("utf8"), entry: { file: path.basename(file), sha256: createHash("sha256").update(bytes).digest("hex") } };
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

const ptpFiles: string[] = [];
if (values["ptp-dir"]) {
  for (const name of readdirSync(values["ptp-dir"])) {
    if (/\.(txt|TXT)$/.test(name) && /ccipra/i.test(name)) ptpFiles.push(path.join(values["ptp-dir"]!, name));
  }
  ptpFiles.sort();
}
if (values.ptp?.length) ptpFiles.push(...values.ptp);
if (!ptpFiles.length) {
  console.error("No PTP text files found.");
  process.exit(1);
}

const ptpSources = ptpFiles.map(source);
const ptpRows = parsePtpText(ptpSources.map((item) => item.text).join("\n"), allowCode);
writeTable(
  "ncci-ptp.json",
  {
    release: values["ptp-release"]!,
    effectiveFrom: values.from!,
    sources: ptpSources.map((item) => item.entry),
    columns: ["column1", "column2", "modifier"],
  },
  ptpRows,
);

const mue = source(values.mue);
writeTable(
  "mue.json",
  {
    release: values["mue-release"]!,
    effectiveFrom: values.from!,
    sources: [mue.entry],
    columns: ["code", "units"],
  },
  parseMueCsv(mue.text, allowCode),
);

const addon = source(values.addon);
writeTable(
  "addon-primaries.json",
  {
    release: values["addon-release"]!,
    effectiveFrom: values.from!,
    sources: [addon.entry],
    columns: ["addon", "primary", "type"],
  },
  parseAddonText(addon.text, allowCode),
);
