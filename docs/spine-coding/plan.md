# Spine coding plan — The Alignment Clinic

Status: **Phase 0 live in production** (commit `66d9f73`, 2026-10-22) · Path of least resistance is the rollout driver (section 0) · Partner checklist: `/dev/coding-data` · Written 2026-10-22 · Billing input: Christina 2026-10-22 (sections 11–13)

## 0. Path of least resistance (build order)

This is how we ship exact coding without waiting on AMA. The partner page
`/dev/coding-data` mirrors these steps. Do not skip ahead to auto-suggestions
until steps 1–3 are green.

| Step | Status | What |
| --- | --- | --- |
| 1. CMS NCCI pack | **Done 2026-10-22** | Practitioner PTP spine subset (`ncci-ptp.json`), MUE, add-on primaries, Policy Manual PDFs under `docs/spine-coding/ncci-policy-manual-2024/` |
| 2. Phase 0 deploy | **Done 2026-10-22** | Suggestions off; CMS ICD/PFS/HCPCS search; claim form search; Ready + Stedi library checks; bill as The Alignment Clinic + EIN |
| 3. Wire NCCI/MUE/add-on validator | **Done 2026-10-22** | `claimCodeProblems` fails closed on NCCI pairs, over-MUE units, add-ons without a listed primary — Ready for bill + Stedi (same library) |
| 4. Fact extract + TypeScript spine rules | Later | `gpt-5-mini` facts + quotes only; rules emit CPT/ICD numbers; still numbers-only until AMA |
| 5. AMA CPT Data File (distributor) | When ready | Official descriptors, inclusion text, E/M tables — Clinix distributor license, not a clinic Codify seat |

**Impenetrable stack:** LLM never invents codes → TypeScript rules (CMS + optional AMA text) → CMS validator (ICD billable, PFS, NCCI, MUE, add-on) → human review → same checks again before Stedi.

## 1. Summary

The visit coder that turns a scribe note into ICD-10 and CPT codes cannot code
spine care and must not be used to bill. This plan replaces it with a pipeline
that runs entirely inside this app (Vercel + Supabase). It needs no ClaimX, no
new hosted service, and no GPU:

1. **Extract facts.** One OpenAI call reads the note and returns clinical facts
   (procedures, levels, laterality, diagnoses, visit type), each with a quote
   from the note. It never returns codes.
2. **Code with rules.** A TypeScript rules engine turns the facts into spine
   codes with units, modifiers, and diagnosis links. Dr. Francois signs off on
   every rule.
3. **Validate.** Every code is checked against current CMS data (billable
   ICD-10-CM codes, NCCI pairs, unit limits, global periods) when the doctor
   reviews, when he approves, and again before the claim goes to Stedi.
4. **Review and carry through.** The doctor sees the reason and quote for each
   code, can search for and add any valid code, and approves. Units,
   modifiers, and per-line diagnoses carry into the claim unchanged.

Until the acceptance gate in section 8 passes, the visit desk shows no
suggested codes. Staff use code search and enter codes by hand.

Baseline evidence for everything in section 2 is in
[`baseline-2026-10-22/`](baseline-2026-10-22/): the 60 test notes with
expected codes (`cases.json`), the coder output for each (`report.txt`), and
15 end-to-end runs on thealignmentclinic.com (`live-site-results.json`).

## 2. What is wrong today (tested 2026-10-22)

The production coder (`suggestCodes` in `lib/encounters/codes.ts`, data in
`data/coding/`) was run against 60 spine notes. The same coder run locally
produced exactly the same codes as the live site on all 15 notes compared.

| Measure | Result |
| --- | --- |
| Correct CPT anywhere in the top 10 | 0 of 58 |
| Correct CPT exists in the catalog at all | 1 of 58 |
| Correct ICD-10 ranked first | 3 of 57 realistic notes |
| Correct ICD-10 anywhere in the top 10 | 5 of 57 realistic notes |
| Suggested ICD-10 codes that are not billable | 289 of 600 |
| Suggested codes that are even spine-related | ICD 157 of 600, CPT 90 of 592 |
| Suggestions labeled "level 1" (highest confidence) | 1,192 of 1,192 |

Examples from the run:

- L5-S1 disc herniation → `M05.672` rheumatoid arthritis of the left ankle.
- Microdiscectomy op note → `O00.202` ectopic pregnancy.
- Laminectomy op note → `B16.9` acute hepatitis B.
- "No evidence of cauda equina syndrome" → `C72.1` cancer of the cauda equina.
- "History of breast cancer" → breast CT and tumor genomic tests.
- Spanish-language note → `A50` congenital syphilis.

### Root causes

- **Matching.** `scoreCode` adds 10 points when any word of the note appears
  anywhere inside a code string. Short words such as "a", "2", "L4", or "C5"
  match thousands of codes (C5 → `C50` breast cancer, L4 → `L40` psoriasis),
  and that bonus outweighs any description match. Words are split on spaces
  only, so "radiculopathy," with a comma never matches a description. "Left"
  and "right" boost any limb code. Negation ("no", "denies", "ruled out") and
  history are ignored. There are no spine synonyms; the only body-part
  synonyms are for hip, elbow, chest, and headache. `levelForScore` labels
  any score of 0.95 or more as "level 1", which is nearly every match.
- **CPT catalog.** `data/coding/cpt1-hcpcs/codes.json` (1,321 codes) has no
  office visit codes (99202–99215, 99024), no spine surgery codes, and no
  spine injection codes. 57 of the 58 expected CPT codes are missing.
- **ICD-10 catalog.** `data/coding/icd10-cm/flattened-codes.json` has 68,215
  rows: 18,121 are chapter, block, or parent rows that cannot be billed;
  34,516 descriptions are cut off with "……"; retired codes such as `M54.5` are
  present; and whole spine subtrees are missing (`S32.0xx` lumbar fractures,
  `S12.112A`, `T84.2xx` hardware complications, `M51.36x` disc degeneration).
- **Approval.** `applyCodeApproval` (`lib/encounters/approve.ts`) rejects any
  code the generator did not suggest, and "Open in claims" appears only after
  at least one diagnosis and one CPT are approved. Since the right CPT is
  almost never suggested, the doctor has to approve a wrong one to get there.
- **Claim hand-off.** `linesFromEncounter`
  (`components/admin/rcm/claim-form.tsx`) puts every approved diagnosis on
  every line, with 1 unit and no modifiers.
- **No checks before Stedi.** `productionClaimProblems` (`lib/stedi/payload.ts`)
  checks NPI, tax ID, addresses, member ID, payer, and that one line has a
  charge. Nothing checks the codes.

### Claim problems found while reading the code

