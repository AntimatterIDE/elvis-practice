import type { ClaimFrequencyCode, FilingCode } from "@/lib/rcm/claim-rules";

export type Sex = "female" | "male" | "other" | "unknown";

export type ClaimStatus =
  | "draft"
  | "held"
  | "ready"
  | "submitted"
  | "processing"
  | "accepted"
  | "denied"
  | "rejected"
  | "paid";

export type DemoScenario = "paid" | "partial" | "denied";

export type RemitOutcome = "paid" | "partial" | "denied" | "unknown";

export type OpNoteStatus = "present" | "missing" | "not_required";

export type ClaimSource = "manual" | "upload" | "agent";

export type AppointmentStatus = "scheduled" | "arrived" | "in_progress" | "completed" | "cancelled" | "no_show";

export type VisitType = "new" | "follow_up" | "procedure" | "imaging_review" | "post_op";

export type ConfirmationStatus = "unconfirmed" | "confirmed" | "left_message";

export type DenialResolution = "appeal" | "resubmit" | "write_off" | "review";

export type ContactPreference = "phone" | "text" | "email" | "portal";

export type PortalStatus = "none" | "invited" | "active";

export type CoverageRank = "primary" | "secondary";

export type SubscriberRelation = "self" | "spouse" | "child" | "other";

export type DocumentStatus = "missing" | "received" | "signed";

export type PatientRegistration = {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  sex: Sex;
  memberId: string;
  payerName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  state: string;
  postalCode: string;
};

export type Coverage = {
  id: string;
  rank: CoverageRank;
  payerName: string;
  planName: string;
  memberId: string;
  groupNumber: string;
  subscriberName: string;
  relationship: SubscriberRelation;
  effectiveDate: string;
  copay: number;
  tradingPartnerId?: string;
};

export type Problem = {
  id: string;
  name: string;
  icd: string;
  status: "active" | "resolved";
  onset: string;
};

export type Allergy = {
  id: string;
  substance: string;
  reaction: string;
  severity: "mild" | "moderate" | "severe" | "unknown";
};

export type Medication = {
  id: string;
  name: string;
  dose: string;
  frequency: string;
  status: "active" | "stopped";
  /** Optional structured fields for eRx (free-text name/dose remain OCR-compatible). */
  rxNorm?: string;
  ndc?: string;
  quantity?: string;
  daysSupply?: string;
  refills?: number;
  sig?: string;
  pharmacyId?: string;
};

export type ChartDocument = {
  id: string;
  name: string;
  status: DocumentStatus;
  note: string;
};

export type InjuryCase = {
  id: string;
  caseNumber: string;
  claimNumber: string;
  dateOfInjury: string;
  description: string;
  carrierName: string;
  attorneyName: string;
  attorneyFirm: string;
  attorneyPhone: string;
  attorneyEmail: string;
  attorneyAddress: string;
  notes: string;
};

export type Patient = PatientRegistration & {
  id: string;
  createdAt: string;
  mrn: string;
  preferredName: string;
  pronouns: string;
  language: string;
  preferredContact: ContactPreference;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelation: string;
  guarantorName: string;
  guarantorRelation: string;
  guarantorPhone: string;
  pcpName: string;
  pcpPhone: string;
  referringName: string;
  referringPhone: string;
  pharmacyName: string;
  pharmacyPhone: string;
  /** NCPDP pharmacy id for eRx routing when known. */
  pharmacyNcpdpId?: string;
  pharmacyAddress?: string;
  portalStatus: PortalStatus;
  allergiesReviewed: boolean;
  medicalHistory: string;
  surgicalHistory: string;
  flags: string[];
  coverages: Coverage[];
  problems: Problem[];
  allergies: Allergy[];
  medications: Medication[];
  documents: ChartDocument[];
  cases: InjuryCase[];
  intakeAnswers?: { label: string; value: string }[];
  accountNotes: AccountNote[];
  /** SHA-256 fingerprints of outside-records files already imported (dedupe). */
  ocrImportHashes?: string[];
  /** Chart-files storage paths for OCR text artifacts (`…/ocr-import/…`). */
  ocrImportArtifacts?: string[];
};

