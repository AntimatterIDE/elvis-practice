import { describe, expect, it, beforeEach } from "vitest";
import { createMockErxAdapter, getMockDraft, resetMockErxState } from "@/lib/erx/mock-adapter";
import { createDoseSpotErxAdapter } from "@/lib/erx/dosespot-adapter";
import { isControlledSchedule, scheduleLabel } from "@/lib/erx/client";
import { normalizePrescription } from "@/lib/rcm/chart";
import { prescriptionFileSlot } from "@/lib/rcm/claim-files";
import type { ErxCodedDraft, ErxPatientSync } from "@/lib/erx/types";
import type { Prescription } from "@/lib/rcm/types";

const samplePatient: ErxPatientSync = {
  externalId: "p_demo",
  firstName: "Elena",
  lastName: "Voss",
  dateOfBirth: "1984-04-12",
  sex: "female",
  address1: "1 Clinic Way",
  city: "Brooklyn",
  state: "NY",
  zip: "11214",
  phone: "7185550100",
  allergies: ["NKDA"],
};

function sampleDraft(overrides: Partial<ErxCodedDraft> = {}): ErxCodedDraft {
  return {
    patientExternalId: "p_demo",
    drugName: "Ibuprofen",
    dose: "600 mg",
    sig: "Take 1 tablet PO q8h PRN pain",
    quantity: "30",
    daysSupply: "30",
    refills: 0,
    schedule: "non_controlled",
    pharmacyNcpdpId: "3312345",
    ...overrides,
  };
}

describe("eRx mock adapter", () => {
  beforeEach(() => {
    resetMockErxState();
  });

  it("searches pharmacies and drugs deterministically", async () => {
    const adapter = createMockErxAdapter();
    const pharmacies = await adapter.searchPharmacies("Bay");
    expect(pharmacies.some((row) => row.ncpdpId === "3312345")).toBe(true);
    const drugs = await adapter.searchDrugs("oxy");
    expect(drugs[0]?.name).toBe("Oxycodone");
    expect(drugs[0]?.schedule).toBe("II");
  });

  it("moves draft → pending_signature → sent and simulates fill", async () => {
    const adapter = createMockErxAdapter();
    const synced = await adapter.upsertPatient(samplePatient);
    expect(synced.ok).toBe(true);

    const draft = await adapter.createDraft(sampleDraft());
    expect(draft.ok).toBe(true);
    expect(draft.vendorPrescriptionId).toBeTruthy();
    const id = draft.vendorPrescriptionId!;
    expect(getMockDraft(id)?.status).toBe("draft");

    const queued = await adapter.queueForSignature(id);
    expect(queued.ok).toBe(true);
    expect(getMockDraft(id)?.status).toBe("pending_signature");

    const sent = await adapter.send(id);
    expect(sent.ok).toBe(true);
    expect(sent.fillSimulatedAt).toBeTruthy();
    expect(getMockDraft(id)?.status).toBe("sent");
  });

  it("requires a mock EPCS PIN for controlled send", async () => {
    const adapter = createMockErxAdapter();
    const draft = await adapter.createDraft(
      sampleDraft({
        drugName: "Oxycodone",
        dose: "5 mg",
        sig: "Take 1 tablet PO q6h PRN",
        quantity: "20",
        daysSupply: "5",
        schedule: "II",
      }),
    );
    const id = draft.vendorPrescriptionId!;
    await adapter.queueForSignature(id);
    const bad = await adapter.sendEpcs(id, "abc");
    expect(bad.ok).toBe(false);
    const good = await adapter.sendEpcs(id, "1234");
    expect(good.ok).toBe(true);
    expect(getMockDraft(id)?.status).toBe("sent");
  });

  it("cancels a draft and seeds inbox renewals", async () => {
    const adapter = createMockErxAdapter();
    const draft = await adapter.createDraft(
      sampleDraft({
        drugName: "Gabapentin",
        dose: "300 mg",
        sig: "Take 1 capsule PO TID",
        quantity: "90",
        daysSupply: "30",
        refills: 1,
        pharmacyNcpdpId: "3398765",
      }),
    );
    const id = draft.vendorPrescriptionId!;
    const cancelled = await adapter.cancel(id);
    expect(cancelled.ok).toBe(true);
    expect(getMockDraft(id)?.status).toBe("cancelled");
    const resent = await adapter.send(id);
    expect(resent.ok).toBe(false);

    const inbox = await adapter.listInbox("p_demo");
    expect(inbox.length).toBeGreaterThanOrEqual(2);
    expect(inbox.some((item) => item.kind === "renewal")).toBe(true);
  });
});

describe("DoseSpot stub", () => {
  it("refuses live calls without credentials", async () => {
    const adapter = createDoseSpotErxAdapter();
    expect(adapter.name).toBe("dosespot");
    const draft = await adapter.createDraft(sampleDraft({ patientExternalId: "x" }));
    expect(draft.ok).toBe(false);
    expect(draft.message).toMatch(/not configured/i);
    expect(adapter.signatureFrameUrl?.("any") ?? null).toBeNull();
  });
});

describe("prescription chart model", () => {
  it("normalizes status transitions and I-STOP stamp", () => {
    const raw = {
      id: "rx_1",
      patientId: "p_1",
      drugName: "Tramadol",
      dose: "50 mg",
      sig: "1 tab PO q6h PRN",
      quantity: "30",
      daysSupply: "7",
      refills: 0,
      schedule: "IV",
      pharmacyName: "Bay Parkway Pharmacy",
      pharmacyNcpdpId: "3312345",
      status: "pending_signature",
      istopCheckedAt: "2026-11-15T12:00:00.000Z",
      istopCheckedBy: "Dr. Francois",
      createdAt: "2026-11-15T11:00:00.000Z",
      updatedAt: "2026-11-15T12:00:00.000Z",
      events: [{ id: "e1", kind: "istop", at: "2026-11-15T12:00:00.000Z", summary: "I-STOP" }],
    } satisfies Partial<Prescription>;
    const rx = normalizePrescription(raw);
    expect(rx).not.toBeNull();
    expect(rx!.status).toBe("pending_signature");
    expect(rx!.istopCheckedAt).toBe("2026-11-15T12:00:00.000Z");
    expect(rx!.events).toHaveLength(1);
    expect(prescriptionFileSlot("rx_1")).toBe("prescription-rx_1");
  });

  it("labels controlled schedules for the UI gate", () => {
    expect(isControlledSchedule("II")).toBe(true);
    expect(isControlledSchedule("non_controlled")).toBe(false);
    expect(scheduleLabel("IV")).toBe("Schedule IV");
  });
});
