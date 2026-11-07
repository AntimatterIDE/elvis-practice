# elvis-practice — agent log

## [2026-11-07] ingest | Clinical letter from Visit Desk

One Clinical Letter for every visit. After note is in review, Visit Desk
**Clinical letter** calls `POST /api/encounters/[id]/clinical-letter`, rewrites
the note with chart context (no invented findings), renders Alignment-branded
PDF, stores under chart slot `consultation-report`, returns signed URL.
Files: `lib/encounters/clinical-letter.ts`, `clinical-letter-pdf.tsx`,
`storeChartBytes` in `lib/chart-files/store.ts`, Visit Desk button.

## [2026-11-07] ingest | Clinical letter live smoke (3 PDFs)

End-to-end on prod: created LetterSmoke Alpha/Beta/Gamma → uploaded short visit
audio → process to review → Clinical letter PDF on consultation-report →
downloaded. Verified branded header, patient identity, note-derived sections.
Patients removed from portal + local desk after. Sample PDFs:
`.agent/staging-letter-smoke-20261107/` and Desktop
`Clinical-Letter-Smoke-2026-11-07/`.
