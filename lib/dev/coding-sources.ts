/**
 * Partner checklist: every data set required for exact spine coding + claim checks.
 * Status reflects the elvis-practice workspace as of the last plan update.
 */

export type SourceStatus = "have" | "need_free" | "need_paid" | "optional" | "practice";

export type CodingSource = {
  id: string;
  name: string;
  status: SourceStatus;
  whatItGives: string;
  where: string;
  url: string;
  fileOnDisk?: string;
  refresh: string;
  notes?: string;
};

export type SourceGroup = {
  id: string;
  title: string;
  lede: string;
  items: CodingSource[];
};

export const statusLabel: Record<SourceStatus, string> = {
  have: "On disk",
  need_free: "Need — free download",
  need_paid: "Need — paid license",
  optional: "Optional for now",
  practice: "Practice must provide",
};

export const codingSourceGroups: SourceGroup[] = [
  {
    id: "have",
    title: "Already in the app",
    lede: "Loaded into data/coding/ and used for search, approval, and claim checks today (local Phase 0; deploy when ready).",
    items: [
      {
        id: "icd10cm",
        name: "ICD-10-CM order file (FY2027)",
        status: "have",
        whatItGives: "Every diagnosis code, full description, billable vs category flag. Blocks non-billable codes (e.g. M96.A, M54.5).",
        where: "CDC / NCHS ICD-10-CM code descriptions zip → icd10cm-order-*.txt",
        url: "https://ftp.cdc.gov/pub/Health_Statistics/NCHS/Publications/ICD10CM/2027/icd10cm-code-descriptions-2027.zip",
        fileOnDisk: "data/coding/icd10cm.json",
        refresh: "Each October (and any April update)",
      },
      {
        id: "icd-guidelines",
        name: "ICD-10-CM Official Guidelines for Coding and Reporting",
        status: "have",
        whatItGives: "Exact rules for 7th characters, sequela, laterality, “code also”, history vs active, and what not to code from ruled-out findings.",
        where: "CMS / CDC ICD-10-CM files (PDF with the annual release)",
        url: "https://www.cms.gov/medicare/coding-billing/icd-10-codes",
        refresh: "Annual with the ICD-10-CM release",
        notes: "Guidelines are the diagnosis rule book. The order file is the code list.",
      },
      {
        id: "pfs",
        name: "CMS Physician Fee Schedule RVU file (Oct 2026)",
        status: "have",
        whatItGives: "Active CPT/HCPCS numbers, status indicator, global days (ZZZ = add-on), bilateral and multiple-procedure indicators.",
        where: "CMS RVU zip → PPRRVU*_nonQPP.csv",
        url: "https://www.cms.gov/files/zip/rvu26d-updated-08-26-2026.zip",
        fileOnDisk: "data/coding/procedures.json (merged with HCPCS)",
        refresh: "Quarterly",
        notes: "CMS short labels only. Not a substitute for AMA CPT long descriptors.",
      },
      {
        id: "hcpcs",
        name: "HCPCS Level II alpha-numeric file (Oct 2026)",
        status: "have",
        whatItGives: "Drug/supply codes (J-codes), long descriptions, termination dates (e.g. J1030 ended → use J1010).",
        where: "CMS HCPCS zip → HCPC*_ANWEB_*.txt",
        url: "https://www.cms.gov/files/zip/october-2026-alpha-numeric-hcpcs-file.zip",
        fileOnDisk: "data/coding/procedures.json",
        refresh: "Quarterly",
      },
    ],
  },
  {
    id: "cms-ncci",
    title: "CMS NCCI pack — get these next (free)",
    lede: "These are the exact Medicare edit files. Commercial payers usually follow them. Download the Practitioner (not Hospital) editions.",
    items: [
      {
        id: "ncci-ptp",
        name: "Medicare NCCI Practitioner PTP edits",
        status: "have",
        whatItGives: "Exact pairs that must not be billed together, plus whether a modifier (59/X{EPSU}) can override.",
        where: "CMS → Medicare NCCI → Procedure-to-Procedure (PTP) Edits → Practitioner PTP Edits ZIP (v323r0, Oct 2026)",
        url: "https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-procedure-procedure-ptp-edits",
        fileOnDisk: "data/coding/ncci-ptp.json (spine-relevant pairs only; ~46k rows)",
        refresh: "Quarterly",
        notes: "Full practitioner PTP is millions of rows. We keep pairs where both codes are spine-relevant so Vercel stays fast.",
      },
      {
        id: "ncci-mue",
        name: "Medicare NCCI Practitioner MUE table",
        status: "have",
        whatItGives: "Exact maximum units of service per day for each code.",
        where: "CMS → Medicare NCCI → Medically Unlikely Edits → Practitioner Services MUE Table ZIP",
        url: "https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-medically-unlikely-edits",
        fileOnDisk: "data/coding/mue.json",
        refresh: "Quarterly",
        notes: "Some MUE values are confidential and not in the public file.",
      },
      {
        id: "ncci-addon",
        name: "Medicare NCCI Add-on Code edits",
        status: "have",
        whatItGives: "Exact list of which primary codes an add-on (e.g. 64484, 22552, 22853) may be billed with.",
        where: "CMS → Medicare NCCI → Add-on Code Edits (effective 2026-10-01)",
        url: "https://www.cms.gov/medicare/coding-billing/national-correct-coding-initiative-ncci-edits/medicare-ncci-add-code-edits",
        fileOnDisk: "data/coding/addon-primaries.json",
        refresh: "Quarterly",
      },
      {
        id: "ncci-manual",
        name: "NCCI Policy Manual for Medicare Services (2024)",
        status: "have",
        whatItGives: "Chapter narrative for spine bundling (microscope 69990, decompression with fusion, etc.).",
        where: "CMS NCCI downloads — Policy Manual ZIP",
        url: "https://www.cms.gov/files/zip/medicare-ncci-policy-manual-2024.zip",
        fileOnDisk: "docs/spine-coding/ncci-policy-manual-2024/",
        refresh: "Annual / when CMS revises chapters",
        notes: "PDF chapters for humans and future TypeScript rules; PTP/MUE remain the machine edits.",
      },
    ],
  },
  {
    id: "ama",
    title: "AMA CPT — paid (only wall for AMA-exact procedure text)",
    lede: "Without this we keep CPT as numbers only and enforce CMS edits. With this we can show official descriptors, inclusion/exclusion language, and E/M tables.",
    items: [
      {
        id: "ama-data-file",
        name: "AMA CPT Standard Data File (distributor license)",
        status: "need_paid",
        whatItGives: "Official CPT codes + long descriptors for use inside Clinix’s product (search, display, retrieval).",
        where: "AMA CPT licensing → distributor / Data File application (Clinix as software vendor)",
        url: "https://www.ama-assn.org/practice-management/cpt/cpt-licensing-frequently-asked-questions-faqs",
        refresh: "Annual release + quarterly updates per AMA",
        notes:
          "A bookstore CPT Professional book or a clinic Codify seat is NOT enough for the app. Apply via AMA compliance portal; ask for display + retrieval-based AI rights (training on CPT is prohibited).",
      },
      {
        id: "ama-apply",
        name: "AMA CPT license applicant portal",
        status: "need_paid",
        whatItGives: "Where to submit the licensing application and contact a CPT licensing specialist.",
        where: "AMA Intelligent Platform / compliance help center",
        url: "https://compliance.ama-assn.org/hc/en-us/categories/1500000211461-Information-for-CPT-License-Applicants",
        refresh: "One-time application; renewals via Royalties Portal",
      },
      {
        id: "ama-pricing",
        name: "2026 CPT distribution pricing schedule",
        status: "need_paid",
        whatItGives: "Royalty models so we can estimate cost before signing.",
        where: "AMA compliance notice",
        url: "https://compliance.ama-assn.org/hc/en-us/articles/15166274293399-Notice-Standard-CPT-Distribution-Pricing-Schedule-2026",
        refresh: "Annual schedule",
      },
      {
        id: "cpt-assistant",
        name: "CPT Assistant (optional after Data File)",
        status: "optional",
        whatItGives: "Official Q&A on hard spine choices (e.g. 22633 vs 22612+22630).",
        where: "AMA / authorized encoder that includes CPT Assistant with redistribution rights",
        url: "https://www.ama-assn.org/practice-management/cpt",
        refresh: "Ongoing AMA publications",
        notes: "Nice-to-have for edge cases; Data File + NCCI cover most automation.",
      },
    ],
  },
  {
    id: "coverage",
    title: "Coverage / payer policy (optional while mostly self-pay)",
    lede: "Christina: out of network, mostly private pay, occasional commercial, no Medicare/Medicaid expected. Pull these when a payer requires them.",
    items: [
      {
        id: "lcd-ncd",
        name: "Medicare Coverage Database (LCD/NCD) — NGS New York",
        status: "optional",
        whatItGives: "Exact Medicare coverage for ESI, medial branch blocks, RFA frequency, etc.",
        where: "CMS Medicare Coverage Database; contractor National Government Services (NY)",
        url: "https://www.cms.gov/medicare-coverage-database",
        refresh: "When LCDs revise",
        notes: "Defer until they bill Medicare. Commercial plans often mirror these.",
      },
      {
        id: "payer-manuals",
        name: "Commercial payer manuals (Fidelis, etc.)",
        status: "optional",
        whatItGives: "Out-of-network benefits, consult codes, SI injection quirks.",
        where: "Each payer’s provider portal — after Christina names the plans",
        url: "https://www.cms.gov/medicare-coverage-database",
        refresh: "Per payer",
        notes: "Confirm the Fidelis test patient’s plan type before billing (many Fidelis products are Medicaid MC / Essential Plan / MA).",
      },
    ],
  },
  {
    id: "practice",
    title: "Practice / product data (not a download)",
    lede: "Needed so generation and claims match reality. Not CMS files — the clinic and Clinix supply these.",
    items: [
      {
        id: "type2-npi",
        name: "Type 2 / organization NPI for The Alignment Clinic",
        status: "practice",
        whatItGives: "Billing NPI that matches organization name + EIN (Practice page today has type 1 1114306040).",
        where: "NPPES / clinic W-9 / credentialing packet",
        url: "https://npiregistry.cms.hhs.gov/",
        refresh: "Once; keep NPPES address current (NY)",
      },
      {
        id: "ein",
        name: "Clinic EIN matching the W-9",
        status: "practice",
        whatItGives: "Tax ID on every 837P as The Alignment Clinic.",
        where: "Practice page + IRS W-9 payers have on file",
        url: "https://www.irs.gov/",
        refresh: "Confirm once",
      },
      {
        id: "notes-corpus",
        name: "De-identified real notes + op reports with correct codes",
        status: "practice",
        whatItGives: "Fixtures to prove extraction + rules. Plan gate ~150 notes; app has ~2 visit notes and no op reports in Supabase.",
        where: "Hospital / ASC exports + past office consult/follow-up PDFs",
        url: "/admin/operations/visits",
        refresh: "Ongoing as cases close",
      },
      {
        id: "openai-retention",
        name: "OpenAI zero-retention confirmation",
        status: "practice",
        whatItGives: "BAA exists; confirm ZDR covers /v1/audio/transcriptions and /v1/responses. App sends store: false on note calls.",
        where: "OpenAI account / BAA paperwork",
        url: "https://openai.com/policies/business-terms/",
        refresh: "Confirm once",
      },
    ],
  },
];

