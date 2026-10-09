import { withChart } from "@/lib/rcm/chart";
import type { Appointment, Claim, Patient, PracticeProfile, ServiceLine } from "@/lib/rcm/types";

const DAY = "2026-09-30";

export type DemoDay = {
  patients: Patient[];
  appointments: Appointment[];
  claims: Claim[];
};

function line(partial: Omit<ServiceLine, "modifier" | "icd" | "diagnoses" | "includeOnBill" | "modifiers"> & { diagnoses: string[] }): ServiceLine {
  return {
    ...partial,
    modifiers: [],
    modifier: "",
    diagnoses: partial.diagnoses,
    icd: partial.diagnoses[0] ?? "",
    includeOnBill: true,
  };
}

function patient(input: {
  id: string;
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  payerName: string;
  memberId: string;
  tradingPartnerId: string;
  note?: string;
}): Patient {
  const base = withChart(
    {
      firstName: input.firstName,
      lastName: input.lastName,
      dateOfBirth: input.dateOfBirth,
      sex: "female",
      memberId: input.memberId,
      payerName: input.payerName,
      phone: "5550100199",
      email: "",
      address: "2222 Random St",
      city: "A City",
      state: "NY",
      postalCode: "12345",
    },
    {
      id: input.id,
      createdAt: `${DAY}T12:00:00.000Z`,
      mrn: input.id.toUpperCase(),
      flags: ["demo"],
      allergiesReviewed: true,
      problems: [{ id: `${input.id}-dx`, name: "Low back pain", icd: "M54.50", status: "active", onset: DAY }],
      accountNotes: input.note
        ? [
            {
              id: `${input.id}-note`,
              body: input.note,
              audience: "front_desk",
              createdAt: `${DAY}T12:00:00.000Z`,
              resolved: false,
            },
          ]
        : [],
      coverages: [
        {
          id: `${input.id}-cov`,
          rank: "primary",
          payerName: input.payerName,
          planName: "Demo plan",
          memberId: input.memberId,
          groupNumber: "",
          subscriberName: `${input.firstName} ${input.lastName}`,
          relationship: "self",
          effectiveDate: "2026-01-01",
          copay: 0,
          tradingPartnerId: input.tradingPartnerId,
        },
      ],
    },
  );
  return base;
}

function visit(input: {
  id: string;
  patientId: string;
  physician: string;
  start: string;
  minutes: number;
  room: string;
  reason: string;
  scheduled: boolean;
}): Appointment {
  return {
    id: input.id,
    patientId: input.patientId,
    providerName: input.physician,
    start: input.start,
    durationMinutes: input.minutes,
    reason: input.reason,
    status: "completed",
    notes: "",
    visitType: "follow_up",
    room: input.room,
    confirmation: "confirmed",
    chiefComplaint: input.reason,
    assessment: "",
    plan: "",
    vitals: { bloodPressure: "", heartRate: "", weightLb: "", painScore: "" },
    copayCollected: null,
    scheduledProcedures: input.scheduled
      ? [{ id: `${input.id}-proc`, cpt: "99213", description: "Office visit, established", physician: input.physician }]
      : [],
    opNoteStatus: input.scheduled ? "missing" : "present",
    unableToCode: false,
    codingFlag: input.scheduled ? "Charge not entered" : "",
  };
}

function readyClaim(input: {
  id: string;
  patientId: string;
  appointmentId: string;
  scenario: "paid" | "partial" | "denied";
  controlNumber: string;
  idempotencyKey: string;
  charge: number;
  physician: string;
}): Claim {
  const now = `${DAY}T16:00:00.000Z`;
  return {
    id: input.id,
    patientId: input.patientId,
    appointmentId: input.appointmentId,
    payerName: "Stedi Test Payer",
    tradingPartnerId: "STEDI",
    dateOfService: DAY,
    status: "ready",
    controlNumber: input.controlNumber,
    placeOfService: "11",
    demoScenario: input.scenario,
    idempotencyKey: input.idempotencyKey,
    source: "manual",
    events: [],
    createdAt: now,
    updatedAt: now,
    lines: [
      line({
        id: `${input.id}-line`,
        cpt: "99213",
        description: "Office visit, established",
        units: 1,
        charge: input.charge,
        diagnoses: ["M54.50"],
        physician: input.physician,
      }),
    ],
  };
}

