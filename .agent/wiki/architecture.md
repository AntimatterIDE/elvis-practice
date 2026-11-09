# Architecture — elvis-practice

## Visit Desk

1. Staff records audio on phone (`useVisitRecorder`).
2. `POST /api/encounters` + uploads → `POST …/process` (transcribe → SOAP note → spine coding suggestions).
3. Status `review` / `approved`: edit codes, approve note+codes, open claims.
4. **New claim autofill from clinic visits only:** choosing a patient on
   `/admin/operations/claims/new` calls `POST /api/encounters/latest-for-patient`.
   - Returns every claimable Visit Desk encounter for that chart (newest first),
     matched by `appointmentId` or exact `patientLabel`
     (`lib/encounters/claim-from-visit.ts`).
   - Claim form cycles Earlier/Later (or a visit dropdown) and fills DOS, note,
     ICD-10, and CPT/HCPCS from the selected visit — never outside OCR / chart
     problems. Each CPT keeps that visit’s diagnosis pointers.
   - Prefers approved codes; otherwise uses review suggestions.
   - Open-with-`?encounter=` still seeds the same draft helper.
5. **Clinical letter** (one template for every visit): button on Visit Desk after review → `POST /api/encounters/[id]/clinical-letter`.
   - Rewrites the existing note + chart context (`lib/encounters/clinical-letter.ts`) — does not invent findings.
   - Branded PDF (`lib/encounters/clinical-letter-pdf.tsx`, `@react-pdf/renderer`, Alignment logo + oxide/clinic-blue).
   - Stored on chart slot `consultation-report` via `storeChartBytes`; returns signed download URL.
   - Requires a matched `patientId` (scheduled visit or visit label matching a chart).

## Claims (Stedi 837P)

- Place of service: claim form select (`lib/rcm/place-of-service.ts`) + surgery/office warning.
- Frequency: original `1`, replacement `7`, void `8` on `Claim.claimFrequencyCode`.
  Replacements/voids carry the payer claim control number into
  `claimSupplementalInformation.claimControlNumber` (`lib/stedi/payload.ts`).

## Eligibility (Stedi 270/271)

- `checkEligibility` → `summarizeEligibility` in `lib/stedi/parse.ts`.
- Must match Stedi portal Active/Failed labeling. Live responses use the modern
  shape `plans[].benefits.statuses` (`ACTIVE_COVERAGE` / `INACTIVE_COVERAGE`) plus
  `coPayment` / `coInsurance` / `deductible` — not only classic
  `benefitsInformation` EB codes. Parser supports both. Plan-level STC `30`
  status wins for Active/Inactive; Medical Care STC `1` preferred for copay/coins;
  deductible uses individual `REMAINING` on STC `30`.

## Chart files

- Bucket `chart-files`; path `{patientId}/{slotId}/{objectKey}`.
- Slots include `consultation-report` (this practice’s letter/report), `outside-records`, etc.

## OCR → chart (review gate)

- Extract APIs (`/api/ocr/onboard/*`) return drafts only; they never write charts.
- Chart writes go through `mergeOnboardIntoPatient({ accept })` or a fully
  reviewed outside-records draft save / intake form answers.
- `ChartExtractReview`: per-field accept checkboxes, then confirm.
- Intake `finalizeIntakeOcr`: files packet + OCR text artifact only — no silent
  clinical merge.
- **Bulk folder import** (Patient intake): `BulkPatientImport` +
  `lib/ocr/bulk-import.ts`. Staff picks a folder (`webkitdirectory`). Subfolders
  → one packet; root files → one packet each. Sequential OCR extract →
  `resolveBulkCardMatch` (`findOcrImportMatch`: fingerprint or name+DOB) tags
  each flippable card as **New** or **Update** and shows “On chart now”
  (name/DOB/payer/member/phone/email). Staff can edit, Approve, or Deny every
  card; name/DOB matches may opt into “create separate anyway”; fingerprint
  matches stay updates. Apply runs create
  (`patientFromOnboardDraftWithHashes`) or merge (`mergeOnboardIntoPatient` +
  overwrite accepted keys) then `fileOnboardPacketToChart`. Single-packet
  `OutsideRecordsImport` uses the same detect-first rule and chart snapshot.
