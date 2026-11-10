# Decisions — elvis-practice

## OCR requires review + accept (2026-11-07)

- **Hard rule:** nothing extracted by OCR may write the chart until a person
  reviews it and explicitly accepts it — every entry point (intake, portal
  files, staff chart/claim files, outside-records import).
- `mergeOnboardIntoPatient` only applies keys listed in `accept`.
- Chart extract UI is opt-in per field (Accept all is still a deliberate click).
- Intake OCR may fill the form after “Apply to this form”; submit files the
  packet but does **not** silently merge leftover OCR clinical fields.

## OCR detect existing before create (2026-11-09)

- After any onboard OCR extract (bulk folder or single packet), match against
  desk patients by fingerprint first, then name + DOB.
- Matches enter the review queue as **updates** (not new charts). Cards show
  what is already on the chart; staff may still edit the draft, Approve, or Deny.
- Name/DOB matches can optionally “create separate anyway.” Fingerprint matches
  (same files already filed) always update that chart.
- Chart-scoped OCR (`ChartExtractReview` on an open chart) already merges into
  that patient — no separate create path.

## OCR engine accuracy fixes (2026-11-09)

First wave deployed (`00003-4fr` + `a3f4603`) and browser-retested. High-ROI
push (2026-11-09 evening): clinical soft scoring, hybrid DPI/preprocess +
Doc AI escalate on partial, cite-or-clear, second-pass truncated pages,
unread Approve ack, DOB-scoped member/phone match + tighter fuzzy. Still not
absolute — review-gated by design.

Sidecar (`clinix-ocr/src/clinical_ocr.py`) — done
- `_structured_from_pymupdf` OCRs image-only pages via Tesseract; sets
  `partial` + `failed_pages` when a page stays empty.
- `OCR_HYBRID_DPI=300`, `OCR_PREPROCESS=1` (autocontrast + light deskew),
  `OCR_FORCE_DOCAI_ON_PARTIAL=1` (onboard escalates partial PyMuPDF to Doc AI).
  Live revision `alignment-ocr-00005-gd9`.

Miner (`onboard-draft.ts`) — done
- Clinical section corpus includes all non-noise labels (incl. `other`).
- `buildSectionCorpus` returns `{ corpus, droppedPages }` and truncation
  warnings surface on the draft; second-pass remine of dropped pages.
- Demographics wins identity on merge; conflicts + section warnings preserved.
- Regex: phone digit boundaries, member id requires id/number/#, patient-only
  name labels, no CamelCase surname split, third-party email filter.
- `normalizeOnboardDraft` validates DOB/email/phone/member/payer/state/ZIP;
  converts US dates to ISO.
- Miner returns `evidence` page/quote; `verifyEvidence` /
  `applyEvidenceConfidence` + `clearUnverifiedEvidence` (cite-or-clear).

Matching / review — done
- Match order: fingerprint → name_dob → member_id → phone → name_dob_fuzzy
  (fuzzy needs ≥2 overlap tokens and one exact token length ≥5).
- Bulk/single: unread/partial/truncation requires ack before Approve/Confirm.
- Soft clinical needles scored in `score_draft.py`; imaging/EMG exact scalars;
  `npm run test:ocr-accuracy` covers insurance + cervical/lumbar packets offline.

## Claim autofill from clinic visit (2026-11-07)

- Autofill a new insurance claim only from **Alignment Clinic** Visit Desk
  encounters for that patient (note + ICD + CPT).
- When the patient has multiple claimable visits, the biller cycles them and
  picks which visit to bill; each CPT keeps that visit’s diagnosis pointers.
- Do **not** autofill from outside records OCR or the chart problem list.
- Prefer approved codes; if the visit is still in review, use suggestions and
  tell the biller to confirm before Ready for bill.

## Clinical letter (2026-11-07)

- One **Clinical Letter** template for all visits (not specialty-specific consult PDFs).
- Entry point: Visit Desk button **after Review** (status `review` or `approved`).
- Source of truth: visit note + chart; LLM polish only; empty sections when unsupported.
- Artifact: PDF on Files → Consultation report; attorney/shareable form of the same visit.

## Claim POS + corrected/void (2026-11-09)

- Claim form place of service is a CMS select (11/22/19/21/24/23) with an “other” code path.
- Warn when Office (11) is paired with major spine OR codes (22x/228/630–633/636).
- Claim frequency 1/7/8 is editable; 7/8 require the payer claim control number on the
  837P (`claimSupplementalInformation.claimControlNumber`). Frequency 1 must not send a PCCN.
- Medicare Part B (MB) refuses 7/8 on professional claims (Stedi/CMS rule).
- Still external / deferred: type-2 clinic NPI, injury 837P fields, prior-auth tracking,
  attorney privacy/terms, clinical content publish, BAAs, AMA CPT license.

## CONTENT_SOURCE does not switch loaders (2026-11-08)

- `CONTENT_SOURCE` is env-validated and shown on the Content desk, but
  `lib/content/index.ts` always reads TypeScript file drafts
  (`conditions.ts` / `treatments.ts`). Public `/conditions/[slug]` and
  `/treatments/[slug]` never query Supabase.
- Admin publish (`saveClinicalDocument` in `app/admin/actions.ts`) upserts
  Supabase only. Unpublish copy even says the public site hides a page
  “once it is reading Supabase” — that switch is not implemented.
- README claim that `CONTENT_SOURCE=supabase` makes public routes read
  published rows is stale until a loader branch exists.
- Practical launch path today: flip file draft
  `offeringStatus` / `reviewStatus` / `publishedAt` after clinical sign-off,
  *or* build the async Supabase loader (~half day to ~1.5 days).