export type AccountNote = {
  id: string;
  body: string;
  audience: "front_desk" | "billing";
  createdAt: string;
  resolved: boolean;
};

export type PatientInput = PatientRegistration;

export type ServiceLine = {
  id: string;
  cpt: string;
  description: string;
  modifier: string;
  modifiers: string[];
  units: number;
  charge: number;
  icd: string;
  diagnoses: string[];
  includeOnBill: boolean;
  physician: string;
};

export type ScheduledProcedure = {
  id: string;
  cpt: string;
  description: string;
  physician: string;
};

export type ClaimEvent = {
  id: string;
  at: string;
  kind: "submit" | "277ca" | "276" | "835" | "attachment" | "paper" | "error";
  summary: string;
};

export type ClaimAttachment = {
  path: string;
  name: string;
  contentType: string;
  size: number;
};

export type Claim = {
  id: string;
  patientId: string;
  payerName: string;
  filingCode?: FilingCode;
  dateOfService: string;
  status: ClaimStatus;
  controlNumber: string;
  placeOfService: string;
  lines: ServiceLine[];
  denialReason?: string;
  carc?: string;
  rarc?: string;
  appealDraft?: string;
  resolution?: DenialResolution;
  agentNote?: string;
  source: ClaimSource;
  createdAt: string;
  updatedAt: string;
  appointmentId?: string;
  encounterId?: string;
  tradingPartnerId?: string;
  idempotencyKey?: string;
  stediClaimId?: string;
  stediSubmissionId?: string;
  holdReason?: string;
  returnReason?: string;
  attachmentId?: string;
  demoScenario?: DemoScenario;
  events: ClaimEvent[];
  paymentAmount?: number | null;
  adjustmentAmount?: number | null;
  patientResponsibility?: number | null;
  remitOutcome?: RemitOutcome;
  clinicalNote: string;
  attachments: ClaimAttachment[];
  /** When true, payer pays the practice. When false, payer pays the patient. */
  assignmentOfBenefits?: boolean;
  priorAuthNumber?: string;
  /** CLM05-03: 1 original, 7 replacement, 8 void. */
  claimFrequencyCode?: ClaimFrequencyCode;
  /** Payer Claim Control Number required for frequency 7 or 8 (non-Medicare). */
  payerClaimControlNumber?: string;
};

export type ServiceLineInput = {
  cpt: string;
  description: string;
  modifier?: string;
  modifiers?: string[];
  units: number;
  charge: number;
  icd?: string;
  diagnoses?: string[];
  includeOnBill?: boolean;
  physician?: string;
};

export type ClaimInput = {
  patientId: string;
  payerName: string;
  filingCode?: FilingCode;
  dateOfService: string;
  placeOfService: string;
  lines: ServiceLineInput[];
  status?: ClaimStatus;
  source?: ClaimSource;
  agentNote?: string;
  appointmentId?: string;
  encounterId?: string;
  tradingPartnerId?: string;
  holdReason?: string;
  demoScenario?: DemoScenario;
  idempotencyKey?: string;
  clinicalNote?: string;
  assignmentOfBenefits?: boolean;
  priorAuthNumber?: string;
  claimFrequencyCode?: ClaimFrequencyCode;
  payerClaimControlNumber?: string;
};

export type Vitals = {
  bloodPressure: string;
  heartRate: string;
  weightLb: string;
  painScore: string;
};