export const leastResistanceSteps = [
  {
    step: 1,
    title: "CMS NCCI pack (free) — on disk",
    detail: "Practitioner PTP spine subset (~46k pairs), Practitioner MUE, Add-on Code edits, and the 2024 Policy Manual PDFs. Refresh with scripts/refresh-ncci-data.ts. Full PTP is millions of rows; spine-relevant pairs keep Vercel fast.",
  },
  {
    step: 2,
    title: "Phase 0 — live in production",
    detail: "Suggestions off, CMS search on visit + claim, Ready-for-bill + Stedi library checks, bill as The Alignment Clinic + EIN. Shipped 2026-10-22 (commit 66d9f73).",
  },
  {
    step: 3,
    title: "NCCI/MUE/add-on validator — wired",
    detail: "claimCodeProblems fails closed on NCCI pairs, over-MUE units, and add-ons without a listed primary. Same checks on Ready for bill and Stedi submit.",
  },
  {
    step: 4,
    title: "Next — fact extract + rules (office slice first)",
    detail:
      "Start with office / consult / post-op only (then ESI/MBB, then one surgery). " +
      "lib/coding/extract.ts: gpt-5-mini facts + quotes only, drop facts whose quote is missing, store: false. " +
      "lib/coding/spine.ts + data/coding/spine-rules/office.json: facts → CPT/ICD numbers → claimCodeProblems. " +
      "Visit desk suggestions stay off by default until fixtures pass. Do not wait on AMA; do not call Scribe coding-svc or ClaimX. " +
      "Parallel: real consult notes, AMA distributor license, type 2 clinic NPI. Full write-up: docs/spine-coding/plan.md §0.1.",
  },
  {
    step: 5,
    title: "AMA CPT Standard Data File (distributor) when ready",
    detail: "Official descriptors, inclusion text, E/M tables in the product. Apply as Clinix — not a clinic Codify seat.",
  },
];

export const architectureBlurb = {
  title: "How generation stays impenetrable",
  points: [
    "OpenAI (gpt-5-mini) extracts clinical facts and quotes — never invents CPT/ICD.",
    "TypeScript rules map facts → code numbers using CMS (+ AMA text when licensed).",
    "Validator refuses anything not billable, not in the fee schedule, over MUE, NCCI-paired without a modifier, or an add-on without its primary.",
    "Doctor/biller still reviews. Ready for bill and Stedi both re-run the same checks.",
    "No ClaimX. No separate Clinix coding-svc. Everything runs inside this Vercel app.",
  ],
};
