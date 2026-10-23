import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { buildCodeLibrary, type CodeLibrary } from "@/lib/coding/codes";

let cached: CodeLibrary | null = null;

function readJson(name: string): unknown {
  return JSON.parse(readFileSync(path.join(process.cwd(), "data/coding", name), "utf8"));
}

export function codeLibrary() {
  cached ??= buildCodeLibrary(readJson("icd10cm.json"), readJson("procedures.json"), {
    ptp: readJson("ncci-ptp.json"),
    mue: readJson("mue.json"),
    addon: readJson("addon-primaries.json"),
  });
  return cached;
}
