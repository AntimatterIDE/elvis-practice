import { describe, expect, it } from "vitest";
import { normalizeClaim } from "@/lib/rcm/chart";
import { claimFileSlot } from "@/lib/rcm/claim-files";
import { parsePracticeCsv } from "@/lib/rcm/import";
import { summarizeClaims } from "@/lib/rcm/metrics";
import { createSeedState } from "@/lib/rcm/seed";
import type { Claim } from "@/lib/rcm/types";

describe("practice desk demo data", () => {
  it("parses a patient and claim csv", () => {
    const parsed = parsePracticeCsv(
      ["first,last,dob,payer,member,dos,cpt,description,charge,icd", "Elena,Voss,1984-04-12,Aetna,AET1,2026-09-28,99214,Office visit,210,M54.5"].join(
        "\n",
      ),
    );
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.rows[0]).toMatchObject({ firstName: "Elena", charge: 210, cpt: "99214" });
  });

  it("rejects a csv without the expected columns", () => {
    const parsed = parsePracticeCsv("name,charge\nElena,10");
    expect(parsed.ok).toBe(false);
  });

  it("starts with an empty practice", () => {
    const state = createSeedState();
    expect(state.practice.legalName).toBe("The Alignment Clinic");
    expect(state.practice.npi).toBe("");
    expect(state.patients).toEqual([]);
    expect(state.appointments).toEqual([]);
    expect(state.claims).toEqual([]);
    expect(state.tasks).toEqual([]);
  });

  it("keeps a handwritten claim note and gives older claims empty papers", () => {
    const base = {
      id: "c_abcd1234",
      patientId: "p_1",
      payerName: "Aetna",
      dateOfService: "2026-10-14",
      status: "draft",
      controlNumber: "AC1",
      placeOfService: "11",
      lines: [],
      source: "manual",
      createdAt: "2026-10-22T00:00:00.000Z",
      updatedAt: "2026-10-22T00:00:00.000Z",
      events: [],
    } satisfies Omit<Claim, "clinicalNote" | "attachments">;
    const kept = normalizeClaim({
      ...base,
      clinicalNote: "Seen at another office.",
      attachments: [{ path: "p_1/claim-c_abcd1234/file", name: "note.pdf", contentType: "application/pdf", size: 12 }],
    });
    expect(kept.clinicalNote).toBe("Seen at another office.");
    expect(kept.attachments).toHaveLength(1);
    const older = normalizeClaim(base as unknown as Claim);
    expect(older.clinicalNote).toBe("");
    expect(older.attachments).toEqual([]);
    expect(claimFileSlot(base.id)).toBe("claim-c_abcd1234");
  });

  it("summarizes an empty claim list", () => {
    const summary = summarizeClaims(createSeedState().claims);
    expect(summary.billed).toBe(0);
    expect(summary.firstPass).toBe(0);
  });
});
