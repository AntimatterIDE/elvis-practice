# elvis-practice — agent log

## [2026-11-07] ingest | Bulk folder patient upload

Patient intake bulk import: folder pick → group packets → sequential OCR →
flippable Approve/Deny draft cards → create charts only for approved.
`lib/ocr/bulk-import.ts`, `BulkPatientImport`, mounted under OutsideRecordsImport.
OCR review gate preserved (Approve = accept; no silent writes).

## [2026-11-07] ingest | Claim-pipe live smoke (multi-visit + edges)

Deployed `6d697c2` to production. Live smoke: 3 ClaimPipe Multi visits
(process → approve codes with diagnosis pointers) → claim form autofill +
Earlier/Later cycle + dropdown. Edges: no-visits empty, missing patientId 400,
name mismatch empty, incomplete uploaded excluded, OCR accept gate. Evidence:
`.agent/staging-claim-pipe-smoke-20261107/summary.json`. Smoke charts removed;
labeled ClaimPipe encounters remain on Visit Desk.

## [2026-11-07] decision | OCR must be reviewed and accepted

Hard rule across every OCR entry point: extracted fields do not write the chart
until the user accepts them. `mergeOnboardIntoPatient` requires `accept`;
ChartExtractReview is opt-in per field; intake finalize only files the packet /
OCR artifact (no silent clinical merge).

## [2026-11-07] ingest | Claim autofill cycles clinic visits

New claim form loads every claimable Alignment Clinic visit for the patient
(newest first) and lets the biller cycle Earlier/Later or pick from a dropdown.
Selecting a visit fills note + ICD + CPT with that visit’s diagnosis pointers.
`listClinicVisitsForPatient` + ClaimForm visit picker; still no outside OCR.

## [2026-11-07] ingest | Claim autofill from latest clinic visit

New claim form fills from the patient's latest Alignment Clinic Visit Desk
encounter only (note + ICD + CPT). `claim-from-visit.ts` +
`POST /api/encounters/latest-for-patient`; ClaimForm runs on patient select.
Does not pull outside OCR / chart problems into the autofill.

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
