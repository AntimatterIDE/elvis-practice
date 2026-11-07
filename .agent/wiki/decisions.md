# Decisions — elvis-practice

## OCR requires review + accept (2026-11-07)

- **Hard rule:** nothing extracted by OCR may write the chart until a person
  reviews it and explicitly accepts it — every entry point (intake, portal
  files, staff chart/claim files, outside-records import).
- `mergeOnboardIntoPatient` only applies keys listed in `accept`.
- Chart extract UI is opt-in per field (Accept all is still a deliberate click).
- Intake OCR may fill the form after “Apply to this form”; submit files the
  packet but does **not** silently merge leftover OCR clinical fields.

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
