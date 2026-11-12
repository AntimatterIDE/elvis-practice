"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { applyPrimaryCoverage, emptyVitals, normalizeAppointment, normalizeClaim, normalizeLine, normalizePatient, normalizeState, withChart } from "@/lib/rcm/chart";
import { invoicesFromClaims } from "@/lib/portal/invoices";
import type { PortalInvoice } from "@/lib/portal/types";
import { mergeClaimsByUpdatedAt } from "@/lib/rcm/claims-merge";
import { deskFromState, mergePracticeDesk, normalizePractice } from "@/lib/rcm/desk-merge";
import { STORAGE_KEY, createSeedState } from "@/lib/rcm/seed";
import { isSmokePatient } from "@/lib/rcm/smoke-charts";
import type {
  Appointment,
  AppointmentInput,
  Claim,
  ClaimInput,
  EligibilityResult,
  Patient,
  PatientInput,
  PracticeDeskSnapshot,
  PracticeProfile,
  PracticeTask,
  RcmState,
} from "@/lib/rcm/types";

type DeskSnapshot = RcmState & { rosterReady: boolean; syncError: string };

type RcmContextValue = DeskSnapshot & {
  ready: boolean;
  addPatient: (input: PatientInput) => Patient;
  rememberPatient: (patient: Patient) => void;
  updatePatient: (id: string, input: PatientInput) => void;
  patchPatient: (id: string, patch: Partial<Patient>) => void;
  removePatient: (id: string) => void;
  addTask: (input: Omit<PracticeTask, "id" | "status">) => PracticeTask;
  setTaskStatus: (id: string, status: PracticeTask["status"]) => void;
  addClaim: (input: ClaimInput) => Claim;
  updateClaim: (id: string, patch: Partial<Claim>) => void;
  addAppointment: (input: AppointmentInput) => Appointment;
  updateAppointment: (id: string, patch: Partial<Appointment>) => void;
  removeAppointment: (id: string) => void;
  addEligibility: (result: Omit<EligibilityResult, "id" | "createdAt">) => EligibilityResult;
  clearPatientEligibility: (patientId: string) => void;
  updatePractice: (patch: Partial<PracticeProfile>) => void;
};

const RcmContext = createContext<RcmContextValue | null>(null);
const serverState = createSeedState();
const serverSnapshot: DeskSnapshot = { ...serverState, rosterReady: false, syncError: "" };
const listeners = new Set<() => void>();
const portalListeners = new Set<
  (snap: { patients: Patient[]; appointments: Appointment[]; removedAppointmentIds: string[]; invoices: PortalInvoice[] }) => void
>();
const removedAppointmentIds = new Set<string>();
const removedPatientIds = new Set<string>();
const removedEligibilityIds = new Set<string>();
const removalListeners = new Set<(ids: string[]) => void>();
const claimsListeners = new Set<(claims: Claim[]) => void>();
const deskListeners = new Set<(desk: PracticeDeskSnapshot) => void>();
let clientState: RcmState | null = null;
let published: DeskSnapshot | null = null;
let rosterReady = false;
let syncError = "";
let portalReady = false;
let claimsReady = false;
let deskReady = false;
let portalIds = new Set<string>();
let pushChain: Promise<void> = Promise.resolve();

function isState(value: unknown): value is RcmState {
  if (!value || typeof value !== "object") return false;
  const record = value as RcmState;
  return Array.isArray(record.patients) && Array.isArray(record.claims) && Array.isArray(record.appointments);
}

