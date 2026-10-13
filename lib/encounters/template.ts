export const defaultNoteTemplate = `SUBJECTIVE:
[Patient's history, complaints, and subjective information]

OBJECTIVE:
[Physical examination findings and objective data]

ASSESSMENT:
[Diagnosis and clinical impressions]

PLAN:
[Treatment plan and recommendations]`;

export function noteInstructions(template = defaultNoteTemplate) {
  return `You are a medical scribe. First identify the medical practice or specialty from the transcript, then write a professional medical note in English in the SOAP format.

Practice/Specialty on the first line

Then structure the note with clear section breaks:

${template}`;
}

export function parseClinicalNote(analysis: string) {
  if (!analysis.trim()) throw new Error("The note came back empty.");
  const lines = analysis.split("\n");
  const medicalPractice = lines[0]?.trim() || "General Practice";
  const noteClinical = lines.length > 1 ? lines.slice(1).join("\n") : analysis;
  return { medicalPractice, noteClinical };
}
