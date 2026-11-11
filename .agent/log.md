# elvis-practice — agent log

## [2026-11-11] bugfix | Start clearing delivery QA P0s

Deleted off-brand cervical-cancer journal posts (public 404). Retargeted
journal/search clinical deep links via `clinicalHref` to hub anchors while
pages stay unpublished (CONTENT_SOURCE=file). Contact form no longer mounts at
opacity 0. Added owner/admin Tools → Purge QA smoke charts
(`purgeSmokeChartsAction`). Address/phone NYC+407 left pending practice confirm.
Absurd DOBs (Margaret / Frances) still need chart fixes.

## [2026-11-11] ingest | Delivery QA — not ready for Dr Elvis handoff

Full live probe of thealignmentclinic.com (public + owner staff desk).
**Verdict: FAIL delivery gate.** P0: all 23 condition/treatment detail pages
unpublished (30 journal Read-next dead links); 2 live journal posts about
cervical cancer; production roster still has QA/smoke charts + absurd DOBs
(2025 yrs / 915 yrs). P1: NYC address vs 407 phone; contact form opacity:0
until scroll. Passed: marketing pages/assets, contact submit, Ask widget,
auth gates, intake RecordsImport card, ops desks HTTP 200. Canvas:
`alignment-clinic-delivery-qa.canvas.tsx`.

## [2026-11-10] ingest | Intake records import card live on prod

`2b055b0` (RecordsImportCard) + retrigger `7a2c094`. First Vercel attempt on
`2b055b0` failed instantly (no build); empty-commit redeploy succeeded.
Production: thealignmentclinic.com — Vercel
`CKiZybJh3Bk4qtdHRaaZiDWojHLJ`.

## [2026-11-10] ingest | Intake records import = one card

Merged single-packet + bulk folder into `RecordsImportCard` with One packet /
Folder tabs. `OutsideRecordsImport` and `BulkPatientImport` take `embedded`
to drop duplicate chrome. Mounted from `intake-desk.tsx`.

## [2026-11-09] ingest | OCR high-ROI push (fixtures + sidecar + miner + match)

Soft clinical scoring in `score_draft.py` + imaging/EMG exact scalars + packet
offline tests. Sidecar `alignment-ocr-00005-gd9`: `OCR_HYBRID_DPI=300`,
preprocess, Doc AI escalate on partial. Miner cite-or-clear + second-pass
dropped pages; bulk confidence badges; unread Approve ack; DOB-scoped
member_id/phone match + tighter fuzzy. Extraction still review-gated, not absolute.
Shipped: clinix-ocr `8c2fa4a`, elvis-practice `66f9c8f`/`9808364` (Vercel
success). Browser retest 2026-11-09 evening: individual Angela → Update
existing (phone/email/payer/member all filled, PyMuPDF); bulk Angela → Update
with HIGH confidence badges on Select fields; BulkSmoke New Person → New
chart. Denied both bulk cards — no chart writes. Live miner packet CI skipped
(no local `OPENAI_API_KEY`).

## [2026-11-09] ingest | Post-deploy live browser OCR retest (pass)

Prod intake after `a3f4603` + `alignment-ocr-00003-4fr` + HTTPS flip. Individual
Angela extract: Update existing; phone `718-555-0199`; payer Fidelis; member
`74619306600`; email conflict warning; PyMuPDF · 1 pages (chart not confirmed).
Bulk folder (`bulk-smoke`): Angela → Update existing with Select fields to update
(phone `3476662318`→`718-555-0199`, email —→`angela.update.smoke@example.com`);
BulkSmoke New Person → New chart (DOB `1992-08-15`, phone `646-555-0144`,
Self-pay). Denied both bulk cards — no chart writes.

## [2026-11-09] ingest | Deployed OCR accuracy fixes + HTTPS

Redeployed `alignment-ocr` revision `00003-4fr` (hybrid-page OCR). Flipped
`service_config` id=ocr to `https://alignment-ocr.136.69.85.193.sslip.io`.

## [2026-11-09] bugfix | OCR engine accuracy fixes (items 1–8)

Implemented sidecar hybrid-page OCR + partial flags; clinical routing to all
non-noise pages with truncation warnings; regex/phone/member/name hardening;
demographics-first merge with conflict warnings; field validation; evidence
page/quote + verified confidence; bulk UI partial/unread + per-field Update
accept + fuzzy “possible match”; fixture ground truth + `test:ocr-accuracy`.

## [2026-11-09] lint | OCR engine vet (read-only) — open findings recorded

Audited sidecar + miner + matcher; reproduced each gap with unit probes and the
23 public fixtures through live `alignment-ocr` (all HTTP 200, longest 39 s).
No code changed. Findings in `.agent/wiki/decisions.md` → "OCR engine vet".
Correction to the retest entry below: that fixture's single 14 pt line ran off
the 612 pt page, so "Payer: F" and the missing phone/email were the fixture's
fault, not OCR's. The phone `7461930660` shown on that card was real engine
behaviour (`scrapePhone` cut it from the member id). Cert now ACTIVE; HTTPS
health 200; `service_config` not flipped yet.

## [2026-11-09] ingest | Live OCR retest of update-queue smoke

Retested intake OCR against in-house `alignment-ocr` (no fetch mock). Individual
packet: Angela Morales-Guity → Document AI · Update existing chart · On chart now
(DOB 1985-01-27 / Fidelis / member 74619306600). Bulk mix: NewPerson → New /
Approve new; Angela → Update existing / Approve update. Denied both bulk cards
(no chart writes). Fixtures cleaned.

## [2026-11-09] ingest | In-house Alignment OCR on GCP + LB

Deployed `clinix-ocr` as Cloud Run `alignment-ocr` in `cs-project-chorn3hu`
(Document AI `22ebf398b71d35b1`). Org policy blocked public Run invoker and SA
keys, so traffic goes through global LB IP `136.69.85.193` (serverless NEG,
invoker IAM disabled, ingress LB-only). Seeded Supabase `service_config` id=ocr
to that URL + service key. Health `document_ai:true`; smoke extract via Document
AI OK. HTTPS cert for `alignment-ocr.136.69.85.193.sslip.io` still provisioning.

## [2026-11-09] decision | Bulk/OCR queue treats existing patients as updates

After extract, `resolveBulkCardMatch` tags each bulk card New vs Update
(fingerprint or name+DOB). Update cards show on-chart demographics; Approve is
allowed (no fingerprint block); apply merges via `mergeOnboardIntoPatient` or
creates only when unmatched. Name/DOB may force-create; fingerprint stays update.
OutsideRecordsImport shows the same chart snapshot. Tests in `bulk-import.test.ts`.

## [2026-11-09] bugfix | Angela Fidelis claim resubmitted with correct demographics

Prior AC755 used DOB 1995 (will fail at Fidelis); ACEEF/AC795 already Rejected;
ACC191 CH reject. Electronic void of AC755 blocked (hyphenated member → already-sent
idempotency). Chart member `74619306600`, DOB 1985-01-27, filing MC. New original
`ACFB61D4FAE0` / `c_2eac2d28` (99203/M50.20/$350/DOS 2026-11-05) → Stedi accepted.
Also stripped punctuation from member ids on claim submit (`81baf26`).

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