function readStored() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    return isState(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function ensureClient() {
  if (clientState) return;
  const stored = readStored();
  clientState = stored ? normalizeState(stored) : serverState;
  published = { ...clientState, rosterReady, syncError };
}

function getSnapshot() {
  ensureClient();
  if (!published) published = { ...clientState!, rosterReady, syncError };
  return published;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  published = { ...clientState!, rosterReady, syncError };
  for (const listener of listeners) listener();
}

export function setPortalSyncError(message: string) {
  ensureClient();
  if (syncError === message) return;
  syncError = message;
  emit();
}

function notifyPortalPush() {
  if (!clientState || !portalReady) return;
  const patients = clientState.patients.filter(
    (patient) => !removedPatientIds.has(patient.id) && !isSmokePatient(patient),
  );
  for (const patient of patients) portalIds.add(patient.id);
  const patientIds = new Set(patients.map((patient) => patient.id));
  const snap = {
    patients,
    appointments: clientState.appointments.filter((appointment) => patientIds.has(appointment.patientId)),
    removedAppointmentIds: [...removedAppointmentIds],
    invoices: invoicesFromClaims(clientState.claims ?? []).filter((invoice) => patientIds.has(invoice.patientId)),
  };
  for (const listener of portalListeners) listener(snap);
}

function notifyClaimsPush() {
  if (!clientState || !claimsReady) return;
  const claims = clientState.claims ?? [];
  for (const listener of claimsListeners) listener(claims);
}

function notifyDeskPush() {
  if (!clientState || !deskReady) return;
  const desk = deskFromState(clientState.practice, clientState.tasks ?? [], clientState.eligibility ?? []);
  for (const listener of deskListeners) listener(desk);
}

function withoutRoster(next: RcmState) {
  if (!("rosterReady" in next)) return next;
  const rest = { ...next };
  delete (rest as { rosterReady?: boolean }).rosterReady;
  return rest;
}

function commit(next: RcmState, mode: "local" | "merge" = "local") {
  const rest = withoutRoster(next);
  const previous = clientState;
  clientState = rest;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(rest));
  emit();
  if (mode !== "local" || !previous) return;
  if (portalReady) {
    const removed = previous.patients
      .filter((patient) => portalIds.has(patient.id) && !rest.patients.some((item) => item.id === patient.id))
      .map((patient) => patient.id);
    for (const id of removed) portalIds.delete(id);
    if (removed.length) {
      for (const listener of removalListeners) listener(removed);
    }
    notifyPortalPush();
  }
  notifyClaimsPush();
  notifyDeskPush();
}

export function subscribePortalRemoval(listener: (ids: string[]) => void) {
  removalListeners.add(listener);
  return () => {
    removalListeners.delete(listener);
  };
}

export function subscribePortalPush(
  listener: (snap: { patients: Patient[]; appointments: Appointment[]; removedAppointmentIds: string[]; invoices: PortalInvoice[] }) => void,
) {
  portalListeners.add(listener);
  return () => {
    portalListeners.delete(listener);
  };
}

export function enqueuePortalPush(task: () => Promise<void>) {
  pushChain = pushChain.then(task, task);
  return pushChain;
}

export function whenPortalIdle() {
  return pushChain;
}

export function markRosterReady() {
  ensureClient();
  if (rosterReady) return;
  rosterReady = true;
  emit();
}

export function notePortalPatient(id: string) {
  portalIds.add(id);
  portalReady = true;
}

export function subscribeClaimsPush(listener: (claims: Claim[]) => void) {
  claimsListeners.add(listener);
  return () => {
    claimsListeners.delete(listener);
  };
}

export function markClaimsReady() {
  ensureClient();
  if (claimsReady) return;
  claimsReady = true;
  emit();
}

/** Merge server claims into the desk. Returns local claims that still need an upsert. */
export function mergeRemoteClaims(remote: Claim[]) {
  ensureClient();
  const current = clientState!;
  const { claims, needsUpsert } = mergeClaimsByUpdatedAt(current.claims ?? [], remote);
  claimsReady = true;
  commit({ ...current, claims }, "merge");
  return needsUpsert;
}

export function subscribeDeskPush(listener: (desk: PracticeDeskSnapshot) => void) {
  deskListeners.add(listener);
  return () => {
    deskListeners.delete(listener);
  };
}

export function markDeskReady() {
  ensureClient();
  if (deskReady) return;
  deskReady = true;
  emit();
}

/** Merge server practice desk into local state. Returns true when a cloud upsert is still needed. */
export function mergeRemoteDesk(remote: PracticeDeskSnapshot | null) {
  ensureClient();
  const current = clientState!;
  const local = deskFromState(current.practice, current.tasks ?? [], current.eligibility ?? []);
  const { desk, needsUpsert } = mergePracticeDesk(local, remote);
  const eligibility = desk.eligibility.filter((check) => !removedEligibilityIds.has(check.id));
  const remoteIds = new Set((remote?.eligibility ?? []).map((check) => check.id));
  for (const id of [...removedEligibilityIds]) {
    if (!remoteIds.has(id)) removedEligibilityIds.delete(id);
  }
  const dropped = eligibility.length !== desk.eligibility.length;
  deskReady = true;
  commit(
    {
      ...current,
      practice: normalizePractice(desk.practice),
      tasks: desk.tasks,
      eligibility,
    },
    "merge",
  );
  if (needsUpsert || dropped) {
    return { ...desk, eligibility };
  }
  return null;
}

