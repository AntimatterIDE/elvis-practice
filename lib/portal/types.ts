import type { Appointment, Patient } from "@/lib/rcm/types";

export type IntakeFieldType =
  | "short_text"
  | "long_text"
  | "email"
  | "phone"
  | "date"
  | "select"
  | "yes_no"
  | "acknowledge";

export type IntakeMap =
  | "firstName"
  | "lastName"
  | "preferredName"
  | "dateOfBirth"
  | "sex"
  | "phone"
  | "email"
  | "address"
  | "city"
  | "state"
  | "postalCode"
  | "payerName"
  | "memberId"
  | "emergencyName"
  | "emergencyPhone"
  | "emergencyRelation"
  | "pharmacyName"
  | "pharmacyPhone";

export type IntakeField = {
  id: string;
  label: string;
  help: string;
  type: IntakeFieldType;
  required: boolean;
  options: string[];
  mapsTo: IntakeMap | null;
  locked: boolean;
};

export type IntakeForm = {
  id: string;
  title: string;
  introduction: string;
  fields: IntakeField[];
  updatedAt: string;
};

export type IntakeInvite = {
  id: string;
  token: string;
  recipientEmail: string;
  recipientName: string;
  expiresAt: string;
  submittedAt: string | null;
  patientId: string | null;
  createdAt: string;
};

export type IntakeSubmission = {
  id: string;
  inviteId: string;
  patientId: string;
  answers: Record<string, string>;
  fields: IntakeField[];
  createdAt: string;
};

export type PortalAccount = {
  patientId: string;
  email: string;
  passwordHash: string;
  createdAt: string;
};

export type PortalSession = {
  tokenHash: string;
  patientId: string;
  expiresAt: string;
};

export type PortalPatientRecord = {
  id: string;
  mrn: string;
  chart: Patient;
  answers: Record<string, string>;
  fields: IntakeField[];
  updatedAt: string;
};

export type PortalDb = {
  form: IntakeForm;
  invites: IntakeInvite[];
  submissions: IntakeSubmission[];
  patients: PortalPatientRecord[];
  accounts: PortalAccount[];
  visits: Appointment[];
  sessions: PortalSession[];
  nextMrn: number;
};

export type IntakeInviteView = {
  id: string;
  path: string;
  recipientEmail: string;
  recipientName: string;
  expiresAt: string;
  submittedAt: string | null;
  patientId: string | null;
  createdAt: string;
  status: "open" | "completed" | "expired";
};

export type IntakeSubmissionView = {
  id: string;
  patientId: string;
  patientName: string;
  email: string;
  createdAt: string;
  hasLogin: boolean;
};

export type IntakeAdminSnapshot = {
  form: IntakeForm;
  invites: IntakeInviteView[];
  submissions: IntakeSubmissionView[];
  storage: "database" | "server";
};

export type PublicIntake = {
  title: string;
  introduction: string;
  recipientName: string;
  fields: IntakeField[];
};

export type PortalVisitView = {
  id: string;
  start: string;
  durationMinutes: number;
  reason: string;
  status: string;
  providerName: string;
  room: string;
  visitType: string;
};

export type PatientPortalView = {
  id: string;
  mrn: string;
  firstName: string;
  preferredName: string;
  lastName: string;
  dateOfBirth: string;
  phone: string;
  email: string;
  addressLine: string;
  payerName: string;
  memberId: string;
  emergency: string;
  pharmacy: string;
  allergies: string[];
  medications: string[];
  documents: { name: string; status: string }[];
  answers: { label: string; value: string }[];
  visits: PortalVisitView[];
};

export type PortalResult<T> = { ok: true; value: T } | { ok: false; error: string };

export type PublicInviteResult =
  | { status: "open"; form: PublicIntake }
  | { status: "expired" | "used" | "missing" };

export type PortalStore = {
  snapshot: () => Promise<PortalResult<IntakeAdminSnapshot>>;
  saveForm: (form: IntakeForm) => Promise<PortalResult<IntakeAdminSnapshot>>;
  createInvite: (input: { email?: string; name?: string }) => Promise<
    PortalResult<{ snapshot: IntakeAdminSnapshot; path: string }>
  >;
  publicInvite: (token: string) => Promise<PublicInviteResult>;
  submit: (token: string, answers: Record<string, string>) => Promise<PortalResult<{ patientId: string }>>;
  issueLogin: (input: {
    patientId: string;
    email: string;
    chart?: Patient;
  }) => Promise<PortalResult<{ password: string; email: string }>>;
  accountFor: (patientId: string) => Promise<{ email: string } | null>;
  login: (email: string, password: string) => Promise<PortalResult<{ token: string }>>;
  patientIdForToken: (token: string) => Promise<string | null>;
  revoke: (token: string) => Promise<void>;
  home: (patientId: string) => Promise<PatientPortalView | null>;
  roster: () => Promise<PortalResult<{ patients: Patient[]; appointments: Appointment[] }>>;
  pushCharts: (input: { patients: Patient[]; appointments: Appointment[] }) => Promise<PortalResult<{ saved: number }>>;
  removePatients: (ids: string[]) => Promise<PortalResult<{ removed: number }>>;
};
