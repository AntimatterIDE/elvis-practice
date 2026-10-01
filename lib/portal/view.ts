import { patientName } from "@/lib/rcm/format";
import type { Appointment, Patient } from "@/lib/rcm/types";
import { sexLabel } from "@/lib/portal/defaults";
import type {
  IntakeAdminSnapshot,
  IntakeField,
  PatientPortalView,
  PortalDb,
  PortalVisitView,
} from "@/lib/portal/types";

function inviteStatus(invite: PortalDb["invites"][number], now: number): "open" | "completed" | "expired" {
  if (invite.submittedAt) return "completed";
  if (Date.parse(invite.expiresAt) <= now) return "expired";
  return "open";
}

export function toAdminSnapshot(db: PortalDb, storage: IntakeAdminSnapshot["storage"], now = Date.now()): IntakeAdminSnapshot {
  const names = new Map(db.patients.map((patient) => [patient.id, patient]));
  const logins = new Set(db.accounts.map((account) => account.patientId));
  return {
    storage,
    form: db.form,
    invites: [...db.invites]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((invite) => ({
        id: invite.id,
        path: `/intake/${invite.token}`,
        recipientEmail: invite.recipientEmail,
        recipientName: invite.recipientName,
        expiresAt: invite.expiresAt,
        submittedAt: invite.submittedAt,
        patientId: invite.patientId,
        createdAt: invite.createdAt,
        status: inviteStatus(invite, now),
      })),
    submissions: [...db.submissions]
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .map((submission) => {
        const patient = names.get(submission.patientId);
        return {
          id: submission.id,
          patientId: submission.patientId,
          patientName: patient ? patientName(patient.chart) : "New patient",
          email: patient?.chart.email ?? "",
          createdAt: submission.createdAt,
          hasLogin: logins.has(submission.patientId),
        };
      }),
  };
}

function answerLabel(field: IntakeField, value: string) {
  if (field.mapsTo === "sex") return sexLabel(value);
  if ((field.type === "yes_no" || field.type === "acknowledge") && value === "yes") return "Yes";
  if ((field.type === "yes_no" || field.type === "acknowledge") && value === "no") return "No";
  return value;
}

export function toPortalView(patient: { chart: Patient; answers: Record<string, string>; fields: IntakeField[] }, visits: Appointment[]): PatientPortalView {
  const chart = patient.chart;
  const addressLine = [chart.address, chart.city, chart.state, chart.postalCode].filter(Boolean).join(", ");
  const emergency = [chart.emergencyName, chart.emergencyRelation, chart.emergencyPhone].filter(Boolean).join(" · ");
  const pharmacy = [chart.pharmacyName, chart.pharmacyPhone].filter(Boolean).join(" · ");
  const answers = patient.fields
    .filter((field) => !field.mapsTo && patient.answers[field.id])
    .map((field) => ({ label: field.label, value: answerLabel(field, patient.answers[field.id] ?? "") }));
  const portalVisits: PortalVisitView[] = [...visits]
    .sort((a, b) => a.start.localeCompare(b.start))
    .map((visit) => ({
      id: visit.id,
      start: visit.start,
      durationMinutes: visit.durationMinutes,
      reason: visit.reason,
      status: visit.status,
      providerName: visit.providerName,
      room: visit.room,
      visitType: visit.visitType,
    }));
  return {
    id: chart.id,
    mrn: chart.mrn,
    firstName: chart.firstName,
    lastName: chart.lastName,
    preferredName: chart.preferredName,
    dateOfBirth: chart.dateOfBirth,
    phone: chart.phone,
    email: chart.email,
    addressLine,
    payerName: chart.payerName,
    memberId: chart.memberId,
    emergency,
    pharmacy,
    allergies: chart.allergies.map((allergy) => `${allergy.substance} (${allergy.reaction})`),
    medications: chart.medications
      .filter((medication) => medication.status === "active")
      .map((medication) => [medication.name, medication.dose, medication.frequency].filter(Boolean).join(" ")),
    documents: chart.documents.map((document) => ({ name: document.name, status: document.status })),
    answers,
    visits: portalVisits,
  };
}

export function splitPortalVisits(visits: PortalVisitView[], now = Date.now()) {
  const upcoming = visits.filter((visit) => {
    if (visit.status === "cancelled" || visit.status === "completed" || visit.status === "no_show") return false;
    const start = Date.parse(visit.start);
    return Number.isNaN(start) || start >= now;
  });
  const earlier = visits.filter((visit) => !upcoming.includes(visit)).reverse();
  return { upcoming, earlier };
}

export function rosterFrom(db: PortalDb) {
  return {
    patients: db.patients.map((patient) => patient.chart),
    appointments: db.visits,
  };
}
