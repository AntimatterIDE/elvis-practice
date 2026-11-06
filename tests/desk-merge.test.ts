import { describe, expect, it } from "vitest";
import { mergePracticeDesk } from "@/lib/rcm/desk-merge";
import type { PracticeDeskSnapshot } from "@/lib/rcm/types";

function desk(partial: Partial<PracticeDeskSnapshot> & Pick<PracticeDeskSnapshot, "updatedAt">): PracticeDeskSnapshot {
  return {
    practice: {
      legalName: "The Alignment Clinic",
      physicianName: "Elvis Francois, MD",
      npi: "",
      taxId: "",
      taxonomy: "",
      phone: "",
      address: "",
      posCode: "11",
      updatedAt: "",
      ...(partial.practice ?? {}),
    },
    tasks: partial.tasks ?? [],
    eligibility: partial.eligibility ?? [],
    updatedAt: partial.updatedAt,
  };
}

describe("mergePracticeDesk", () => {
  it("keeps the newer practice profile and queues a local-only upsert", () => {
    const local = desk({
      updatedAt: "2026-11-06T01:00:00.000Z",
      practice: {
        legalName: "The Alignment Clinic",
        physicianName: "Elvis Francois, MD",
        npi: "1114306040",
        taxId: "432716632",
        taxonomy: "",
        phone: "",
        address: "1 Main St, Brooklyn, NY 11201",
        posCode: "11",
        updatedAt: "2026-11-06T01:00:00.000Z",
      },
      tasks: [{ id: "t1", patientId: "p1", title: "Call", detail: "", due: "", status: "open", updatedAt: "2026-11-06T01:00:00.000Z" }],
    });
    const remote = desk({
      updatedAt: "2026-11-05T12:00:00.000Z",
      practice: {
        legalName: "The Alignment Clinic",
        physicianName: "Elvis Francois, MD",
        npi: "",
        taxId: "",
        taxonomy: "",
        phone: "",
        address: "",
        posCode: "11",
        updatedAt: "2026-11-05T12:00:00.000Z",
      },
      tasks: [{ id: "t2", patientId: "p2", title: "Fax", detail: "", due: "", status: "open", updatedAt: "2026-11-05T12:00:00.000Z" }],
    });

    const { desk: merged, needsUpsert } = mergePracticeDesk(local, remote);
    expect(merged.practice.npi).toBe("1114306040");
    expect(merged.tasks.map((task) => task.id).sort()).toEqual(["t1", "t2"]);
    expect(needsUpsert).toBe(true);
  });

  it("uploads a local-only desk when the server has nothing yet", () => {
    const local = desk({
      updatedAt: "2026-11-06T01:00:00.000Z",
      practice: {
        legalName: "The Alignment Clinic",
        physicianName: "Elvis Francois, MD",
        npi: "1114306040",
        taxId: "432716632",
        taxonomy: "",
        phone: "",
        address: "1 Main St, Brooklyn, NY 11201",
        posCode: "11",
        updatedAt: "2026-11-06T01:00:00.000Z",
      },
    });
    const { needsUpsert } = mergePracticeDesk(local, null);
    expect(needsUpsert).toBe(true);
  });
});
