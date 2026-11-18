import { describe, expect, it } from "vitest";
import { pushCharts, createPortalDb } from "@/lib/portal/engine";
import { withChart, emptyVitals } from "@/lib/rcm/chart";
import {
  mergeAppointmentRoster,
  readRemovedAppointmentIds,
  writeRemovedAppointmentIds,
} from "@/lib/rcm/appointment-sync";
import type { Appointment } from "@/lib/rcm/types";

function visit(id: string, patientId = "p_1"): Appointment {
  return {
    id,
    patientId,
    providerName: "Elvis Francois, MD",
    start: "2026-11-23T11:00:00",
    durationMinutes: 30,
    reason: "Follow up",
    status: "scheduled",
    notes: "",
    visitType: "follow_up",
    room: "Room 1",
    confirmation: "unconfirmed",
    chiefComplaint: "",
    assessment: "",
    plan: "",
    vitals: emptyVitals(),
    copayCollected: null,
    scheduledProcedures: [],
    opNoteStatus: "not_required",
    unableToCode: false,
    codingFlag: "",
  };
}

describe("appointment delete sync", () => {
  it("does not re-queue a visit the server used to have after it disappears", () => {
    const local = [visit("a_dup"), visit("a_new_local")];
    const first = mergeAppointmentRoster({
      local,
      server: [visit("a_dup")],
      serverPatientIds: new Set(["p_1"]),
      removedIds: [],
      seenServerIds: [],
    });
    expect(first.appointments.map((row) => row.id).sort()).toEqual(["a_dup", "a_new_local"]);

    // Server delete lands; stale tab still has a_dup locally.
    const afterDelete = mergeAppointmentRoster({
      local: [visit("a_dup"), visit("a_new_local")],
      server: [],
      serverPatientIds: new Set(["p_1"]),
      removedIds: [],
      seenServerIds: first.seenServerIds,
    });
    expect(afterDelete.appointments.map((row) => row.id)).toEqual(["a_new_local"]);
    expect(afterDelete.hasLocalOnly).toBe(true);
  });

  it("keeps tombstoned visits off the roster until the server drops them", () => {
    const merged = mergeAppointmentRoster({
      local: [],
      server: [visit("a_dup")],
      serverPatientIds: new Set(["p_1"]),
      removedIds: ["a_dup"],
      seenServerIds: ["a_dup"],
    });
    expect(merged.appointments).toEqual([]);
    expect(merged.removedIds).toEqual(["a_dup"]);
  });

  it("does not clear a tombstone until many consecutive absent polls", () => {
    let removedIds = ["a_dup"];
    let absent: Record<string, number> = {};
    let seenServerIds = ["a_dup"];
    for (let i = 1; i <= 29; i += 1) {
      const step = mergeAppointmentRoster({
        local: [],
        server: [],
        serverPatientIds: new Set(["p_1"]),
        removedIds,
        seenServerIds,
        removedAbsentPolls: absent,
      });
      expect(step.removedIds).toEqual(["a_dup"]);
      expect(step.removedAbsentPolls.a_dup).toBe(i);
      removedIds = step.removedIds;
      absent = step.removedAbsentPolls;
      seenServerIds = step.seenServerIds;
    }
    const cleared = mergeAppointmentRoster({
      local: [],
      server: [],
      serverPatientIds: new Set(["p_1"]),
      removedIds,
      seenServerIds,
      removedAbsentPolls: absent,
    });
    expect(cleared.removedIds).toEqual([]);
  });

  it("persists removed appointment ids", () => {
    const store = new Map<string, string>();
    writeRemovedAppointmentIds(["a_1", "a_2"], (key, value) => store.set(key, value));
    expect(readRemovedAppointmentIds((key) => store.get(key) ?? null)).toEqual(["a_1", "a_2"]);
  });

  it("drops a removed visit even when the push carries no appointment list", () => {
    const chart = withChart({
      firstName: "Ada",
      lastName: "Lovelace",
      dateOfBirth: "1990-01-01",
      sex: "female",
      phone: "404-555-0100",
      email: "ada@example.com",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      payerName: "",
      memberId: "",
    });
    chart.id = "p_ada";
    const appt = visit("a_ada", "p_ada");
    const saved = pushCharts(createPortalDb(), [chart], [appt]);
    expect(saved.visits).toHaveLength(1);
    const removed = pushCharts(saved, [chart], [], new Date(), ["a_ada"]);
    expect(removed.visits).toHaveLength(0);
  });
});
