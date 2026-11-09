# Bugs — elvis-practice

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

## [2026-11-07] OCR missing-field warnings when chart already filled

**Symptom:** Extract review warned phone/email missing though chart had them.  
**Cause:** Warning refresh ignored existing chart values.  
**Fix:** `coveredBy` / `coverageFromPatient` on ChartExtractReview and related OCR surfaces.
