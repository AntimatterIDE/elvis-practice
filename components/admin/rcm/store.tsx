"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { applyPrimaryCoverage, emptyVitals, normalizeAppointment, normalizeLine, normalizePatient, normalizeState, withChart } from "@/lib/rcm/chart";
import { buildDemoDay } from "@/lib/rcm/demo-day";
import { STORAGE_KEY, createSeedState } from "@/lib/rcm/seed";
import type {
  Appointment,
  AppointmentInput,
  Claim,
  ClaimInput,
  EligibilityResult,
  Patient,
  PatientInput,
  PracticeProfile,
  PracticeTask,
  RcmState,
} from "@/lib/rcm/types";

type DeskSnapshot = RcmState & { rosterReady: boolean };

type RcmContextValue = DeskSnapshot & {
  ready: boolean;
  addPatient: (input: PatientInput) => Patient;
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
  updatePractice: (patch: Partial<PracticeProfile>) => void;
  loadDemoDay: () => void;
};

const RcmContext = createContext<RcmContextValue | null>(null);
const serverState = createSeedState();
const serverSnapshot: DeskSnapshot = { ...serverState, rosterReady: false };
const listeners = new Set<() => void>();
const portalListeners = new Set<(snap: { patients: Patient[]; appointments: Appointment[] }) => void>();
const removalListeners = new Set<(ids: string[]) => void>();
let clientState: RcmState | null = null;
let published: DeskSnapshot | null = null;
let rosterReady = false;
let portalReady = false;
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
  published = { ...clientState, rosterReady };
}

function getSnapshot() {
  ensureClient();
  if (!published) published = { ...clientState!, rosterReady };
  return published;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function emit() {
  published = { ...clientState!, rosterReady };
  for (const listener of listeners) listener();
}

function notifyPortalPush() {
  if (!clientState || !portalReady) return;
  const patients = clientState.patients.filter((patient) => portalIds.has(patient.id));
  if (!patients.length) return;
  const appointments = clientState.appointments.filter((appointment) => portalIds.has(appointment.patientId));
  const snap = { patients, appointments };
  for (const listener of portalListeners) listener(snap);
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
  if (mode !== "local" || !portalReady || !previous) return;
  const removed = previous.patients
    .filter((patient) => portalIds.has(patient.id) && !rest.patients.some((item) => item.id === patient.id))
    .map((patient) => patient.id);
  for (const id of removed) portalIds.delete(id);
  if (removed.length) {
    for (const listener of removalListeners) listener(removed);
  }
  notifyPortalPush();
}

export function subscribePortalRemoval(listener: (ids: string[]) => void) {
  removalListeners.add(listener);
  return () => {
    removalListeners.delete(listener);
  };
}

export function subscribePortalPush(listener: (snap: { patients: Patient[]; appointments: Appointment[] }) => void) {
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

export function mergePortalRoster(patients: Patient[], appointments: Appointment[]) {
  ensureClient();
  const current = clientState!;
  const ids = new Set(patients.map((patient) => patient.id));
  portalIds = ids;
  portalReady = true;
  rosterReady = true;
  const serverAppointmentIds = new Set(appointments.map((appointment) => appointment.id));
  const pending = current.appointments.filter(
    (appointment) => ids.has(appointment.patientId) && !serverAppointmentIds.has(appointment.id),
  );
  commit(
    {
      ...current,
      patients: [...patients.map((patient) => normalizePatient(patient)), ...current.patients.filter((patient) => !ids.has(patient.id))],
      appointments: [
        ...appointments.map((appointment) => normalizeAppointment(appointment)),
        ...pending,
        ...current.appointments.filter((appointment) => !ids.has(appointment.patientId)),
      ],
    },
    pending.length ? "local" : "merge",
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
        const task: PracticeTask = { ...input, id: nid("t"), status: "open" };
        const current = getSnapshot();
        commit({ ...current, tasks: [task, ...current.tasks] });
        return task;
      },
      setTaskStatus: (id, status) => {
        const current = getSnapshot();
        commit({
          ...current,
          tasks: current.tasks.map((task) => (task.id === id ? { ...task, status } : task)),
        });
      },
      addClaim: (input) => {
        const now = new Date().toISOString();
        const lines = input.lines.map((line) => normalizeLine({ ...line, id: nid("l") }));
        const claim: Claim = {
          id: nid("c"),
          patientId: input.patientId,
          payerName: input.payerName,
          dateOfService: input.dateOfService,
          placeOfService: input.placeOfService,
          lines,
          status: input.status ?? "draft",
          source: input.source ?? "manual",
          agentNote: input.agentNote,
          appointmentId: input.appointmentId,
          tradingPartnerId: input.tradingPartnerId,
          holdReason: input.holdReason,
          demoScenario: input.demoScenario,
          idempotencyKey: input.idempotencyKey || crypto.randomUUID(),
          controlNumber: `AC${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
          events: [],
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
      updatePractice: (patch) => {
        const current = getSnapshot();
        commit({ ...current, practice: { ...current.practice, ...patch } });
      },
      loadDemoDay: () => {
        const current = getSnapshot();
        const demo = buildDemoDay(current.practice);
        const incoming = new Set(demo.patients.map((patient) => patient.id));
        const drop = new Set(current.patients.filter((patient) => patient.flags.includes("demo") || incoming.has(patient.id)).map((patient) => patient.id));
        commit({
          ...current,
          patients: [...demo.patients, ...current.patients.filter((patient) => !drop.has(patient.id))],
          appointments: [...demo.appointments, ...current.appointments.filter((appointment) => !drop.has(appointment.patientId))],
          claims: [...demo.claims, ...current.claims.filter((claim) => !drop.has(claim.patientId))],
          eligibility: current.eligibility.filter((check) => !drop.has(check.patientId)),
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
