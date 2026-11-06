/**
 * HIPAA BAA & go-live compliance inventory for The Alignment Clinic.
 * Sourced from the practice zero stakeholder brief (26 Oct 2026) against
 * elvis-practice production architecture. Not legal advice.
 */

export type BaaStatus = "required" | "blocked" | "keep-off-phi";

export type VendorBaa = {
  id: string;
  party: string;
  role: string;
  baaPath: string;
  action: string;
  status: BaaStatus;
  priority: number;
  docs?: string;
  detail: string[];
};

export type PhiFlow = {
  label: string;
  path: string[];
};

export type ComplianceGap = {
  gap: string;
  risk: string;
  mitigation: string;
};

export type ChecklistItem = {
  id: string;
  group: "legal" | "technical";
  label: string;
};

export const complianceMeta = {
  coveredEntity: "The Alignment Clinic",
  productionSite: "thealignmentclinic.com",
  platform: "practice zero · elvis-practice",
  prepared: "26 October 2026",
  scope: "Every vendor that creates, receives, maintains, or transmits PHI",
  disclaimer:
    "Technical inventory based on production architecture and current vendor terms. Not legal advice. Counsel should review before go-live.",
} as const;

export const executiveSummary =
  "PHI already flows through visit recording, clinical notes, coding suggestions, patient portal and intake, agreements, consultation requests, claims and eligibility, and staff outreach. Six vendor BAAs plus one agency Business Associate agreement are required before the site can be treated as HIPAA-ready.";

export const freezeNote =
  "Operational freeze until OpenAI + Supabase + Vercel BAAs are live: no real-patient Record / Generate note / Suggest codes; no portal/intake go-live; no Stedi production claim submit without Stedi BAA confirmed.";

export const thisWeekOrder =
  "Sign the clinic ↔ practice zero BAA first, then Supabase, Vercel, and OpenAI before any real-patient recording, portal, or claim submit. Freeze Generate note / Suggest codes on live patients until OpenAI coverage is live.";

