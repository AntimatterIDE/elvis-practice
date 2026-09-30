const clinicalPattern =
  /\b(pain|numb(?:ness)?|tingl(?:ing|e)|weakness|mri|ct scan|x-ray|herniat|sciatica|surgery|diagnos(?:is|ed)|symptom|medication|insurance|member id|policy number|social security|ssn|dob|date of birth)\b/i;

export function noteLooksClinical(note: string) {
  return clinicalPattern.test(note);
}
