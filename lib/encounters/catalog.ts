import "server-only";
import { readFileSync } from "node:fs";
import path from "node:path";
import { suggestCodes, type CatalogCode } from "@/lib/encounters/codes";
import type { VisitCode } from "@/lib/encounters/types";

type Catalogs = { icd10: CatalogCode[]; cpt: CatalogCode[] };

let cached: Catalogs | null = null;

function readCatalog(filePath: string): CatalogCode[] {
  const parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
  if (!Array.isArray(parsed)) return [];
  const codes: CatalogCode[] = [];
  for (const item of parsed) {
    if (!item || typeof item !== "object") continue;
    const record = item as { code?: unknown; description?: unknown };
    if (typeof record.code !== "string" || typeof record.description !== "string") continue;
    codes.push({ code: record.code, description: record.description });
  }
  return codes;
}

export function loadCatalogs(): Catalogs {
  if (cached) return cached;
  const root = path.join(process.cwd(), "data/coding");
  cached = {
    icd10: readCatalog(path.join(root, "icd10-cm/flattened-codes.json")),
    cpt: readCatalog(path.join(root, "cpt1-hcpcs/codes.json")),
  };
  return cached;
}

export function codeClinicalNote(note: string): { icd10: VisitCode[]; billingCodes: VisitCode[] } {
  const catalogs = loadCatalogs();
  return {
    icd10: suggestCodes(note, catalogs.icd10),
    billingCodes: suggestCodes(note, catalogs.cpt),
  };
}
