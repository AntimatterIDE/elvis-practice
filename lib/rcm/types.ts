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

export type AppointmentStatus = "scheduled" | "in_progress" | "completed" | "cancelled" | "no_show";

export type DenialResolution = "appeal" | "resubmit" | "write_off" | "review";

export type Patient = {
  id: string;
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
  createdAt: string;
};

export type PatientInput = Omit<Patient, "id" | "createdAt">;

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

export type Appointment = {
  id: string;
  patientId: string;
  providerName: string;
  start: string;
  durationMinutes: number;
  reason: string;
  status: AppointmentStatus;
  notes: string;
};

export type AppointmentInput = Omit<Appointment, "id">;

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
  practice: PracticeProfile;
};
