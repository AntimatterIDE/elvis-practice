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

## Schedule day sheet (`/admin/operations/scheduling`)

- `ScheduleDesk` → `ScheduleDayNav` (‹ day ›, popup month calendar with
  visit-day dots, Today) + `DaySheet` (room columns, time grid, cards).
  Practice desk home reuses `DaySheet` without the corner actions.
- Day from `?day=YYYY-MM-DD` (invalid/missing → today). Nav and booking
  update the URL via `router.replace` (keeps `?patient=`). Workbench pulse
  tiles and “Schedule a visit” carry `?day=` when not today.
- Layout helpers in `lib/rcm/day-sheet-layout.ts`: default window **7 AM–7 PM**
  (expands only for out-of-range visits); `placeRoomVisits` lanes true
  time-overlaps side by side (back-to-back stay full width). Cards size to
  `duration × 2px/min` (30 min = 60px). Inner `max-h-[70vh]` scroller; room
  headers sticky; time column sticky left; scroll to 30 min before first visit
  (or 8 AM empty).
- Corner **Check in** / **Room** + Radix **⋯** menu (`VisitCardActions`);
  card body still opens Record via `recordVisitHref`.
- Board waits on `useClinicDayReady` so `DEMO_CLINIC_DAY` never flashes as the
  calendar month; opening the popover sets `viewMonth` from the current day.
- **Live check-in signal:** `arrived` / `in_progress` cards already render mint
  green. `PortalBridge` polls the shared roster every **2s** on
  `/admin/operations` and `/admin/operations/scheduling` (15s elsewhere) and
  refreshes on tab focus, so PM check-in shows on the doctor’s open board
  within a couple seconds (no websocket).

## Claims (Stedi 837P)

- Place of service: claim form select (`lib/rcm/place-of-service.ts`) + surgery/office warning.
- Frequency: original `1`, replacement `7`, void `8` on `Claim.claimFrequencyCode`.
  Replacements/voids carry the payer claim control number into
  `claimSupplementalInformation.claimControlNumber` (`lib/stedi/payload.ts`).
- **Submission proof (official):** After **Submit claim**,
  `produceAndStoreClaimSubmissionProof` fetches Stedi Claim Timeline, renders a
  branded PDF (`lib/stedi/submission-proof-pdf.tsx`), and **always** files it on
  the chart under `claim-{claimId}` via `storeChartBytes`. A popup offers
  download; if skipped, the PDF remains on patient **Files → Claim submission
  proofs** and claim **Note and papers**. Manual page:
  `/admin/operations/claims/[id]/proof` (`fetchClaimSubmissionProof`) also has
  **File PDF to chart** for predating / re-file. Resolves lifecycle `clm_…` via
  List Claims by patient control number when only a correlation id is stored.
  Helpers in `lib/stedi/submission-proof.ts` (skips empty timeline rows; collapses
  duplicate ack statuses like `RECEIVED (RECEIVED)`).

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

## OCR sidecar (in-house)

- Cloud Run `alignment-ocr` in GCP project `cs-project-chorn3hu` (admin@
  thealignmentclinic.com), Document AI processor `22ebf398b71d35b1`.
- Org policy blocks `allUsers` invoker and SA key creation, so the app does
  **not** call `*.run.app` directly. Ingress is
  `internal-and-cloud-load-balancing` with `--no-invoker-iam-check`; public
  entry is the global HTTP(S) LB (`alignment-ocr-ip` → serverless NEG).
- Credentials (`resolveOcrCreds`, `lib/ocr/clinix-ocr-client.ts`): env
  `OCR_SERVICE_URL` + `OCR_SERVICE_KEY` win when both are set; otherwise the
  `service_config` row `id=ocr` (`url` + `key`, cached 60 s).
- `service_config` points at `https://alignment-ocr.136.69.85.193.sslip.io`
  (cert ACTIVE; flipped 2026-11-09). Cloud Run revision `alignment-ocr-00005-gd9`
  includes hybrid DPI 300, preprocess, and Doc AI escalate on partial.
- Accuracy fixes (2026-11-09): hybrid-page Tesseract + cite-or-clear +
  truncated-page second pass + unread Approve ack + member/phone soft match.
  See [decisions.md](decisions.md#ocr-engine-accuracy-fixes-2026-11-09).

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
  `resolveBulkCardMatch` (`findOcrImportMatch`: fingerprint, name+DOB,
  member_id, phone, or tightened fuzzy) tags each flippable card as **New** or
  **Update** and shows “On chart now”. Staff can edit, Approve, or Deny;
  soft matches may opt into “create separate anyway”; fingerprint stays
  update. Partial / unread / truncated pages require an ack checkbox before
  Approve. Apply runs create (`patientFromOnboardDraftWithHashes`) or merge
  (`mergeOnboardIntoPatient` + overwrite accepted keys) then
  `fileOnboardPacketToChart`. Single-packet `OutsideRecordsImport` uses the
  same detect-first rule, chart snapshot, and unread ack.
