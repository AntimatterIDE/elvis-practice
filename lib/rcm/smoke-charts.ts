/** Known QA / smoke chart full names. Keep in sync with Tools purge UI. */
export const SMOKE_CHART_NAME =
  /^(ClaimPipe Multi|BulkSmoke Alpha|LetterSmoke Alpha|LetterSmoke Beta|LetterSmoke Gamma|OCR ExtractTest|Alicia Mendel)$/i;

export function isSmokeChartName(firstName: string, lastName: string) {
  return SMOKE_CHART_NAME.test(`${firstName} ${lastName}`.trim());
}

export function isSmokePatient(patient: { firstName?: string; lastName?: string }) {
  return isSmokeChartName(patient.firstName ?? "", patient.lastName ?? "");
}
