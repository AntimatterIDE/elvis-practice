import { describe, expect, it } from "vitest";
import { buildDemoDay } from "@/lib/rcm/demo-day";
import { createSeedState } from "@/lib/rcm/seed";
import { buildProfessionalClaim } from "@/lib/stedi/payload";
import { claimSubmissionInput } from "@/lib/rcm/submit-input";
import { summarizeEligibility } from "@/lib/stedi/parse";

describe("demo billing day", () => {
  const day = buildDemoDay(createSeedState().practice);

  it("keeps one case in coding and three ready test claims", () => {
    expect(day.patients.some((patient) => patient.id === "demo-coding")).toBe(true);
    expect(day.claims.map((claim) => claim.demoScenario).sort()).toEqual(["denied", "paid", "partial"]);
    expect(day.claims.every((claim) => claim.status === "ready")).toBe(true);
    expect(day.claims.map((claim) => claim.tradingPartnerId)).toEqual(["STEDI", "STEDI", "STEDI"]);
    const members = day.patients.map((patient) => patient.memberId);
    expect(members).toContain("STEDI_PAID_HALE01");
    expect(members).toContain("STEDI_PARTIALLY_PAID_BLAKE02");
    expect(members).toContain("STEDI_DENIED_MOSS03");
    expect(members).toContain("AETNA12345");
  });

  it("marks every electronic claim as test data", () => {
    const claim = day.claims[0];
    const patient = day.patients.find((item) => item.id === claim.patientId);
    if (!patient) throw new Error("missing patient");
    const built = buildProfessionalClaim(claimSubmissionInput(claim, patient, createSeedState().practice));
    expect(built.body.usageIndicator).toBe("T");
    expect(built.body.tradingPartnerServiceId).toBe("STEDI");
    expect(built.body.subscriber.memberId.startsWith("STEDI_")).toBe(true);
  });
});

describe("eligibility summary", () => {
  it("leaves a missing copay unknown", () => {
    const summary = summarizeEligibility({
      planStatus: [{ status: "Active Coverage" }],
      benefitsInformation: [{ code: "1", name: "Active Coverage" }],
    });
    expect(summary.active).toBe(true);
    expect(summary.copay).toBeNull();
    expect(summary.summary).toContain("copay unknown");
  });
});