export function buildDemoDay(practice: PracticeProfile): DemoDay {
  const physician = practice.physicianName || "Elvis Francois, MD";
  const coding = patient({
    id: "demo-coding",
    firstName: "Riley",
    lastName: "Chen",
    dateOfBirth: "1988-03-12",
    payerName: "Aetna",
    memberId: "CHEN1001",
    tradingPartnerId: "60054",
    note: "Balance from the last visit. Please mention it at the desk. Closing this note does not clear it.",
  });
  const paid = patient({
    id: "demo-paid",
    firstName: "Morgan",
    lastName: "Hale",
    dateOfBirth: "1990-01-15",
    payerName: "Stedi Test Payer",
    memberId: "STEDI_PAID_HALE01",
    tradingPartnerId: "STEDI",
  });
  const partial = patient({
    id: "demo-partial",
    firstName: "Quinn",
    lastName: "Blake",
    dateOfBirth: "1990-01-15",
    payerName: "Stedi Test Payer",
    memberId: "STEDI_PARTIALLY_PAID_BLAKE02",
    tradingPartnerId: "STEDI",
  });
  const denied = patient({
    id: "demo-denied",
    firstName: "Avery",
    lastName: "Moss",
    dateOfBirth: "1990-01-15",
    payerName: "Stedi Test Payer",
    memberId: "STEDI_DENIED_MOSS03",
    tradingPartnerId: "STEDI",
  });
  const eligibility = patient({
    id: "demo-eligibility",
    firstName: "Jane",
    lastName: "Doe",
    dateOfBirth: "2004-04-04",
    payerName: "Aetna",
    memberId: "AETNA12345",
    tradingPartnerId: "60054",
    note: "Stedi’s published eligibility test persona. Not a clinic patient.",
  });

  return {
    patients: [coding, paid, partial, denied, eligibility],
    appointments: [
      visit({ id: "demo-visit-coding", patientId: coding.id, physician, start: `${DAY}T09:00:00`, minutes: 30, room: "Room 1", reason: "Low back pain", scheduled: true }),
      visit({ id: "demo-visit-paid", patientId: paid.id, physician, start: `${DAY}T09:30:00`, minutes: 30, room: "Room 1", reason: "Follow-up", scheduled: false }),
      visit({ id: "demo-visit-partial", patientId: partial.id, physician, start: `${DAY}T10:00:00`, minutes: 60, room: "Room 2", reason: "Follow-up", scheduled: false }),
      visit({ id: "demo-visit-denied", patientId: denied.id, physician, start: `${DAY}T10:00:00`, minutes: 30, room: "Procedure", reason: "Follow-up", scheduled: false }),
    ],
    claims: [
      readyClaim({
        id: "demo-claim-paid",
        patientId: paid.id,
        appointmentId: "demo-visit-paid",
        scenario: "paid",
        controlNumber: "DEMOPAID01",
        idempotencyKey: "11111111-1111-4111-8111-111111111111",
        charge: 180,
        physician,
      }),
      readyClaim({
        id: "demo-claim-partial",
        patientId: partial.id,
        appointmentId: "demo-visit-partial",
        scenario: "partial",
        controlNumber: "DEMOPART01",
        idempotencyKey: "22222222-2222-4222-8222-222222222222",
        charge: 240,
        physician,
      }),
      readyClaim({
        id: "demo-claim-denied",
        patientId: denied.id,
        appointmentId: "demo-visit-denied",
        scenario: "denied",
        controlNumber: "DEMODENY01",
        idempotencyKey: "33333333-3333-4333-8333-333333333333",
        charge: 150,
        physician,
      }),
    ],
  };
}
