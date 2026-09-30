import { describe, expect, it } from "vitest";
import { parsePracticeCsv } from "@/lib/rcm/import";
import { summarizeClaims } from "@/lib/rcm/metrics";
import { createSeedState } from "@/lib/rcm/seed";

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

  it("summarizes the seeded claims", () => {
    const summary = summarizeClaims(createSeedState().claims);
    expect(summary.billed).toBeGreaterThan(0);
    expect(summary.firstPass).toBeGreaterThan(0);
    expect(summary.firstPass).toBeLessThanOrEqual(1);
  });
});
