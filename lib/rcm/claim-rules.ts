// Claim filing indicator codes accepted by Stedi (837P loop 2000B SBR09).
export const filingCodes = [
  { code: "CI", label: "Commercial insurance" },
  { code: "BL", label: "Blue Cross Blue Shield" },
  { code: "FI", label: "Federal Employee Program" },
  { code: "12", label: "PPO" },
  { code: "HM", label: "HMO" },
  { code: "13", label: "Point of service (POS)" },
  { code: "14", label: "EPO" },
  { code: "MB", label: "Medicare Part B" },
  { code: "16", label: "Medicare Advantage HMO (Medicare risk)" },
  { code: "MC", label: "Medicaid" },
  { code: "WC", label: "Workers' compensation" },
  { code: "AM", label: "Auto medical" },
  { code: "LM", label: "Liability medical" },
  { code: "CH", label: "TRICARE (CHAMPUS)" },
  { code: "VA", label: "Veterans Affairs plan" },
  { code: "OF", label: "Other federal program" },
] as const;

export type FilingCode = (typeof filingCodes)[number]["code"];

export const diagnosisLimit = 12;

export const pointerLimit = 4;

export const serviceLineLimit = 50;

export function isFilingCode(value: unknown): value is FilingCode {
  return filingCodes.some((option) => option.code === value);
}

export function diagnosisKey(value: string) {
  return value.replace(/[\s.]/g, "").toUpperCase();
}

export function claimLineProblems(lines: { cpt: string; units: number; diagnoses: string[]; includeOnBill: boolean }[]) {
  const problems: string[] = [];
  const claimDiagnoses = new Set<string>();
  if (lines.filter((line) => line.includeOnBill && line.cpt).length > serviceLineLimit) {
    problems.push(`A claim can carry at most ${serviceLineLimit} lines. Split the lines over two claims.`);
  }
  lines.forEach((line, index) => {
    if (!line.includeOnBill || !line.cpt) return;
    const label = `Line ${index + 1}`;
    const diagnoses = new Set(line.diagnoses.map(diagnosisKey).filter(Boolean));
    if (!(line.units > 0)) problems.push(`${label}: units must be more than 0.`);
    if (!diagnoses.size) problems.push(`${label}: link at least one diagnosis.`);
    if (diagnoses.size > pointerLimit) problems.push(`${label}: a line can point to at most ${pointerLimit} diagnoses.`);
    for (const code of diagnoses) claimDiagnoses.add(code);
  });
  if (claimDiagnoses.size > diagnosisLimit) {
    problems.push(`A claim can carry at most ${diagnosisLimit} diagnoses and this one has ${claimDiagnoses.size}. Split the lines over two claims.`);
  }
  return problems;
}
