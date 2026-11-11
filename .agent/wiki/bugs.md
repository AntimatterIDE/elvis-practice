# Bugs — elvis-practice

## [2026-11-11] Word chart uploads save with no OCR path

**Symptom:** `.doc`/`.docx` save on Files; no Extract into chart.  
**Cause:** OCR pipeline is PDF/image only; accept still allowed Word.  
**Fix:** After Word-only upload, message tells staff to use PDF/photo. Stored
PDF/image rows now have **Extract into chart** (re-run from signed URL).

## [2026-11-11] Claim form file pick stored papers with no OCR offer

**Symptom:** New claim “Upload a file” only queued attachments for save; no
Extract into chart.  
**Cause:** `claim-form.tsx` used FilePicker → `picked` without
`ChartExtractReview` (unlike ClaimPapers on claim detail).  
**Fix:** Offer extract on pick (pdf/image) and save accepted fields to the
patient chart via `pushPortalChartsAction` + `patchPatient`.

## [2026-11-11] Chart Files upload stores PDF but OCR never runs

**Symptom:** PDFs sit on Files (Received) with empty clinical fields / no
`ocrImportHashes` (e.g. Makiba Cameron MRI + progress note). Upload “never
gives a chance” for extract on Imaging.  
**Cause:** (1) Extract UI only offered in-session after `upload()` — leave /
dismiss / next upload clears it; no re-extract on stored files. (2) Offer was
rendered at the **top** of Files, so uploading Imaging (far down) left
“Extract into chart” off-screen — confirmed live (`inViewport: false` while
saved message showed).  
**Fix:** Render `ChartExtractReview` under the slot just uploaded +
`scrollIntoView`. Still need a re-extract action on stored files.  
**Status:** Viewport bug fixed; re-extract still open.

## [2026-11-11] Smoke charts resurrect after Tools purge

**Symptom:** Purge QA smoke charts reported success, then charts reappeared on
Patients within seconds.  
**Cause:** `mergePortalRoster` kept local-only charts and re-pushed them when a
stale roster load raced the purge; another open tab could also push the old
set. Visit Desk ClaimPipe/LetterSmoke encounters were never in the purge.  
**Fix:** Track `removedPatientIds`, drop known smoke names on merge/push
(`lib/rcm/smoke-charts.ts`), and extend `purgeSmokeChartsAction` to
`purgeSmokeEncounters` (hard-delete by visit label).

## [2026-11-09] OCR 502 from shared staging sidecar

**Symptom:** Bulk/outside-records extract returned HTTP 502.  
**Cause:** App still pointed at shared `clinix-ocr-staging` (Antimatter), which was
down/unreachable; Alignment Clinic needs its own OCR.  
**Fix:** Deploy `alignment-ocr` in `cs-project-chorn3hu` behind LB IP
`136.69.85.193`; point Supabase `service_config` id=ocr at that URL + key.
Org policy blocks Run `allUsers` and SA keys — use LB +
`--no-invoker-iam-check` + LB-only ingress (not public `*.run.app`).

## [2026-11-09] Fidelis Angela claim “invalid member” — qualified RCA

**Symptom:** Slack said Stedi rejected with “invalid member”; first claims looked “denied.”  
**Proven:**
- `ACC191940EAF` = clearinghouse reject for blank practice phone (not member).
- `ACEEF85354B4` / `AC7958B56120` = Stedi 277CA accept; app 276 only stored a generic “Claim status returned” (body discarded in `checkClaimStatus`).
- Chart was **Norales** + filing **CI**; card is **Morales-Guity** + Medicaid MMC; payer id **11315** is correct for Fidelis NY (11315MC is an alias, not required).
- Eligibility after name fix: `746193066` → **Invalid/Missing Subscriber/Insured ID**; `746193066-00` → **Patient Birth Date Does Not Match** (Fidelis found a member; chart DOB `1995-01-27` does not).
- UI stored AAA / error 271s as **Inactive** (`active: result.active === true` collapses `null`).
**Not proven:** that name alone caused the original invalid-member text; that CI→MC fixed it; diagnosis (ACEEF already had M50.20).  
**Follow-up 2026-11-09 evening:** Retried elig — DOB mismatch persists on `746193066-00`; insurance discovery found no coverage under chart DOB; CIN `XZ50434X` alone → AAA Unable to Respond. Chart left on member `746193066-00` with CIN in Group. Deployed 276 summarizer; ACEEF status now reads **Submitted charges** (not invalid-member). Still need photo ID to correct DOB before eligibility certifies.

**Follow-up 2026-11-09 (Stedi portal):** With DOB **1985-01-27** + member `746193066-00`, Stedi PROD check `ec_01a1c1af…` is **Active** — Fidelis returns Angela V **Norales Guity**, member `74619306600`, plan Fidelis Medicaid Managed Care / CIN `XZ50434X`. Desk said “Coverage status unknown” because `summarizeEligibility` only read classic `benefitsInformation` EB codes `1`/`6`; the live API body is the modern portal shape `plans[].benefits.statuses[].status = "ACTIVE_COVERAGE"` (no `benefitsInformation`). Fix: parse modern statuses + coPayment/coInsurance/deductible so Active/Inactive match the Stedi website.

**Follow-up 2026-11-09 (correct claim):** Chart DOB set to **1985-01-27**; member stored alphanumeric **`74619306600`** (hyphenated `746193066-00` → Stedi “Invalid Subscriber ID format” on 837P). Rejected priors ACEEF/AC795/ACC191 left as rejected (no electronic void needed). AC755 (wrong DOB 1995, still at payer as Submitted charges) marked rejected locally — freq-8 void failed after a hyphenated attempt set `stediClaimId` (“already sent”). New original **`ACFB61D4FAE0`** (`c_2eac2d28`): 99203 / M50.20 / $350 / DOS 2026-11-05 / filing MC / Fidelis 11315 → **Stedi 277ca accepted**. Durable fix: strip non-alphanumeric from `memberId` in `lib/rcm/submit-input.ts` (`81baf26`).

## [2026-11-07] OCR missing-field warnings when chart already filled

**Symptom:** Extract review warned phone/email missing though chart had them.  
**Cause:** Warning refresh ignored existing chart values.  
**Fix:** `coveredBy` / `coverageFromPatient` on ChartExtractReview and related OCR surfaces.
