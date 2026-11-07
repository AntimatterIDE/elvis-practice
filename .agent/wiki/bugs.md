# Bugs — elvis-practice

## [2026-11-07] OCR missing-field warnings when chart already filled

**Symptom:** Extract review warned phone/email missing though chart had them.  
**Cause:** Warning refresh ignored existing chart values.  
**Fix:** `coveredBy` / `coverageFromPatient` on ChartExtractReview and related OCR surfaces.
