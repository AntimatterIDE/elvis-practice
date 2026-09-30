export type Sex = "female" | "male" | "other" | "unknown";

export type ClaimStatus =
  | "draft"
  | "submitted"
  | "processing"
  | "accepted"
  | "denied"
  | "rejected"
  | "paid";

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
};

export type ChartDocument = {
  id: string;
  name: string;
  status: DocumentStatus;
  note: string;
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
};

export type PatientInput = PatientRegistration;

export type ServiceLine = {
  id: string;
  cpt: string;
  description: string;
  modifier: string;
  units: number;
  charge: number;
  icd: string;
};

export type Claim = {
  id: string;
  patientId: string;
  payerName: string;
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
};

export type ClaimInput = {
  patientId: string;
  payerName: string;
  dateOfService: string;
  placeOfService: string;
  lines: Array<Omit<ServiceLine, "id">>;
  status?: ClaimStatus;
  source?: ClaimSource;
  agentNote?: string;
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
  copay: number;
  coinsurance: number;
  deductibleRemaining: number;
  priorAuthRequired: boolean;
  summary: string;
};

export type PracticeTask = {
  id: string;
  patientId: string;
  title: string;
  detail: string;
  due: string;
  status: "open" | "done";
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
};

export type RcmState = {
  patients: Patient[];
  claims: Claim[];
  appointments: Appointment[];
  eligibility: EligibilityResult[];
  tasks: PracticeTask[];
  practice: PracticeProfile;
};