export function mergePortalRoster(patients: Patient[], appointments: Appointment[]) {
  ensureClient();
  const current = clientState!;
  const serverPatients = patients.filter((patient) => !removedPatientIds.has(patient.id) && !isSmokePatient(patient));
  const serverIds = new Set(serverPatients.map((patient) => patient.id));
  for (const id of [...removedPatientIds]) {
    if (!patients.some((patient) => patient.id === id)) removedPatientIds.delete(id);
  }
  const localPatients = current.patients
    .filter((patient) => !serverIds.has(patient.id) && !removedPatientIds.has(patient.id) && !isSmokePatient(patient))
    .map((patient) => normalizePatient(patient));
  portalIds = new Set([...serverIds, ...localPatients.map((patient) => patient.id)]);
  portalReady = true;
  rosterReady = true;
  const serverAppointmentIds = new Set(appointments.map((appointment) => appointment.id));
  for (const id of removedAppointmentIds) {
    if (!serverAppointmentIds.has(id)) removedAppointmentIds.delete(id);
  }
  const pending = current.appointments.filter(
    (appointment) =>
      serverIds.has(appointment.patientId) &&
      !serverAppointmentIds.has(appointment.id) &&
      !removedAppointmentIds.has(appointment.id),
  );
  const sharedAppointments = appointments.filter(
    (appointment) => !removedAppointmentIds.has(appointment.id) && serverIds.has(appointment.patientId),
  );
  // If the last portal push failed, keep local visit status so a stale roster poll
  // cannot wipe a check-in / rooming change that never landed on the server.
  const localById = new Map(current.appointments.map((appointment) => [appointment.id, appointment]));
  const mergedShared = sharedAppointments.map((appointment) => {
    const normalized = normalizeAppointment(appointment);
    if (!syncError) return normalized;
    const local = localById.get(appointment.id);
    if (!local || local.status === normalized.status) return normalized;
    return normalizeAppointment({ ...normalized, status: local.status });
  });
  commit(
    {
      ...current,
      patients: [...serverPatients.map((patient) => normalizePatient(patient)), ...localPatients],
      appointments: [
        ...mergedShared,
        ...pending,
        ...current.appointments.filter(
          (appointment) =>
            !serverIds.has(appointment.patientId) &&
            !removedAppointmentIds.has(appointment.id) &&
            !removedPatientIds.has(appointment.patientId),
        ),
      ],
    },
    localPatients.length || pending.length ? "local" : "merge",
  );
}

