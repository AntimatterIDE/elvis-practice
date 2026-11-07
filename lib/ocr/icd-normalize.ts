/**
 * Prefer ICD-10 on onboard drafts. Map a few common ICD-9 spine/chiro leftovers;
 * clear unmapped ICD-9 rather than inventing codes.
 */

const ICD10_RE = /^[A-TV-Z][0-9][A-Z0-9](?:\.?[A-Z0-9]{0,4})?$/i;
const ICD9_RE = /^\d{3}(?:\.\d{1,2})?$/;

/** Common chiro / MVA / strain leftovers seen in public fixtures. */
const ICD9_TO_ICD10: Record<string, string> = {
  "847.0": "S13.4XXA",
  "847.1": "S23.3XXA",
  "847.2": "S39.012A",
  "847.3": "S33.5XXA",
  "847.9": "S13.4XXA",
  "739.1": "M99.01",
  "739.2": "M99.02",
  "739.3": "M99.03",
  "739.4": "M99.04",
  "724.2": "M54.5",
  "724.3": "M54.16",
  "723.1": "M54.2",
  "723.4": "M54.12",
};

export function isIcd10(code: string): boolean {
  return ICD10_RE.test(code.trim());
}

export function isIcd9(code: string): boolean {
  return ICD9_RE.test(code.trim());
}

export type NormalizedIcd = {
  icd: string;
  clearedLegacy: boolean;
};

export function normalizeIcdCode(raw: string): NormalizedIcd {
  const code = raw.trim();
  if (!code) return { icd: "", clearedLegacy: false };
  if (isIcd10(code)) return { icd: code.toUpperCase(), clearedLegacy: false };
  if (isIcd9(code)) {
    const mapped = ICD9_TO_ICD10[code];
    if (mapped) return { icd: mapped, clearedLegacy: false };
    return { icd: "", clearedLegacy: true };
  }
  // Unknown shape — keep as-is only if it looks like a billable fragment staff can edit.
  if (/^[A-Za-z0-9.]+$/.test(code) && code.length <= 8) {
    return { icd: code.toUpperCase(), clearedLegacy: false };
  }
  return { icd: "", clearedLegacy: false };
}
