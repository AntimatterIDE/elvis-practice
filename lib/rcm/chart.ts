import type {
  Appointment,
  ChartDocument,
  Coverage,
  Patient,
  PatientInput,
  RcmState,
  Vitals,
} from "@/lib/rcm/types";

export const DEMO_CLINIC_DAY = "2026-09-30";

const requiredDocuments = ["Photo ID", "Insurance card", "Consent to treat", "New patient intake", "Privacy acknowledgment"];

export function emptyVitals(): Vitals {
  return { bloodPressure: "", heartRate: "", weightLb: "", painScore: "" };
}

export function defaultDocuments(): ChartDocument[] {
  return [
    "Photo ID",
    "Insurance card",
    "Consent to treat",
    "New patient intake",
    "Privacy acknowledgment",
    "Outside records",
  ].map((name) => ({
    id: name.toLowerCase().replaceAll(" ", "-"),
    name,
    status: "missing",
    note: "",
  }));
}

export function defaultCoverage(input: Pick<PatientInput, "firstName" | "lastName" | "payerName" | "memberId">): Coverage {
  return {
    id: "primary",
    rank: "primary",
    payerName: input.payerName,
    planName: "",
    memberId: input.memberId,
    groupNumber: "",
    subscriberName: `${input.firstName} ${input.lastName}`.trim(),
    relationship: "self",
    effectiveDate: "",
    copay: 0,
  };
}

export function withChart(input: PatientInput, extra: Partial<Patient> = {}): Patient {
  const payerName = extra.payerName ?? input.payerName;
  const memberId = extra.memberId ?? input.memberId;
  return {
    ...input,
    payerName,
    memberId,
    id: "",
    createdAt: "",
    mrn: "",
    preferredName: "",
    pronouns: "",
    language: "English",
    preferredContact: "phone",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelation: "",
    guarantorName: "",
    guarantorRelation: "self",
    guarantorPhone: "",
    pcpName: "",
    pcpPhone: "",
    referringName: "",
    referringPhone: "",
    pharmacyName: "",
    pharmacyPhone: "",
    portalStatus: "none",
    allergiesReviewed: false,
    medicalHistory: "",
    surgicalHistory: "",
    flags: [],
    coverages: payerName ? [defaultCoverage({ ...input, payerName, memberId })] : [],
    problems: [],
    allergies: [],
    medications: [],
    documents: defaultDocuments(),
    ...extra,
  };
}

export function normalizePatient(patient: Patient): Patient {
  const next = withChart(patient, patient);
  return {
    ...next,
    flags: next.flags ?? [],
    coverages: next.coverages ?? [],
    problems: next.problems ?? [],
    allergies: next.allergies ?? [],
    medications: next.medications ?? [],
    documents: next.documents?.length ? next.documents : defaultDocuments(),
  };
}

export function normalizeAppointment(appointment: Appointment): Appointment {
  const stored = appointment as Partial<Appointment>;
  return {
    id: appointment.id,
    patientId: appointment.patientId,
    providerName: appointment.providerName,
    start: appointment.start,
    durationMinutes: appointment.durationMinutes,
    reason: appointment.reason,
    status: appointment.status,
    notes: appointment.notes ?? "",
    visitType: stored.visitType ?? "follow_up",
    room: stored.room || "Room 1",
    confirmation: stored.confirmation ?? "unconfirmed",
    chiefComplaint: stored.chiefComplaint || appointment.reason || "",
    assessment: stored.assessment ?? "",
    plan: stored.plan ?? "",
    copayCollected: stored.copayCollected ?? null,
    vitals: { ...emptyVitals(), ...stored.vitals },
  };
}

export function normalizeState(state: RcmState): RcmState {
  return {
    ...state,
    patients: state.patients.map((patient) => normalizePatient(patient)),
    appointments: state.appointments.map((appointment) => normalizeAppointment(appointment)),
    tasks: state.tasks ?? [],
    eligibility: state.eligibility ?? [],
  };
}

export function primaryCoverage(patient: Patient) {
  return patient.coverages.find((coverage) => coverage.rank === "primary") ?? patient.coverages[0];
}

export function applyPrimaryCoverage(patient: Patient): Patient {
  const primary = primaryCoverage(patient);
  if (!primary) return patient;
  return { ...patient, payerName: primary.payerName, memberId: primary.memberId };
}

export function chartGaps(patient: Patient) {
  const gaps: string[] = [];
  if (!patient.allergiesReviewed) gaps.push("Allergies not reviewed");
  if (!patient.phone) gaps.push("No phone number");
  if (!patient.coverages.length) gaps.push("No coverage on file");
  for (const name of requiredDocuments) {
    const document = patient.documents.find((item) => item.name === name);
    if (!document || document.status === "missing") gaps.push(`${name} missing`);
  }
  return gaps;
}

export function ageFromDob(dob: string, today = DEMO_CLINIC_DAY) {
  const birth = new Date(`${dob}T12:00:00`);
  const now = new Date(`${today}T12:00:00`);
  if (Number.isNaN(birth.getTime()) || Number.isNaN(now.getTime())) return null;
  let age = now.getFullYear() - birth.getFullYear();
  const month = now.getMonth() - birth.getMonth();
  if (month < 0 || (month === 0 && now.getDate() < birth.getDate())) age -= 1;
  return age;
}

export function localIsoDay(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function focusClinicDay(days: string[], today: string) {
  const unique = [...new Set(days)].sort();
  if (unique.includes(today)) return today;
  return unique.find((day) => day >= today) ?? unique.at(-1) ?? today;
}

export const visitTypeLabel: Record<string, string> = {
  new: "New patient",
  follow_up: "Follow-up",
  procedure: "Procedure",
  imaging_review: "Imaging review",
  post_op: "Post-op",
};