function nid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function RcmProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => serverSnapshot);

  const value = useMemo<RcmContextValue>(() => {
    return {
      ...state,
      ready: true,
      addPatient: (input) => {
        const current = getSnapshot();
        const patient: Patient = {
          ...withChart(input),
          id: nid("p"),
          createdAt: new Date().toISOString(),
          mrn: String(100300 + current.patients.length),
        };
        commit({ ...current, patients: [patient, ...current.patients] });
        return patient;
      },
      rememberPatient: (patient) => {
        const current = getSnapshot();
        if (current.patients.some((item) => item.id === patient.id)) return;
        commit({ ...current, patients: [normalizePatient(patient), ...current.patients] });
      },
      updatePatient: (id, input) => {
        const current = getSnapshot();
        commit({
          ...current,
          patients: current.patients.map((patient) => {
            if (patient.id !== id) return patient;
            const coverages = patient.coverages.map((coverage) =>
              coverage.rank === "primary" ? { ...coverage, payerName: input.payerName, memberId: input.memberId } : coverage,
            );
            return { ...patient, ...input, coverages };
          }),
        });
      },
      patchPatient: (id, patch) => {
        const current = getSnapshot();
        commit({
          ...current,
          patients: current.patients.map((patient) => {
            if (patient.id !== id) return patient;
            const next = { ...patient, ...patch };
            if (patch.coverages) return applyPrimaryCoverage(next);
            if (patch.payerName !== undefined || patch.memberId !== undefined) {
              return {
                ...next,
                coverages: next.coverages.map((coverage) =>
                  coverage.rank === "primary"
                    ? { ...coverage, payerName: next.payerName, memberId: next.memberId }
                    : coverage,
                ),
              };
            }
            return next;
          }),
        });
      },
      removePatient: (id) => {
        const current = getSnapshot();
        removedPatientIds.add(id);
        portalIds.delete(id);
        commit({
          ...current,
          patients: current.patients.filter((patient) => patient.id !== id),
          claims: current.claims.filter((claim) => claim.patientId !== id),
          appointments: current.appointments.filter((appointment) => appointment.patientId !== id),
          eligibility: current.eligibility.filter((check) => check.patientId !== id),
          tasks: current.tasks.filter((task) => task.patientId !== id),
        });
      },
      addTask: (input) => {
        const now = new Date().toISOString();
        const task: PracticeTask = { ...input, id: nid("t"), status: "open", updatedAt: now };
        const current = getSnapshot();
        commit({ ...current, tasks: [task, ...current.tasks] });
        return task;
      },
      setTaskStatus: (id, status) => {
        const current = getSnapshot();
        const now = new Date().toISOString();
        commit({
          ...current,
          tasks: current.tasks.map((task) => (task.id === id ? { ...task, status, updatedAt: now } : task)),
        });
      },
      addClaim: (input) => {
        const now = new Date().toISOString();
        const lines = input.lines.map((line) => normalizeLine({ ...line, id: nid("l") }));
        const claim: Claim = {
          id: nid("c"),
          patientId: input.patientId,
          payerName: input.payerName,
          filingCode: input.filingCode,
          dateOfService: input.dateOfService,
          placeOfService: input.placeOfService,
          lines,
          status: input.status ?? "draft",
          source: input.source ?? "manual",
          agentNote: input.agentNote,
          appointmentId: input.appointmentId,
          encounterId: input.encounterId,
          tradingPartnerId: input.tradingPartnerId,
          holdReason: input.holdReason,
          demoScenario: input.demoScenario,
          idempotencyKey: input.idempotencyKey || crypto.randomUUID(),
          controlNumber: `AC${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
          events: [],
          clinicalNote: input.clinicalNote ?? "",
          attachments: [],
          assignmentOfBenefits: input.assignmentOfBenefits !== false,
          priorAuthNumber: input.priorAuthNumber?.trim() ?? "",
          claimFrequencyCode:
            input.claimFrequencyCode === "7" || input.claimFrequencyCode === "8"
              ? input.claimFrequencyCode
              : "1",
          payerClaimControlNumber: input.payerClaimControlNumber?.trim() ?? "",
          createdAt: now,
          updatedAt: now,
        };
        const current = getSnapshot();
        commit({ ...current, claims: [claim, ...current.claims] });
        return claim;
      },
      updateClaim: (id, patch) => {
        const current = getSnapshot();
        commit({
          ...current,
          claims: current.claims.map((claim) =>
            claim.id === id ? { ...claim, ...patch, updatedAt: new Date().toISOString() } : claim,
          ),
        });
      },
      addAppointment: (input) => {
        const appointment: Appointment = {
          id: nid("a"),
          patientId: input.patientId,
          providerName: input.providerName,
          start: input.start,
          durationMinutes: input.durationMinutes,
          reason: input.reason,
          status: input.status,
          notes: input.notes,
          visitType: input.visitType ?? "follow_up",
          room: input.room ?? "Room 1",
          confirmation: input.confirmation ?? "unconfirmed",
          chiefComplaint: input.reason,
          assessment: "",
          plan: "",
          vitals: emptyVitals(),
          copayCollected: null,
          scheduledProcedures: [],
          opNoteStatus: "not_required",
          unableToCode: false,
          codingFlag: "",
        };
        const current = getSnapshot();
        commit({ ...current, appointments: [appointment, ...current.appointments] });
        return appointment;
      },
      updateAppointment: (id, patch) => {
        const current = getSnapshot();
        commit({
          ...current,
          appointments: current.appointments.map((appointment) =>
            appointment.id === id ? { ...appointment, ...patch } : appointment,
          ),
        });
      },
      removeAppointment: (id) => {
        const current = getSnapshot();
        removedAppointmentIds.add(id);
        commit({
          ...current,
          appointments: current.appointments.filter((appointment) => appointment.id !== id),
        });
      },
      addEligibility: (result) => {
        const saved: EligibilityResult = { ...result, id: nid("e"), createdAt: new Date().toISOString() };
        const current = getSnapshot();
        commit({ ...current, eligibility: [saved, ...current.eligibility] });
        return saved;
      },
      clearPatientEligibility: (patientId) => {
        const current = getSnapshot();
        for (const check of current.eligibility) {
          if (check.patientId === patientId) removedEligibilityIds.add(check.id);
        }
        commit({
          ...current,
          eligibility: current.eligibility.filter((check) => check.patientId !== patientId),
        });
      },
      updatePractice: (patch) => {
        const current = getSnapshot();
        commit({
          ...current,
          practice: normalizePractice({
            ...current.practice,
            ...patch,
            updatedAt: new Date().toISOString(),
          }),
        });
      },
    };
  }, [state]);

  return <RcmContext.Provider value={value}>{children}</RcmContext.Provider>;
}

export function useRcm() {
  const value = useContext(RcmContext);
  if (!value) throw new Error("Practice desk is unavailable outside admin.");
  return value;
}
