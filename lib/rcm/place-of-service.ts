// Common CMS place-of-service codes for this spine practice.
export const placeOfServiceOptions = [
  { code: "11", label: "11 — Office" },
  { code: "22", label: "22 — On Campus-Outpatient Hospital" },
  { code: "19", label: "19 — Off Campus-Outpatient Hospital" },
  { code: "21", label: "21 — Inpatient Hospital" },
  { code: "24", label: "24 — Ambulatory Surgical Center" },
  { code: "23", label: "23 — Emergency Room — Hospital" },
] as const;

export function isKnownPlaceOfService(value: string) {
  return placeOfServiceOptions.some((option) => option.code === value.trim());
}

/** Major spine OR codes that rarely belong in the office (POS 11). */
export function looksLikeFacilitySurgery(cpt: string) {
  const code = cpt.trim().toUpperCase();
  if (!/^\d{5}$/.test(code)) return false;
  // Arthrodesis / instrumentation / decompression / stimulator — not office injections.
  return /^(22[0-9]|228|630|631|632|633|636)/.test(code);
}

export function officeSurgeryPosWarning(placeOfService: string, cpts: string[]) {
  if (placeOfService.trim() !== "11") return "";
  const surgical = cpts.map((cpt) => cpt.trim().toUpperCase()).filter(looksLikeFacilitySurgery);
  if (!surgical.length) return "";
  return `Place of service is Office (11), but ${surgical.join(", ")} usually needs outpatient hospital (22/19), inpatient (21), or ASC (24).`;
}