These are outside the coder but affect every spine claim. All are in
`buildProfessionalClaim` (`lib/stedi/payload.ts`) unless noted. Items marked
**fixed in phase 0** are done in code (not yet committed).

- **Payer type — fixed in phase 0.** Staff choose the Stedi claim filing code
  (CI, BL, MB, …). Submission refuses a claim with none. *(Was always `CI`.)*
- **Diagnosis limits and hand-off — fixed in phase 0.** Visit approval and
  claims enforce 12 diagnoses, 4 pointers per line, and units/modifiers.
  Ready for bill and Stedi submit both run the CMS code library check.
  *(Was: every diagnosis on every line, no cap, no code check.)*
- **Billing identity — corrected 2026-10-22 (evening).** Claims bill as
  **The Alignment Clinic** (organization name + EIN from the Practice page).
  Dr. Francois is the rendering provider on each service line. Open risk: the
  Practice-page NPI `1114306040` is his *individual* (type 1) NPI in NPPES
  (orthopaedic surgery, last updated 2021, McDonough GA address, GA and MN
  licenses). Payers often reject an organization name paired with a type 1
  NPI. Needed: a type 2 clinic NPI on the Practice page (Anas looking up
  2026-10-23), plus an NPPES address update to New York.
- **Patient state — open (found 2026-10-22).** Free text in demographics and
  portal intake; new-patient form defaults to `GA` with no address fields.
  The claim sends `state.slice(0, 2)`, so "New York" becomes `NE`. See
  section 13.
- **Assignment of benefits — open (found 2026-10-22).** Hard-coded
  `planParticipationCode: "A"` and `benefitsAssignmentCertificationIndicator:
  "Y"`. Wrong for many self-pay / courtesy out-of-network filings. See open
  question 8.
- **Eligibility summary — open (found 2026-10-22).** Does not separate
  in-network vs out-of-network benefits. See section 13.
- **Injury claims — open; deferred.** No related-cause code or accident date
  on the 837P. Christina: workers' comp / no-fault are not expected soon
  (phase 4). Chart still stores `InjuryCase`.
- **Prior authorization — open.** No authorization number field; often
  required for spine surgery and injections.
- **Place of service — open.** Defaults to `11` (office). Surgeries need
  `22`/`19`, `21`, or `24`.
- **Corrected claims — open.** `claimFrequencyCode` is always `1`. Replaces
  and voids need `7` / `8` with the payer's claim number.
- **Claim records — open.** Claims live only in browser `localStorage`
  (`components/admin/rcm/store.tsx`). Not synced to Supabase. Server only
  keeps `clearinghouse_transactions` (payer, charge, CPT list).

## 3. Constraints

- **No ClaimX and no self-hosted model.** ClaimX was retired for hosting cost.
  Nothing in this plan adds a server, container, or GPU.
- **Runs where the app runs.** Code lives in this repo and runs in the
  existing Vercel functions. Data lives in the repo (`data/coding/`) or in
  Supabase.
- **One LLM vendor.** Extraction uses the OpenAI account the scribe already
  uses (`OPENAI_API_KEY`; the note is written by `gpt-5-mini-2025-08-07` in
  `lib/encounters/openai.ts`). It adds one call per visit, about the same size
  as the note call. The note text already goes to OpenAI, so no new vendor sees
  patient data. A BAA with OpenAI is in place (confirmed 2026-10-22). However,
  `writeClinicalNote` calls `/v1/responses` without `store: false`, and that
  endpoint keeps responses for 30 days by default. Every call that carries
  patient data (note writing and extraction) should send `store: false`. Also
  confirm with OpenAI that the account has zero data retention and that the BAA
  covers both endpoints in use (`/v1/audio/transcriptions`, `/v1/responses`).
- **Codes are never invented by the model.** The model reports facts and
  quotes. Codes come only from rules over CMS code files.
- **Clinical sign-off is Dr. Francois.** There is no certified coder, so
  every rule is written so a surgeon can check it (section 7).