export const vendorBaas: VendorBaa[] = [
  {
    id: "practice-zero",
    party: "practice zero / Antimatter",
    role: "Developer with keys & admin access",
    baaPath: "Clinic ↔ agency BAA (or BA terms in MSA)",
    action: "Sign before onboarding",
    status: "required",
    priority: 1,
    detail: [
      "Agency holds Supabase service role, Vercel secrets (OpenAI, Stedi, Bird), and staff admin access — Business Associate activity.",
      "Preferred (A): Agency keeps vendor accounts, signs each vendor BAA as subcontractor, and signs one BAA with the clinic.",
      "Alternative (B): Transfer accounts to the clinic; clinic signs each vendor BAA directly.",
      "Rotate shared admin password; individual staff accounts + MFA; no production PHI in developer AI tools without a BAA chain.",
    ],
  },
  {
    id: "supabase",
    party: "Supabase",
    role: "Database, auth, file storage — system of record for nearly all PHI",
    baaPath: "Team/Enterprise + HIPAA add-on",
    action: "Upgrade, sign, High Compliance",
    status: "required",
    priority: 2,
    docs: "https://supabase.com/docs/guides/platform/hipaa-projects",
    detail: [
      "Organization on Team (from ~$599/mo) or Enterprise — Free/Pro cannot sign HIPAA BAA.",
      "Enable HIPAA add-on and sign BAA in dashboard.",
      "Mark production project High Compliance: Point-in-Time Recovery, SSL enforcement, network restrictions, Postgres connection logging.",
    ],
  },
  {
    id: "vercel",
    party: "Vercel",
    role: "Hosting & serverless compute — API routes and PHI processing",
    baaPath: "Pro HIPAA add-on (~$350/mo) or Enterprise",
    action: "Enable on deploy team",
    status: "required",
    priority: 3,
    docs: "https://vercel.com/kb/guide/hipaa-compliance-guide-vercel",
    detail: [
      "Platform retains logs and env management for Functions that process PHI.",
      "Pro: self-serve HIPAA BAA add-on under Settings → Billing → Add-Ons.",
      "Confirm add-on is active on the production deploy team.",
      "Preview deployments must use a non-PHI Supabase project. No PHI in console logs. No Web Analytics on authenticated routes.",
    ],
  },
  {
    id: "openai",
    party: "OpenAI",
    role: "Transcription, notes, coding, site guide",
    baaPath: "Healthcare Addendum + retention",
    action: "Execute; block real-patient recording until done",
    status: "required",
    priority: 4,
    detail: [
      "Visit transcription → /v1/audio/transcriptions (high — patient voice).",
      "Clinical note → /v1/responses with store: false (high).",
      "Coding extract → /v1/responses with store: false (high).",
      "Public site guide → /v1/chat/completions (medium — may include symptoms).",
      "Provision Modified/Safety Retention or Zero Data Retention as OpenAI requires.",
      "Do not enable Web Search on PHI calls (not BAA-covered).",
      "Until done: do not run Generate note / Suggest codes / Re-suggest on real patient encounters.",
    ],
  },
  {
    id: "stedi",
    party: "Stedi",
    role: "Claims (837P), eligibility (270/271), enrollments",
    baaPath: "Online BAA (HIPAA accounts)",
    action: "Confirm account + BAA accepted",
    status: "required",
    priority: 5,
    docs: "https://legal.stedi.com",
    detail: [
      "Payloads land in clearinghouse_transactions.",
      "Accept Stedi Business Associate Addendum on a HIPAA account.",
      "Confirm the account owning STEDI_API_KEY has BAA accepted and production credentials are in Vercel.",
    ],
  },
  {
    id: "bird",
    party: "Bird",
    role: "Email, SMS, voice outreach",
    baaPath: "Sales path — written BAA for Email / SMS / Voice",
    action: "Written BAA or swap vendors",
    status: "required",
    priority: 6,
    detail: [
      "Email: auth, agreement links, consultation notices, staff emailPatient.",
      "SMS: staff textPatient. Voice: staff callPatient (TTS).",
      "Obtain a signed BAA that explicitly lists Email, SMS, and Voice.",
      "If Bird cannot turn around: email → AWS SES or Paubox; SMS/voice → Twilio with BAA.",
      "Also required: SMS consent, 10DLC, minimum-necessary content (prefer portal links).",
      "Open/click tracking is already disabled in clinic email sends.",
    ],
  },
  {
    id: "google-workspace",
    party: "Google Workspace",
    role: "Clinic inboxes (consultation notices)",
    baaPath: "Admin Console HIPAA Business Associate Amendment",
    action: "Accept on Business/Enterprise",
    status: "required",
    priority: 7,
    detail: [
      "Consultation notices deliver patient identifiers into clinic mailboxes.",
      "Admin Console → Account → Legal and compliance → HIPAA Business Associate Amendment.",
      "Requires paid Business / Enterprise (not personal Gmail).",
      "Do not use Workspace as the long-term chart.",
    ],
  },
];

export const keepOffPhi = [
  {
    vendor: "Google Analytics / Google Ads",
    control: "Public site only — never on /admin, /portal, /intake, /sign, /auth",
  },
  {
    vendor: "GitHub",
    control: "Make repository private — no PHI in issues/PRs",
  },
  {
    vendor: "GoDaddy / CMS / NPPES",
    control: "DNS and reference catalogs only — no PHI",
  },
] as const;

