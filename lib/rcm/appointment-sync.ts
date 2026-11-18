import { STORAGE_KEY } from "@/lib/rcm/seed";
import type { Appointment } from "@/lib/rcm/types";

export const REMOVED_APPOINTMENTS_KEY = `${STORAGE_KEY}:removed-appointments`;

export function readRemovedAppointmentIds(getItem: (key: string) => string | null = defaultGet): string[] {
  try {
    const raw = getItem(REMOVED_APPOINTMENTS_KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((id): id is string => typeof id === "string" && id.length > 0 && id.length < 80);
  } catch {
    return [];
  }
}

export function writeRemovedAppointmentIds(
  ids: Iterable<string>,
  setItem: (key: string, value: string) => void = defaultSet,
) {
  setItem(REMOVED_APPOINTMENTS_KEY, JSON.stringify([...new Set(ids)]));
}

/**
 * Merge server roster visits with local desk state.
 * - Tombstoned ids never return.
 * - Visits previously seen on the server that vanish are treated as deleted (not
 *   re-pushed as optimistic "pending"), which stops multi-tab resurrection.
 */
/** How many consecutive roster polls must omit a tombstoned id before we forget it. */
export const REMOVED_APPOINTMENT_CLEAR_POLLS = 30;

export function mergeAppointmentRoster(input: {
  local: Appointment[];
  server: Appointment[];
  serverPatientIds: Set<string>;
  removedIds: Iterable<string>;
  seenServerIds: Iterable<string>;
  /** Prior consecutive-absent counts for tombstoned ids. */
  removedAbsentPolls?: Record<string, number>;
}): {
  appointments: Appointment[];
  removedIds: string[];
  seenServerIds: string[];
  removedAbsentPolls: Record<string, number>;
  hasLocalOnly: boolean;
} {
  const removed = new Set(
    [...input.removedIds].filter((id) => typeof id === "string" && id.length > 0 && id.length < 80),
  );
  const seen = new Set(
    [...input.seenServerIds].filter((id) => typeof id === "string" && id.length > 0 && id.length < 80),
  );
  const serverIds = new Set(input.server.map((visit) => visit.id));
  const absent: Record<string, number> = { ...(input.removedAbsentPolls ?? {}) };

  // Keep tombstones until the server has omitted them for several polls so a
  // failed/lagging delete cannot clear the shield and let the visit rebound.
  for (const id of [...removed]) {
    if (serverIds.has(id)) {
      absent[id] = 0;
      continue;
    }
    const next = (absent[id] ?? 0) + 1;
    if (next >= REMOVED_APPOINTMENT_CLEAR_POLLS) {
      removed.delete(id);
      delete absent[id];
    } else {
      absent[id] = next;
    }
  }
  for (const id of Object.keys(absent)) {
    if (!removed.has(id)) delete absent[id];
  }

  const shared = input.server.filter(
    (visit) => !removed.has(visit.id) && input.serverPatientIds.has(visit.patientId),
  );

  // Brand-new local books only — never resurrect a visit the server used to own.
  const pending = input.local.filter(
    (visit) =>
      input.serverPatientIds.has(visit.patientId) &&
      !serverIds.has(visit.id) &&
      !removed.has(visit.id) &&
      !seen.has(visit.id),
  );

  const localOnlyPatients = input.local.filter(
    (visit) =>
      !input.serverPatientIds.has(visit.patientId) &&
      !removed.has(visit.id),
  );

  for (const visit of input.server) seen.add(visit.id);

  return {
    appointments: [...shared, ...pending, ...localOnlyPatients],
    removedIds: [...removed],
    seenServerIds: [...seen],
    removedAbsentPolls: absent,
    hasLocalOnly: pending.length > 0 || localOnlyPatients.length > 0,
  };
}

function defaultGet(key: string) {
  if (typeof localStorage === "undefined") return null;
  return localStorage.getItem(key);
}

function defaultSet(key: string, value: string) {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, value);
}
