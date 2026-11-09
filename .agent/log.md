# elvis-practice — agent log

## [2026-11-09] bugfix | Eligibility Active now matches Stedi portal

Root cause: live 271 bodies use `plans[].benefits.statuses[].status =
ACTIVE_COVERAGE` (portal “Active”); desk summarizer only looked at classic
`benefitsInformation` code `1`/`6`, so Angela Morales-Guity / Fidelis 11315
showed “Coverage status unknown” while Stedi PROD `ec_01a1c1af…` was Active.
Fix in `lib/stedi/parse.ts` (+ tests): read modern statuses and benefit amounts
alongside the EB-code path. Confirmed DOB 1985-01-27 + member `746193066-00`.
Deployed `49df618` / `4b630f6` / `33e2aae`. Cleared Angela eligibility history
(clear + tombstones so desk merge does not resurrect rows). Live re-check:
**Coverage active** · Status Active · copay $0 · coins 0% · deductible $0.
Deployed `49df618` / `4b630f6` / `33e2aae`. Cleared Angela eligibility history
(clear + tombstones so desk merge does not resurrect rows). Live re-check:
**Coverage active** · Status Active · copay $0 · coins 0% · deductible $0.

## [2026-11-09] ingest | Claim POS select + corrected/void frequency

Shipped finishable billing gaps: claim form POS select (11/22/19/21/24/23 + other)
with office/surgery warning; claim frequency 1/7/8 with payer claim control number
on the 837P; MB refuses 7/8. Left external: privacy/terms, BAAs, type-2 NPI, AMA,
Treasury/Lockbox, clinical publish, indexing, injury/prior-auth tracking.

## [2026-11-07] bugfix | Bulk card overflow + hidden-face pointer leak

`BulkPatientImport` flip card had two visual bugs: (1) front face scrollHeight
(566px) exceeded `min-h-[28rem]` (448px) so Payer/Member id spilled over the
Flip/Deny/Approve row; (2) back face remained hit-testable when flipped so its
inputs intercepted button clicks. Fix in `components/admin/rcm/bulk-patient-import.tsx`:
fixed `h-[36rem]` wrapper, `overflow-y-auto` + `auto-rows-min content-start` on
both faces, `aria-hidden` + `pointer-events-none invisible` on the inactive
face. Re-smoked on prod `a4e3388`: Flip/Deny/Approve all land cleanly, approve
advances to "1 draft ready to create".

## [2026-11-07] ingest | Bulk folder import prod browser smoke

Deployed `ed4458c`. Live intake tests: nested grouping, OCR cards, flip,
missing-name blocks Approve, create 2 charts (BulkSmoke Alpha / Alicia Mendel),
non-record folder error, flat root grouping, deny-all, fingerprint blocks
Approve. Evidence: `.agent/staging-bulk-import-smoke-20261107/summary.json`.

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

## [2026-11-08] ingest | CONTENT_SOURCE is display-only

Public clinical loaders always use TypeScript file drafts; admin publish writes Supabase only. Env `CONTENT_SOURCE` does not switch reads. README supabase-loader claim is stale. See `.agent/wiki/decisions.md`.

## [2026-11-09] bugfix | Angela Morales-Guity Fidelis claim resubmit

First Stedi claims rejected (invalid member / wrong name Norales + commercial CI).
Chart fixed to Morales-Guity, member 746193066, Medicaid MC, payer 11315.
Diagnosis from CMS-1500 image: M50.20 (not M51.26). New claim AC755715A00E
(c_b1b80088): 99203 / M50.20 / $350 / DOS 2026-11-05. Stedi accepted (277ca).

## [2026-11-09] bugfix | Qualified Fidelis invalid-member RCA

Eligibility ladder: bare 746193066 → Invalid/Missing Subscriber ID; 746193066-00 →
DOB mismatch (member found). Name/CI were real chart bugs but not EDI-proven as the
sole invalid-member cause. 276 parser now summarizes status codes; eligibility
prefixes inconclusive AAA responses. Chart left on 746193066-00 pending DOB check.

## [2026-11-09] bugfix | Fidelis RCA continued — DOB + 276 Submitted charges

Elig retry: DOB mismatch on 746193066-00; discovery empty; CIN alone AAA.
Chart: member 746193066-00, group/CIN XZ50434X. 276 on ACEEF now: Submitted charges.
Shipped nested-status 276 parser fix (0dd024f) + CIN-via-group on 270 (4248c04).
