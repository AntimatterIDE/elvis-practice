"use client";

import { createContext, useContext, useMemo, useSyncExternalStore } from "react";
import { applyPrimaryCoverage, emptyVitals, normalizeState, withChart } from "@/lib/rcm/chart";
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
  ServiceLine,
} from "@/lib/rcm/types";

type RcmContextValue = RcmState & {
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
  resetDemo: () => void;
};

const RcmContext = createContext<RcmContextValue | null>(null);
const serverState = createSeedState();
const listeners = new Set<() => void>();
let clientState: RcmState | null = null;

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

function getSnapshot() {
  if (!clientState) {
    const stored = readStored();
    clientState = stored ? normalizeState(stored) : serverState;
  }
  return clientState;
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function commit(next: RcmState) {
  clientState = next;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  for (const listener of listeners) listener();
}

function nid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function RcmProvider({ children }: { children: React.ReactNode }) {
  const state = useSyncExternalStore(subscribe, getSnapshot, () => serverState);

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
        const lines: ServiceLine[] = input.lines.map((line) => ({ ...line, id: nid("l") }));
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
          controlNumber: `AC${crypto.randomUUID().replaceAll("-", "").slice(0, 10).toUpperCase()}`,
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
      resetDemo: () => {
        clientState = createSeedState();
        localStorage.removeItem(STORAGE_KEY);
        for (const listener of listeners) listener();
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
