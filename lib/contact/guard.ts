const identifierPattern =
  /\b(member id|policy number|social security|ssn|dob|date of birth)\b/i;

export function noteLooksClinical(note: string) {
  return identifierPattern.test(note);
}