- **CPT licensing.** CPT codes and descriptions are owned by the AMA. Checked
  2026-10-22: no AMA license, license application, or CPT copyright notice
  exists in the app or anywhere in the Clinix workspace. The only mention is an
  unchecked to-do in `PHASE_1_DELIVERY_SUMMARY.md` ("Load complete CPT
  database (requires AMA license)"). The app already shows CPT short
  descriptions in the visit desk and claim form. They come from
  `data/coding/cpt1-hcpcs/codes.json`, which was added on 2026-10-13 with no
  source or license note. The CMS files that carry CPT descriptions are
  downloaded under an end-user license, which is not meant for software built
  and hosted for a client. Before launch, either get an AMA license (check
  with AMA licensing whether Clinix needs a distribution license, the
  practice needs its own license, or both) or show only code numbers with
  wording Dr. Francois writes himself.

### 3.1 Where the rules are defined exactly (not surgeon sign-off)

Rules should come from published edit files and code sets, not from memory
or blog posts. Sign-off is optional QA; it is not the source of truth.

| Rule kind | Exact source | Access | On disk here? |
| --- | --- | --- | --- |
| Billable ICD-10-CM, descriptions, 7th character | CDC/CMS ICD-10-CM order + Official Guidelines | Free | Yes (`icd10cm.json`) |
| Active CPT/HCPCS, global days, status, bilateral / multi-proc indicators | CMS PFS RVU file + HCPCS Level II | Free (CMS short labels only) | Yes (`procedures.json`) |
| Codes that must not be billed together | CMS Medicare NCCI **Practitioner PTP** edits | Free | **No — get this** |
| Max units per day | CMS Medicare NCCI **Practitioner MUE** table | Free (some MUEs confidential) | **No — get this** |
| Add-on needs which primary | CMS NCCI **Add-on Code** edits | Free | **No — get this** |
| NCCI chapter narrative (when 69990/63047 with fusion, etc.) | CMS NCCI Policy Manual for Medicare Services | Free PDF | **No — get this** |
| CPT what-is-included / code selection text | **AMA CPT** (Data File / Professional / CPT Assistant) | **Paid AMA license** | **No — you must get this** |
| E/M level by MDM or time | AMA CPT E/M guidelines (in CPT) | **Paid AMA license** | **No — you must get this** |
| Injection coverage frequency (Medicare) | Medicare Coverage Database LCD/NCD (NGS for NY) | Free | Optional (they rarely bill Medicare) |

Commercial payers often follow Medicare NCCI; they are not a second free
“exact” spine codebook. Payer manuals matter only after you know which
commercial plans Christina bills.

Partner-facing checklist (same data + links + least-resistance path): staff
login → `/dev/coding-data` (`lib/dev/coding-sources.ts`). Not indexed.

## 4. Design

```
note ─► extract facts (OpenAI, JSON schema, quotes checked)
     ─► spine coder (TypeScript rules)
     ─► validator (CMS files) ─► doctor review and edits ─► approve
     ─► claim form (lines, units, modifiers, pointers)
     ─► validator again ─► Stedi 837P
```

### 4.1 Code library (`data/coding/`, replaces both current files)

Built from free CMS downloads by a new script,
`scripts/refresh-coding-data.ts`, run with
`node --experimental-strip-types` like the existing seed script.

| File | Source | Holds | Refresh |
| --- | --- | --- | --- |
| `icd10cm.json` | CMS ICD-10-CM order file, FY2027 (effective 2026-10-01) | Every code, full description, billable flag | Each October, plus any April update |
| `procedures.json` | CMS Physician Fee Schedule RVU file | CPT/HCPCS code, short description, status, global days (`ZZZ` marks add-on codes), multiple-procedure, bilateral, assistant, and co-surgeon indicators | Quarterly |
| `addon-primaries.json` | CMS NCCI add-on code edits | Each add-on code with the primary codes it may be billed with | Quarterly |
| `ncci-ptp.json` | CMS NCCI practitioner pair edits | Column 1/column 2 pairs and modifier indicator, for codes used by the spine rules | Quarterly |
| `mue.json` | CMS practitioner MUE table | Maximum units per day, for codes used by the spine rules | Quarterly |
| `spine-rules/*.json` | Written with Dr. Francois | Rule tables (section 5) | On change, with sign-off |

- Only codes flagged billable can be suggested, searched, approved, or
  submitted. Headers, parents, and retired codes are kept only so the
  validator can explain why a code was refused.
- The script prints what changed for spine codes since the last refresh
  (added, deleted, description changed) and fails if any rule refers to a
  code that is not in the new files.
- Each refresh writes a `codeSetVersion` (for example
  `icd2027-pfs2026q4-ncci2026q4`). Every coded encounter and every submitted
  claim stores the version that produced it.
- `next.config.ts` must add `data/coding/**` to `outputFileTracingIncludes`
  for every route that loads the library, not only
  `/api/encounters/[id]/process`. The keys are picomatch globs, so a dynamic
  segment needs escaped brackets (`"/api/encounters/\\[id\\]"`). The old
  unescaped key did not match its route, because picomatch reads `[id]` as one
  character, `i` or `d`. Done in phase 0.
- Size: the current ICD file is 7.2 MB. The new one will be similar. If cold
  starts become slow, the search list can move to a Supabase table without
  changing the rules.

### 4.2 Note sources

Codes can only be as right as the note they come from. Three gaps:

- **The note cannot be edited.** The visit desk shows the generated note as
  read-only text, and `PATCH /api/encounters/[id]` accepts only the approval
  flag and code lists. If the scribe gets a level or side wrong, the doctor's
  only choice is to approve it or not. Add note editing before approval, and
  re-run coding when the text changes.
- **Surgeries have no note path.** The scribe writes SOAP notes for office
  visits (`defaultNoteTemplate` in `lib/encounters/template.ts`). Surgery
  claims are coded from the operative report, which is usually written in the
  hospital or surgery center system. Add a "paste operative report" visit type
  that skips transcription and goes straight to coding. Add an operative
  template (pre/post-op diagnosis, procedures, levels, implants, graft,
  findings) for when Dr. Francois dictates op notes into the scribe.
- **No op notes are stored in the app yet.** The clinic's Supabase project
  (`wxknytuwuhyvemhnxwah`, created 2026-10-01) was searched on 2026-10-22:
  - none of the 27 saved visits is an operative report (25 are the test
    visits; the 2 real ones are office visits);
  - all 12 patient charts list "Hospital or surgery records" as missing;
  - the `chart-files` storage bucket has no files at all;
  - the 3 saved appointments are follow-ups with no scheduled procedures.

  The old "clinix claims" Supabase project is paused and was not opened.
  Op reports have to come from the hospital or surgery center where Dr.
  Francois operates. The chart already has a "Hospital or surgery records"
  upload slot (files go to `chart-files`). The coder can use those uploads
  if the extraction call reads the PDF directly: the OpenAI Responses API
  accepts PDF input. Send the file inline, not through the Files API, so
  nothing is stored at OpenAI.

### 4.3 Fact extraction (new `lib/coding/extract.ts`)

One OpenAI Responses call with a strict JSON schema (structured output). The
input is the note the doctor is approving. The output is facts only. Shortened
example:

```json
{
  "visit": {
    "kind": "office_new",
    "totalMinutes": 45,
    "mdm": { "problems": "chronic_illness_with_progression", "data": "independent_image_review", "risk": "decision_for_major_surgery" },
    "decisionForSurgery": true,
    "quote": "We discussed L4-5 TLIF and he wishes to proceed."
  },
  "procedures": [
    {
      "name": "tlif",
      "levels": ["L4-L5"],
      "side": "left",
      "instrumentation": { "kind": "pedicle_screws", "from": "L4", "to": "L5" },
      "interbodyDevices": 1,
      "graft": ["local_autograft", "allograft_morselized"],
      "navigation": false,
      "microscope": true,
      "performed": true,
      "quote": "Transforaminal lumbar interbody fusion was performed at L4-5 through a left-sided approach."
    }
  ],
  "diagnoses": [
    {
      "condition": "spondylolisthesis",
      "region": "lumbar",
      "levels": ["L4-L5"],
      "with": ["neurogenic_claudication"],
      "status": "current",
      "quote": "Grade 1 degenerative spondylolisthesis at L4-5 with neurogenic claudication."
    }
  ],
  "injury": { "workRelated": false, "autoAccident": false, "date": null, "cause": null, "quote": null }
}
```

Rules:

- Every fact carries a quote. Code checks that the quote appears in the note
  (ignoring case and extra spaces). A fact whose quote is not found is dropped
  and shown to the doctor as a warning.
- `status` is one of `current`, `history`, `ruled_out`, `negated`,
  `suspected`. Only `current` facts become diagnosis codes. Per the ICD-10-CM
  outpatient guidelines, a suspected or "rule out" diagnosis is coded as its
  signs and symptoms, and history becomes a Z-code only where a rule says so.
- `performed: false` (planned, recommended, scheduled) never becomes a
  procedure code.
- If the call fails or returns invalid JSON after one retry, the visit has no
  suggested codes and a visible message. The doctor codes it by search.
- No code values are accepted from the model. If one appears in a field, it is
  ignored.

### 4.4 Spine coder (new `lib/coding/spine.ts`, replaces `lib/encounters/codes.ts`)

Plain functions with no network or database calls:
`codeVisit(facts, library, rules) → { lines, diagnoses, warnings }`.

- A line is `{ cpt, units, modifiers, diagnosisPointers, rule, quote }`. A
  diagnosis is `{ icd, rule, quote }`. `rule` is the id of the rule that
  produced it, so every code on screen can say why it is there.
- Level counting is done in code, not by the model. For example, "L3-L5
  pedicle screws" means 3 vertebral segments and 2 interspaces, which
  decides both the add-on units and the instrumentation code.
- Primary and add-on codes are emitted together (63047 + 63048 ×(levels − 1),
  22551 + 22552 ×(interspaces − 1)). An add-on is never emitted alone.
- ICD-10-CM codes are picked by condition, region, level, side, and the "with"
  list (for example, L5-S1 herniation with radiculopathy → `M51.17`; C5-C6
  with radiculopathy → `M50.122`; lumbar stenosis with neurogenic claudication
  → `M48.062`). 7th characters come from the encounter type (initial,
  subsequent, sequela), and injuries get external-cause codes.
- Diagnosis pointers are set per line: the line's own indication first, with
  at most 4 per line and 12 per claim.

### 4.5 Validator (new `lib/coding/validate.ts`)

One function, `validateCoding(lines, diagnoses, context)`, used in three
places:

1. After coding, to show warnings next to the suggestions.
2. On approval in `PATCH /api/encounters/[id]`. Errors block approval.
3. In `submitProfessionalClaim` (`app/admin/stedi/actions.ts`), next to
   `productionClaimProblems`. Errors block the Stedi submission.

`context` holds the date of service, payer type, place of service, and the
patient's recent surgeries and injections from the chart.

| Check | Result |
| --- | --- |
| ICD-10-CM code exists, is billable, and is valid on the date of service (including 7th character) | Error |
| CPT/HCPCS code is active in the fee schedule file | Error |
| Add-on code has its primary code on the same claim | Error |
| Units over the MUE limit | Error |
| NCCI pair where modifiers are not allowed (indicator 0) | Error |
| NCCI pair where a modifier is allowed (indicator 1) but none is present | Error until a modifier (59, XS, XU, XE, XP) and a written reason are added |
| E/M within the 90-day or 10-day global period of the same surgeon's surgery | Error unless 99024, or modifier 24 (unrelated problem) or 57 (decision for a new major surgery) with a reason |
| Procedure within the global period of an earlier surgery | Error unless modifier 58 (staged), 78 (related return to the operating room), or 79 (unrelated) |
| E/M on the same day as a procedure with 0 or 10 global days, or the day of or before a 90-day surgery | Error unless modifier 25 or 57 is present and supported by the note |
| Modifier 50 on a code whose bilateral indicator does not allow it; missing LT/RT where laterality applies | Error |
| More than 12 diagnoses on the claim, more than 4 pointers on a line, or a line with no pointer | Error |
| Diagnosis does not support the procedure under the spine rules (for example, an ESI with only a low back pain code) | Warning with the rule text |
| Medicare injection rules (Local Coverage Determinations from the New York contractor, National Government Services): epidural injection frequency per region, levels per session, two diagnostic medial branch blocks with the required relief before radiofrequency ablation, imaging guidance documented | Warning with the rule text; becomes an error once the chart reliably records prior injections |
| Payer type matches the claim: workers' comp and no-fault need the injury date and claim number; Medicare uses `MB` | Error |
| Surgery without a prior authorization number for payers that require one | Warning |

The validator never changes codes. It only reports, so every fix is made by a
person and recorded.

### 4.6 Doctor review (`components/admin/visit-desk.tsx`, `lib/encounters/approve.ts`, `app/api/encounters/[id]/route.ts`)

- Show each line (CPT, units, modifiers, linked diagnoses) and each diagnosis
  with the rule that produced it and the quote from the note. Clicking the
  quote highlights it in the note.
- Remove the "level 1/2/3" labels.
- Add search over the billable code library so any valid code can be added.
  Units, modifiers, and pointers are editable, and lines can be removed.
- `applyCodeApproval` accepts any code that passes the validator, not only
  suggested ones. The "unable to code" path stays.
- Validator errors block approval. Warnings need a short reason to override.
- Every difference between the suggestion and what the doctor approved is
  saved (section 4.8). These edits become new test cases (section 8).

### 4.7 Claim hand-off and 837P fixes (`components/admin/rcm/claim-form.tsx`, `lib/stedi/payload.ts`, `app/admin/stedi/actions.ts`)

- `linesFromEncounter` copies units, modifiers, and per-line diagnoses from
  the approved lines instead of using 1 unit, no modifiers, and every
  diagnosis on every line.
- A payer type on the claim (commercial, Medicare Part B, Medicaid, workers'
  comp, auto no-fault) sets `claimFilingCode` instead of the fixed `CI`.
- Workers' comp and no-fault claims send the related-cause code, accident
  state, and accident date from the patient's injury case. Field names must be
  checked against Stedi's professional claims schema.
- A prior authorization number field is added to the claim and sent.
- Place of service comes from the visit or operative report (office,
  outpatient hospital, inpatient, surgery center) instead of always `11`.
- Corrected and voided claims send frequency `7` or `8` with the payer's
  original claim number.
- The billing provider is The Alignment Clinic (organization name + EIN).
  Dr. Francois is the rendering provider. Prefer a type 2 clinic NPI on the
  Practice page when one exists (see "Billing identity" in section 2).
- The validator runs before submission (section 4.5).

### 4.8 Storage

A migration on `public.encounters` adds:

| Column | Holds |
| --- | --- |
| `coding_facts jsonb` | Extracted facts with quotes |
| `coded_lines jsonb` | Suggested and approved lines (CPT, units, modifiers, pointers, rule, quote) |
| `coded_diagnoses jsonb` | Suggested and approved diagnoses (ICD, rule, quote) |
| `coding_edits jsonb` | Who changed what between suggestion and approval, with reasons |
| `coding_warnings jsonb` | Validator results at approval |
| `code_set_version text` | Code library version used |

`icd10` and `billing_codes` stay until the visit desk reads the new columns.
Then they are dropped. Claims also need a server table, or at minimum the
Stedi submission snapshot in `clearinghouse_transactions` must store the full
lines, diagnoses, pointers, encounter ID, and code-set version (see "Claim
records" in section 2).

## 5. Spine rule tables (first draft)

This is the starting coverage, grouped the way the rules will be reviewed.
Every code here is checked against the loaded CMS files when the rules are
built. No row produces suggestions until Dr. Francois signs it off.

### 5.1 Office, consult, and post-op visits

| The note documents | Codes |
| --- | --- |
| New patient visit | 99202–99205, by medical decision making or total time on the date |
| Established patient visit | 99212–99215, same way |
| Consult requested by another physician | 99242–99245 for payers that accept consult codes; otherwise new or established visit codes (Medicare does not pay consult codes) |
| Post-op visit for the same surgery within its global period | 99024 (no charge, tracked only) |
| Unrelated problem within a global period | Visit code + 24 |
| Decision for surgery on the day of or day before a 90-day surgery | Visit code + 57 |
| Separate, significant problem on the day of an injection | Visit code + 25 |
| Video or audio-only visit | Visit code + 95 or 93, with the place of service the payer requires |
| X-rays taken in the office | 72020–72120 by region and number of views; 72081–72084 for scoliosis films. Reviewing outside imaging counts toward the visit level and is not billed separately |

### 5.2 Injections and ablation

Imaging guidance is included in these codes and is never billed separately.

| The note documents | Codes |
| --- | --- |
| Interlaminar epidural, cervical or thoracic / lumbar or sacral | 62321 / 62323 |
| Transforaminal epidural, lumbar or sacral | 64483, + 64484 per additional level; RT, LT, or 50 |
| Transforaminal epidural, cervical or thoracic | 64479, + 64480 per additional level |
| Facet joint or medial branch block, lumbar or sacral | 64493, + 64494 (second level), + 64495 (third level); 50 when bilateral |
| Facet joint or medial branch block, cervical or thoracic | 64490, + 64491, + 64492 |
| Radiofrequency ablation, lumbar or sacral / cervical or thoracic | 64635 + 64636 / 64633 + 64634 per additional level |
| Sacroiliac joint injection with imaging | 27096 (payer exceptions set at sign-off) |
| Trigger point injections | 20552 (1–2 muscles), 20553 (3 or more) |
| Drug supplied by the clinic for an office injection | J-code with units from the dose (for example J3301 per 10 mg triamcinolone). Not billed when the injection is done at a hospital or surgery center |

### 5.3 Decompression

| The note documents | Codes |
| --- | --- |
| Lumbar laminotomy and discectomy (microdiscectomy), one interspace | 63030, + 63035 per additional interspace |
| Cervical posterior laminotomy or foraminotomy, one interspace | 63020, + 63035 |
| Repeat decompression at a previously operated level | 63042 lumbar or 63040 cervical, + 63044 or 63043 |
| Far lateral lumbar disc | 63056, + 63057 |
| Laminectomy with facetectomy or foraminotomy (stenosis) | 63047 lumbar, 63046 thoracic, 63045 cervical, + 63048 per additional segment |
| Laminectomy without facetectomy | 63001, 63003, 63005 (1–2 segments); 63015, 63016, 63017 (more than 2) |
| Cervical laminoplasty | 63050; 63051 with reconstruction |
| Anterior cervical discectomy without fusion | 63075, + 63076 |
| Corpectomy | 63081 + 63082 cervical; 63085–63091 thoracic and lumbar by approach |
| Operating microscope | 69990 only where NCCI allows it (it is bundled into 63030, 63047, and 22551, among others) |

### 5.4 Fusion, instrumentation, and graft

| The note documents | Codes |
| --- | --- |
| ACDF below C2 | 22551, + 22552 per additional interspace (discectomy is included; no 63075) |
| Cervical disc replacement | 22856, + 22858 for a second level |
| Posterior cervical fusion | 22600, + 22614 per additional segment |
| Posterolateral lumbar fusion | 22612, + 22614 |
| Posterior interbody fusion only (PLIF/TLIF without posterolateral fusion) | 22630, + 22632 per additional interspace |
| Interbody plus posterolateral fusion at the same interspace (typical TLIF) | 22633, + 22634 |
| Anterior or lateral lumbar interbody fusion (ALIF, XLIF/LLIF) | 22558, + 22585 |
| Interbody cage | 22853 per interspace; 22854 for a corpectomy defect; 22859 without fusion |
| Posterior instrumentation | 22840 (across one interspace), 22842 (3–6 vertebral segments), 22843 (7–12), 22844 (13 or more) |
| Anterior instrumentation (plate) | 22845 (2–3 vertebral segments), 22846 (4–7), 22847 (8 or more) |
| Bone graft | 20936 local autograft, 20937 morselized autograft through a separate incision, 20938 structural autograft, 20930 morselized allograft, 20931 structural allograft, 20939 bone marrow aspirate. The fee schedule status decides which are payable; Medicare bundles some |
| Navigation | 61783 |
| Decompression beyond what the fusion needs | 63047/63048 with the modifier NCCI allows, only when the note documents a separate decompression. The documentation standard is set at sign-off |
| Fusion exploration, hardware removal | 22830; 22850 posterior non-segmental, 22852 posterior segmental, 22855 anterior |
| Kyphoplasty, vertebroplasty | 22513 thoracic, 22514 lumbar, + 22515; 22510, 22511, + 22512 |
| Sacroiliac joint fusion | 27279 minimally invasive, 27280 open |
| Spinal cord stimulator | 63650 per percutaneous lead, 63655 paddle by laminectomy, 63685 generator; removal and revision 63661–63664, 63688 |
| Deformity | 22800, 22802, 22804 posterior; 22808, 22810, 22812 anterior; osteotomies 22206–22226 |

Surgery modifiers: 22 (substantially more work, documented), 62 (co-surgeon,
such as an access surgeon on an ALIF), 80, 82, or AS (assistant, where the fee
schedule allows one), 58, 78, 79 (global period), and RT, LT, 50.
Neuromonitoring is billed by the monitoring provider, not the surgeon.

### 5.5 Diagnoses

| The note documents | ICD-10-CM |
| --- | --- |
| Disc herniation with radiculopathy | Cervical by level: `M50.121` C4-C5, `M50.122` C5-C6, `M50.123` C6-C7 (others in `M50.1-`). `M51.14` thoracic, `M51.15` thoracolumbar, `M51.16` lumbar, `M51.17` lumbosacral (L5-S1) |
| Disc herniation with myelopathy | `M50.0-` cervical by level; `M51.04`–`M51.06` |
| Disc degeneration | `M50.3-` cervical by level; `M51.36-` lumbar and `M51.37-` lumbosacral, by back pain and leg pain |
| Stenosis | `M48.02` cervical, `M48.04` thoracic, `M48.061` lumbar without and `M48.062` with neurogenic claudication, `M48.07` lumbosacral |
| Spondylosis | `M47.81-` without myelopathy or radiculopathy, `M47.1-` with myelopathy, `M47.2-` with radiculopathy, by region |
| Spondylolisthesis, spondylolysis | `M43.1-`, `M43.0-` by region |
| Radiculopathy without a disc or spondylosis cause | `M54.1-` by region |
| Back and neck pain | `M54.50`, `M54.51`, `M54.59` (`M54.5` was retired in 2021); sciatica `M54.3-`/`M54.4-` by side; neck pain `M54.2` |
| Scoliosis | `M41.12-` adolescent idiopathic, `M41.2-` other idiopathic, `M41.8-` other, by region |
| Fracture | `S12`, `S22`, `S32` by level and type; `M80.08X-` osteoporotic; `M84.58X-` from a tumor; `M48.5-` collapsed vertebra; 7th character from encounter and healing status |
| After surgery | `M96.1` postlaminectomy syndrome, `M96.0` pseudarthrosis, `T84.2--` hardware failure, `T84.7XX-` implant infection, `T84.84X-` implant pain, `G97.41` dural tear, `Z98.1` fusion status, `Z47.89` aftercare |
| Injury | Plus external-cause codes for cause, place, activity, and status (`Y99.0` for work) |
| History only | `Z85`, `Z86`, `Z87` history codes; never the active condition |
| Negated, ruled out, or suspected | Not coded; the signs and symptoms are coded instead |

## 6. Edge cases the rules and tests must cover

- **Levels written many ways:** "L4-5", "L4-L5", "L4/5", "L45", "L4 to L5",
  "four-five". Ranges such as "L3-S1" (3 interspaces, 4 vertebral segments).
  Transitional anatomy (sacralized L5, L6) is flagged for manual coding.
- **Laterality:** left, right, bilateral, "both sides". RT/LT versus 50 per the
  fee schedule. A diagnosis side that does not match the procedure side is
  flagged.
- **Negation and uncertainty:** "denies", "no evidence of", "ruled out",
  "concern for", "possible", "r/o".
- **History versus current:** "history of breast cancer", "s/p L4-5 fusion
  2019" (`Z98.1`, not a new fusion).
- **Planned versus performed:** "recommend", "will schedule", "consented
  for", "plan: ACDF" never produce procedure codes.
- **Multi-procedure op notes:** decompression and fusion at different levels,
  ACDF with corpectomy, staged surgeries on different days, co-surgeons.
- **Revisions:** extension of a prior fusion, hardware removal with
  re-instrumentation, pseudarthrosis repair, repeat decompression.
- **Global periods:** post-op visits inside and outside the global, visits for
  complications (wound infection, spinal fluid leak), and unrelated new
  problems.
- **Injection sequences:** first and second medial branch block, ablation
  after two blocks, bilateral and multi-level facet and transforaminal
  injections, epidural injection frequency.
- **Trauma:** fractures with 7th characters, external causes, work and auto
  injuries, central cord syndrome.
- **Other spine care:** adolescent scoliosis, metastatic tumor (active versus
  history), discitis, osteomyelitis, epidural abscess.
- **Hard notes:** Spanish-language notes, heavy abbreviations, near-empty
  notes, and notes with codes typed in. Typed codes are checked like any
  other code, not trusted.
- **Payer differences:** Medicare, commercial, workers' comp, and no-fault
  (consult codes, sacroiliac injection codes, assistant surgeon, graft
  payment).

## 7. Sign-off by Dr. Francois

With no certified coder, the rules must be easy for a surgeon to check.

- **Each rule reads as a sentence.** A rule in `data/coding/spine-rules/` has
  an id, a plain-English sentence, its conditions, the codes it produces, a
  sample note excerpt, and the expected output. For example: "When the op
  note documents an L4-L5 TLIF with L4-L5 pedicle screws and one cage, bill
  22633, 22840, and 22853, with the spondylolisthesis and stenosis diagnoses
  on each line."
- **Review page.** A read-only admin page (for example
  `/admin/operations/coding-rules`) lists each rule set (office visits,
  injections, decompression, fusion, diagnoses) with the sentences, sample
  outputs, and current test results. Dr. Francois approves a rule set with
  one action. The approval is saved to `audit_log` with the rule-set version,
  his user ID, and the time.
- **Only approved rules suggest codes.** Unapproved rules are ignored. Staff
  can still add codes by search.
- **Changes reset approval.** Editing a rule, or a quarterly CMS refresh that
  changes a code it uses, puts that rule set back to "needs review" and shows
  what changed.
- **Risk.** Without a coder, nobody checks the rules independently, and the
  billing risk sits with the practice. A one-time outside audit of the first
  25–50 claims would catch systematic errors cheaply.

## 8. Testing and the acceptance gate

### Tests

- **Coder tests (`tests/spine-coding.test.ts`, vitest).** Inputs are facts,
  not notes, so they run in milliseconds and never call OpenAI. The 60
  baseline notes are run through extraction once, the facts are checked by
  hand, and the checked facts become the first fixtures. Real notes and
  doctor edits are added the same way.
- **Validator tests (`tests/coding-validator.test.ts`).** A set of known-bad
  claims must all be caught: an NCCI pair without a modifier, units over the
  MUE, an add-on without its primary, a visit inside a global period without
  99024 or a modifier, 13 diagnoses, 5 pointers on a line, a retired code, and
  a missing 7th character.
- **Extraction check (`scripts/eval-extraction.ts`).** Runs the extraction
  call on the note set and compares facts to the answer key. It costs API
  calls and varies run to run, so it runs before any prompt or model change,
  not on every build.
- **Old tests.** `tests/encounters.test.ts` currently asserts the keyword
  scorer's behavior (the 10-point code-token bonus, a score of 2 being level
  1, and refusing to approve an unsuggested code). Those tests are removed
  along with the scorer.
- **Running them.** The repo has no CI workflow. Add the coder and validator
  tests to the `build` script so Vercel will not deploy a failing rule.

### Gate before a rule set suggests codes

- **Note set:** at least 150 de-identified real notes across office visits,
  injections, and operative reports, each with the codes Dr. Francois
  confirms were correct. As of 2026-10-22 the app holds 2 real visit notes
  and no op reports, so most of the set has to come from the hospital or
  surgery center records and past claims.
- **Must be zero:** non-billable or retired codes; codes from negated, ruled
  out, suspected, or history-only findings; procedure codes for procedures not
  performed; add-ons without their primary; suggestions without a verified
  quote.
- **Accuracy (proposed; Dr. Francois sets the final bar):** first procedure
  line exactly right (code, units, modifiers) in at least 95% of notes; all
  procedure lines in at least 90%; first-listed diagnosis in at least 95%;
  all diagnoses in at least 90%.
- **Validator:** catches every known-bad claim in its test set.
- **After launch:** a weekly report of doctor edits by rule set. A rule set
  whose suggestions are edited more than 10% of the time in a week is turned
  off until fixed. Reviewed edits become new test cases.

## 9. Rollout

Effort is a rough estimate for one engineer.

| Phase | Scope | Effort |
| --- | --- | --- |
| Now | Code claims by hand in Billing → Claims → New claim. Ignore suggested codes in the visit desk | — |
| 0. Safe manual coding | Turn off suggestions in `runVisitPipeline`. Code search over a one-time import of the CMS ICD-10-CM and fee schedule files (the refresh script comes in phase 1). Approval accepts any valid code. Units, modifiers, and pointers carry into the claim. Payer type sets the claim filing code. Diagnosis and pointer limits. Bill as The Alignment Clinic (org + EIN) with Dr. Francois as rendering. Claim form CMS search + Ready-for-bill `/api/coding/check`. Add `store: false` to the OpenAI note call | **Live 2026-10-22** (`66d9f73`) |
| 0b. NCCI validator | Spine-subset PTP + MUE + add-on primaries in `claimCodeProblems`; Policy Manual PDFs in repo; `/dev/coding-data` tracks sources | **Built 2026-10-22** (this commit) |
| 1. Library and validator | Note editing and the "paste operative report" path. Server record of claims (or the full submission snapshot). Rule review page. Expand PTP beyond spine subset if needed | Remaining ~1 week |
| 2. Core spine rules | Fact extraction. Rules for office and post-op visits, injections and ablation, decompression, ACDF, lumbar fusion, kyphoplasty, and diagnoses. Review screen with reasons and quotes. Regression tests | 1–2 weeks |
| 3. Turn on, rule set by rule set | Collect the note set, pass the gate, get Dr. Francois's sign-off, enable. Weekly edit review | Depends on collecting notes |
| 4. Long tail | Deformity, revisions and hardware, stimulators, trauma, tumor, infection. Workers' comp and no-fault details. Prior authorization tracking | Ongoing |

### Phase 0 as built (2026-10-22)

- **No suggestions.** The pipeline transcribes, writes the note, and stops at
  review with no codes. The keyword coder (`lib/encounters/codes.ts`,
  `catalog.ts`) and its two data files are deleted. Unapproved suggestions on
  older visits are hidden and are dropped the next time the visit is saved.
- **Code library.** `scripts/refresh-coding-data.ts` was needed for the
  one-time import, so it exists now. Phase 1 adds the change report and rule
  checks. It wrote `data/coding/icd10cm.json` (ICD-10-CM FY2027 order file:
  98,403 codes, 74,879 billable) and `data/coding/procedures.json` (19,358
  codes from the October 2026 fee schedule file `PPRRVU2026_Oct_nonQPP.csv` and
  the October 2026 HCPCS file), each with the release, start date, and source
  file SHA-256. HCPCS end dates win over the fee schedule: 10 Level II drug
  codes the October fee schedule still lists (J0640 and others) ended
  2026-09-30 and are left out. J1030 ended 2024-03-31; 40 mg of
  methylprednisolone acetate is J1010 × 40 units.
- **To rebuild the code files,** unzip these three downloads:
  - [ICD-10-CM 2027 descriptions](https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2027/icd10cm-code-descriptions-2027.zip)
  - [PFS RVU26D](https://www.cms.gov/files/zip/rvu26d-updated-08-26-2026.zip)
  - [October 2026 HCPCS](https://www.cms.gov/files/zip/october-2026-alpha-numeric-hcpcs-file.zip)

  Then run, under Node 22:

  ```sh
  node --experimental-strip-types scripts/refresh-coding-data.ts \
    --icd icd10cm-order-2027.txt --icd-release "ICD-10-CM FY2027" --icd-from 2026-10-01 \
    --pfs PPRRVU2026_Oct_nonQPP.csv --hcpcs HCPC2026_OCT_ANWEB_09232026.txt \
    --procedures-release "the October 2026 CMS fee schedule and HCPCS files" --procedures-from 2026-10-01
  ```
- **CPT and dental codes are numbers only (open question 4).** Their
  descriptions are not stored. ICD-10-CM and HCPCS Level II descriptions are
  public and are shown. A test fails if a CPT or D code ever gets a
  description.
- **Visit review.** Search (`/api/coding/search`) offers billable codes only,
  by code prefix or by the start of words, and flags add-on codes, global
  days, and Medicare status (bundled, not valid, not covered). The doctor
  orders the diagnoses (the first is the main one) and adds procedure lines
  with units (whole number 1–999), up to 4 modifiers, and 1–4 linked
  diagnoses. Approval refuses a category code and names billable codes under
  it, refuses codes not in the release, and enforces 12 diagnoses and 50
  lines. Modifiers are checked for form only, because CPT modifiers are not in
  the CMS files.
- **Claim hand-off.** The claim form copies each approved line's units,
  modifiers, and diagnoses. A visit approved before this change has no
  per-line diagnoses, so its lines point at every approved diagnosis, as
  before, and the 4-per-line limit then asks staff to trim them.
- **Claim form CMS search (evening of 2026-10-22).** Diagnoses and procedures
  are picked from the same search as the visit desk (not free-typed).
  Claim-level diagnoses with per-line checkboxes. CPT on the form is
  pick-only. Shared component: `components/admin/code-search.tsx`.
- **Payer type.** Required for Ready for bill and for submission. The choices
  are Stedi claim filing codes: CI, BL, FI, 12, HM, 13, 14, MB, 16, MC, WC, AM,
  LM, CH, VA, and OF. Claims saved before this change have none, so Submit
  refuses them until the type is set through Edit charges.
- **Check before Ready and before Stedi (part of the phase 1 validator, pulled
  forward).** Ready for bill calls `POST /api/coding/check`.
  `submitProfessionalClaim` runs the same library checks plus line/filing
  rules. Refuses: no payer type; units of 0 or less; a billed line with no
  diagnosis or more than 4; more than 12 diagnoses or 50 lines; a procedure
  not in the release; a non-billable ICD-10-CM code; a malformed modifier.
  Lists every problem at once. Code checks apply only to dates of service on
  or after 2026-10-01. NCCI pairs, MUE limits, and add-on primaries are still
  phase 1. A line with no diagnosis is no longer sent with pointer 1.
- **OpenAI.** The note call sends `store: false`.
- **Billing identity (corrected same evening).** Claims bill as The Alignment
  Clinic (`organizationName` + Practice-page EIN). Dr. Francois is the rendering
  provider on each line. An earlier same-day change that billed him as an
  individual was reverted.
- **Checked.** vitest: everything passes except the `tests/secrets.test.ts`
  allowlist failure that was already there (the files that trip it are the
  same at HEAD).
  `next build` passes, and the trace files for the search route, the visit
  approval route, and the claim page all contain both data files. `tsc` shows
  only the `LayoutProps` errors that were already there.

## 10. Files that change

| File | Change |
| --- | --- |
| `lib/encounters/codes.ts`, `lib/encounters/catalog.ts` | Replaced by `lib/coding/library.ts`, `extract.ts`, `spine.ts`, `validate.ts` |
| `data/coding/icd10-cm/flattened-codes.json`, `data/coding/cpt1-hcpcs/codes.json` | Replaced by the files in section 4.1 |
| `scripts/refresh-coding-data.ts`, `scripts/eval-extraction.ts` | New |
| `lib/encounters/pipeline.ts` | `codeNote` becomes async (extraction, then rules) and saves facts, lines, and code-set version |
| `lib/encounters/types.ts`, `lib/encounters/store.ts` | New fields from section 4.8 |
| `lib/encounters/approve.ts`, `app/api/encounters/[id]/route.ts` | Approve any valid code, save edits and note text, run the validator |
| `lib/encounters/template.ts`, `lib/encounters/openai.ts` | Operative template; extraction call (with PDF input); `store: false` on every call that carries patient data |
| `components/admin/visit-desk.tsx` | Review screen (section 4.6), note editing, paste operative report |
| `components/admin/rcm/claim-form.tsx`, `lib/rcm/types.ts` | Carry approved lines; payer type, prior authorization, place of service |
| `lib/stedi/payload.ts`, `app/admin/stedi/actions.ts` | Claim filing code, injury fields, prior authorization, frequency code, provider identity, validator before submission, full snapshot |
| `supabase/migrations/<date>_encounter_coding.sql` | Columns from section 4.8, and a claims table if chosen |
| `next.config.ts` | Trace `data/coding/**` for every route that uses it |
| `app/admin/operations/coding-rules/` | Rule review page |
| `tests/encounters.test.ts` | Remove tests that assert the keyword scorer |
| `tests/spine-coding.test.ts`, `tests/coding-validator.test.ts` | New |
| `package.json` | Run the coding tests in `build` |

## 11. Open questions

1. **Enrollment — corrected 2026-10-22 (evening).** Claims bill as The
   Alignment Clinic with its EIN (not Dr. Francois as an individual). He is
   still out of network with every payer. Still needed: confirm the EIN on
   the Practice page matches the W-9 payers have; a type 2 clinic NPI (the
   current Practice NPI is his type 1 — Anas will look it up 2026-10-23); an
   NPPES address update to New York; and Stedi enrollment for electronic
   remittance (835) with each payer if payments should post automatically.
2. **Payers — answered 2026-10-22 (Christina).** Out of network everywhere.
   Most patients pay privately. Commercial payers are billed occasionally,
   when the plan has out-of-network benefits. Medicare and Medicaid are not
   expected. So commercial payers come first. Medicare-only features (Medicare
   fee schedule, ABN) and the workers' comp and no-fault claim fields
   ("Injury claims" in section 2, phase 4) wait. The first real test patient
   has Fidelis Care, whose plans are mostly New York Medicaid managed care,
   Essential Plan, Child Health Plus, and Medicare Advantage. Check her plan's
   out-of-network benefits before billing it.
3. **Operative reports — open; office reports found 2026-10-22.** Dr.
   Francois writes consultation and follow-up reports that reach the office as
   documents, and billing has nowhere labeled to file them (section 13). They
   are the source for coding office visits and the records payers ask for on
   out-of-network claims. Hospital and surgery center op reports are still
   open: which facilities does he operate at, and can their op reports be
   exported as PDFs?
4. **CPT / AMA data — open; this is the main access gap for exact rules.**
   No AMA license in the workspace. Without it we can still enforce CMS
   edits (NCCI, MUE, fee schedule, ICD-10-CM) and show CPT *numbers* only.
   We cannot store or display AMA CPT long descriptions, CPT parenthetical
   inclusion/exclusion text, CPT Assistant Q&As, or the CPT E/M MDM/time
   tables in the product. Get: AMA CPT Data File (or Codify/Encoder Pro
   enterprise feed that includes a redistribution right for this app).
   Until then phase 0 keeps CPT and dental code numbers only.
5. **OpenAI — answered 2026-10-22.** A BAA is in place, and the note call
   sends `store: false` (phase 0). Still to do: confirm zero data retention
   and that the BAA covers both endpoints in use (section 3).
6. **Claims storage — open.** A server claims table, or only a fuller
   submission snapshot?
7. **Charges — answered in part 2026-10-22.** An out-of-network practice
   charges its own fees. Christina says payer fee schedules (Medicare, state
   no-fault, workers' comp) are for in-network doctors and are not needed for
   Dr. Francois. A practice fee list per code would still remove a manual step.
8. **Assignment of benefits — open (new 2026-10-22).** Every claim says Dr.
   Francois accepts assignment and the patient assigned benefits to him
   (`planParticipationCode: "A"`, `benefitsAssignmentCertificationIndicator:
   "Y"` in `lib/stedi/payload.ts`). That fits a patient who has not paid yet.
   When a patient who paid privately has the office file for them, the claim
   should say benefits are not assigned, so the payer reimburses the patient,
   and should report what the patient paid. Ask Christina which case is normal.

## 12. Cleanup from the 2026-10-22 test run

- 25 test visits titled "QA TEST" are in the live visit desk. The app cannot
  delete visits that have notes, so they must be removed from the
  `encounters` table directly.
- The one real patient visit in the visit desk that day was coded `M96.A` (a
  non-billable parent code) and `97039`. Recode it by hand before billing.
  With phase 0, saving that visit or submitting its claim refuses `M96.A`.
- The admin password was shared in chat during testing and should be rotated.

## 13. Requests from billing (Christina, 2026-10-22)

Checked against the code the same day. Status per item below.

- **State of residence as a dropdown — not built.** This is also a claim bug.
  The state is free text in chart demographics and in the portal intake form,
  and the new-patient form has no address fields but saves every patient with
  state `GA`. The claim sends the first two letters, so "New York" goes out as
  `NE` and an unedited new patient goes out as Georgia. Use a two-letter state
  list, and refuse a claim whose state is not a valid code.
- **Diagnosis codes from a list — claim form done 2026-10-22 (evening).** The
  claim form uses the same CMS search as the visit desk for diagnoses and
  procedures, with claim-level diagnoses and per-line checkboxes. Ready for
  bill calls `/api/coding/check` (same library checks as submission). The
  chart's problem list ICD box is still free text.
- **Physician notes in the chart — not built (workaround exists).** For now:
  patient chart → Files → "Add an item", name it "Physician notes", then
  upload. That takes a PDF, photo, or video, so a Word report must be saved as
  PDF first. To build: a standing "Physician notes" item in
  `defaultDocuments()` (`lib/rcm/chart.ts`).
- **Eligibility for out-of-network benefits — not built.** The check exists
  (Eligibility page), but `summarizeEligibility` (`lib/stedi/parse.ts`) takes
  the first copay, coinsurance, and deductible in the response and never reads
  the in-network or out-of-network flag. For this practice it can show
  in-network amounts and cannot say whether the plan pays out of network at
  all. The request already names "The Alignment Clinic"; once a type 2 clinic
  NPI is on the Practice page, eligibility and claims will both use it.
