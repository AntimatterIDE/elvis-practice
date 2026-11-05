import { describe, expect, it } from "vitest";
import { mergeClaimsByUpdatedAt } from "@/lib/rcm/claims-merge";
import type { Claim } from "@/lib/rcm/types";

function claim(partial: Partial<Claim> & Pick<Claim, "id" | "updatedAt">): Claim {
  return {
    patientId: "p1",
    payerName: "Fidelis",
    dateOfService: "2026-11-05",
    status: "ready",
    controlNumber: "AC123",
    placeOfService: "11",
    lines: [],
    source: "manual",
    createdAt: "2026-11-05T12:00:00.000Z",
    events: [],
    clinicalNote: "",
    attachments: [],
    ...partial,
  };
}

describe("mergeClaimsByUpdatedAt", () => {
  it("keeps the newer claim and queues local-only rows for upsert", () => {
    const localNewer = claim({ id: "c1", updatedAt: "2026-11-05T14:00:00.000Z", status: "ready" });
    const remoteOlder = claim({ id: "c1", updatedAt: "2026-11-05T13:00:00.000Z", status: "draft" });
    const localOnly = claim({ id: "c2", updatedAt: "2026-11-05T14:30:00.000Z", status: "ready" });
    const remoteOnly = claim({ id: "c3", updatedAt: "2026-11-05T12:00:00.000Z", status: "submitted" });

    const { claims, needsUpsert } = mergeClaimsByUpdatedAt([localNewer, localOnly], [remoteOlder, remoteOnly]);
    expect(claims.map((row) => row.id).sort()).toEqual(["c1", "c2", "c3"]);
    expect(claims.find((row) => row.id === "c1")?.status).toBe("ready");
    expect(needsUpsert.map((row) => row.id).sort()).toEqual(["c1", "c2"]);
  });
});
