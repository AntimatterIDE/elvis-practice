# Production live extraction eval (2026-10-23)

Ran against `https://thealignmentclinic.com/api/dev/spine-eval` using the
Vercel `OPENAI_API_KEY` (not the depleted local clinix_backend key).

| Suite | Result |
| --- | --- |
| Full 60 (extract → codeVisit) | **51/60 (85%)** |
| Office / trauma / adversarial (E/T/X) | 30/39 |
| Injections (P) | **8/8** |
| Surgery (S) | **13/13** |
| Deterministic qualify (golden facts) | 60/60 (unchanged) |

Raw rows: `production-extraction-eval.json`.

Remaining 9 misses are office E/M tagging only (new vs established, ±1 MDM
level, one telehealth visit quote drop). Procedure CPT/ICD for claim gear-up
on injections and OP notes passed in full.

Suggestions flag: on (`SPINE_CODING_SUGGESTIONS` default true).