export type Appointment = {
  id: string;
  patientId: string;
  providerName: string;
  start: string;
  durationMinutes: number;
  reason: string;
  status: AppointmentStatus;
  notes: string;
  visitType: VisitType;
  room: string;
  confirmation: ConfirmationStatus;
  chiefComplaint: string;
  assessment: string;
  plan: string;
  vitals: Vitals;
  copayCollected: number | null;
  scheduledProcedures: ScheduledProcedure[];
  opNoteStatus: OpNoteStatus;
  unableToCode: boolean;
  codingFlag: string;
};

export type AppointmentInput = {
  patientId: string;
  providerName: string;
  start: string;
  durationMinutes: number;
  reason: string;
  status: AppointmentStatus;
  notes: string;
  visitType?: VisitType;
  room?: string;
  confirmation?: ConfirmationStatus;
};

export type EligibilityResult = {
  id: string;
  patientId: string;
  payerName: string;
  createdAt: string;
  active: boolean;
  copay: number | null;
  coinsurance: number | null;
  deductibleRemaining: number | null;
  priorAuthRequired: boolean;
  summary: string;
  source?: "stedi" | "discovery";
};

export type PracticeTask = {
  id: string;
  patientId: string;
  title: string;
  detail: string;
  due: string;
  status: "open" | "done";
  updatedAt?: string;
};

export type PracticeProfile = {
  legalName: string;
  physicianName: string;
  npi: string;
  taxId: string;
  taxonomy: string;
  phone: string;
  address: string;
  posCode: string;
  /** Prescriber DEA (single-practice beta; multi-prescriber later). */
  deaNumber?: string;
  stateLicense?: string;
  epcsReady?: boolean;
  updatedAt?: string;
};

export type PrescriptionStatus = "draft" | "pending_signature" | "sent" | "cancelled" | "error" | "filled";
export type PrescriptionSchedule = "non_controlled" | "II" | "III" | "IV" | "V";

export type PrescriptionEvent = {
  id: string;
  at: string;
  kind: "draft" | "prepared" | "istop" | "signed" | "sent" | "cancelled" | "error" | "fill" | "renewal" | "change";
  summary: string;
};

/** Local desk prescription (mock or vendor-backed). */
export type Prescription = {
  id: string;
  patientId: string;
  appointmentId?: string;
  status: PrescriptionStatus;
  drugName: string;
  rxNorm?: string;
  ndc?: string;
  dose: string;
  sig: string;
  quantity: string;
  daysSupply: string;
  refills: number;
  schedule: PrescriptionSchedule;
  pharmacyName: string;
  pharmacyPhone: string;
  pharmacyNcpdpId: string;
  pharmacyAddress?: string;
  diagnosisNote?: string;
  pharmacyNote?: string;
  /** Manual NY I-STOP consult stamp before controlled-substance sign. */
  istopCheckedAt?: string;
  istopCheckedBy?: string;
  vendorPrescriptionId?: string;
  events: PrescriptionEvent[];
  createdAt: string;
  updatedAt: string;
  sentAt?: string;
  errorMessage?: string;
};

export type PrescriptionInput = {
  patientId: string;
  appointmentId?: string;
  drugName: string;
  rxNorm?: string;
  ndc?: string;
  dose: string;
  sig: string;
  quantity: string;
  daysSupply: string;
  refills: number;
  schedule: PrescriptionSchedule;
  pharmacyName: string;
  pharmacyPhone: string;
  pharmacyNcpdpId: string;
  pharmacyAddress?: string;
  diagnosisNote?: string;
  pharmacyNote?: string;
};

/** Shared cloud snapshot for practice profile, tasks, and eligibility history. */
export type PracticeDeskSnapshot = {
  practice: PracticeProfile;
  tasks: PracticeTask[];
  eligibility: EligibilityResult[];
  updatedAt: string;
};

export type RcmState = {
  patients: Patient[];
  claims: Claim[];
  appointments: Appointment[];
  eligibility: EligibilityResult[];
  tasks: PracticeTask[];
  practice: PracticeProfile;
  prescriptions: Prescription[];
};