export const phiFlows: PhiFlow[] = [
  {
    label: "Patient visit audio",
    path: [
      "Supabase Storage (visit-audio)",
      "OpenAI /v1/audio/transcriptions",
      "OpenAI /v1/responses (clinical note)",
      "OpenAI /v1/responses (coding facts)",
      "Supabase encounters (transcript, note, ICD/CPT)",
      "Staff approve → claim form",
      "Stedi claims API",
      "Supabase clearinghouse_transactions",
    ],
  },
  {
    label: "Portal / intake / agreements / chart uploads",
    path: ["Supabase (tables + chart-files bucket)"],
  },
  {
    label: "Consultation form",
    path: ["Supabase", "Bird email", "Google Workspace inbox"],
  },
  {
    label: "Auth (staff + portal)",
    path: ["Supabase Auth", "Bird email"],
  },
  {
    label: "Staff reach patient",
    path: ["Bird email / SMS / voice"],
  },
];

export const phiTables = [
  "encounters",
  "portal_patients",
  "portal_accounts",
  "intake_submissions",
  "intake_invites",
  "agreement_packets",
  "consultation_requests",
  "clearinghouse_transactions",
  "audit_log",
  "profiles",
] as const;

export const phiBuckets = [
  { name: "visit-audio", phi: true },
  { name: "chart-files", phi: true },
  { name: "journal-covers", phi: false, note: "Non-PHI marketing media" },
] as const;

export const complianceGaps: ComplianceGap[] = [
  {
    gap: "RCM desk still caches a local copy",
    risk: "Stale cache on a staff device if cloud sync fails",
    mitigation: "Device encryption + screen lock; claims, charts, practice profile, and compliance notes sync to Supabase",
  },
  {
    gap: "Shared admin credentials (historically)",
    risk: "Access control",
    mitigation: "Individual accounts + MFA",
  },
  {
    gap: "Missing HSTS / CSP headers",
    risk: "Baseline hardening",
    mitigation: "Add before broad patient use",
  },
  {
    gap: "Admin Security Rule docs",
    risk: "HIPAA program",
    mitigation: "Risk analysis, policies, training, breach plan",
  },
  {
    gap: "Outside-clinic vendors",
    risk: "Operations PHI",
    mitigation: "EHR/PM, phone/fax, telehealth, billing company, MSP, shredding — each needs its own BAA",
  },
];

export const checklist: ChecklistItem[] = [
  { id: "clinic-agency-baa", group: "legal", label: "Clinic ↔ practice zero BAA executed" },
  { id: "account-ownership", group: "legal", label: "Account ownership model decided (A or B)" },
  { id: "workspace-baa", group: "legal", label: "Google Workspace HIPAA BAA accepted" },
  { id: "bird-baa", group: "legal", label: "Bird BAA (Email + SMS + Voice) or swap plan" },
  { id: "stedi-baa", group: "legal", label: "Stedi HIPAA account + BAA confirmed" },
  { id: "openai-baa", group: "legal", label: "OpenAI Healthcare Addendum + retention" },
  { id: "supabase-baa", group: "legal", label: "Supabase Team + HIPAA add-on + BAA" },
  { id: "vercel-baa", group: "legal", label: "Vercel Pro HIPAA add-on on deploy team" },
  { id: "supabase-high", group: "technical", label: "Supabase High Compliance (PITR, SSL, network, logging)" },
  { id: "vercel-preview", group: "technical", label: "Vercel preview → non-PHI Supabase" },
  { id: "openai-retention", group: "technical", label: "OpenAI retention verified on PHI project" },
  { id: "openai-no-websearch", group: "technical", label: "No Web Search on PHI OpenAI paths" },
  { id: "github-private", group: "technical", label: "GitHub repository private" },
  { id: "mfa", group: "technical", label: "Admin password rotated; MFA on" },
  { id: "ga-off", group: "technical", label: "GA confirmed off authenticated routes" },
  { id: "sms-consent", group: "technical", label: "SMS consent + 10DLC before texting" },
];

export const costNote =
  "Indicative platform cost: Supabase Team from ~$599/mo + HIPAA add-on; Vercel Pro ~$20/mo + HIPAA ~$350/mo; OpenAI / Stedi / Bird usage; Google Workspace per user. Confirm current vendor pricing before budgeting.";
