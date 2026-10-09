import { describe, expect, it } from "vitest";
import { buildProfessionalClaim, productionClaimProblems, type ClaimSubmissionInput } from "@/lib/stedi/payload";
import { summarizeEligibility } from "@/lib/stedi/parse";

const ready: ClaimSubmissionInput = {
  claimId: "claim-1",
  status: "ready",
  controlNumber: "CLM1001",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  tradingPartnerId: "60054",
  payerName: "Aetna",
  dateOfService: "2026-10-01",
  placeOfService: "11",
  patient: {
    firstName: "Riley",
    lastName: "Chen",
    dateOfBirth: "1990-04-04",
    sex: "female",
    memberId: "W123456789",
    address: "10 Main St",
    city: "Rochester",
    state: "NY",
    postalCode: "14604",
  },
  practice: {
    legalName: "The Alignment Clinic",
    physicianName: "Elvis Francois, MD",
    npi: "1234567893",
    taxId: "98-7654321",
    taxonomy: "207X00000X",
    phone: "5855550100",
    address: "20 Clinic Way, Rochester, NY 14604",
  },
  lines: [
    {
      cpt: "99213",
      modifiers: [],
      units: 1,
      charge: 175,
      diagnoses: ["M54.50"],
      includeOnBill: true,
      physician: "Elvis Francois, MD",
    },
  ],
};

describe("production claims", () => {
  it("files a production claim only when the practice and patient are complete", () => {
    expect(productionClaimProblems(ready)).toEqual([]);
    const built = buildProfessionalClaim(ready);
    expect(built.body.usageIndicator).toBe("P");
    expect(built.body.billing.npi).toBe("1234567893");
    expect(built.body.billing.address.city).toBe("Rochester");
    expect(built.body.subscriber.memberId).toBe("W123456789");
  });

  it("refuses a blank practice identity and a demo member id", () => {
    const blank = productionClaimProblems({
      ...ready,
      tradingPartnerId: "STEDI",
      patient: { ...ready.patient, memberId: "STEDI_PAID_HALE01" },
      practice: { ...ready.practice, npi: "", taxId: "", address: "" },
    });
    expect(blank[0]).toContain("NPI");
    expect(blank.some((problem) => problem.includes("demo member"))).toBe(true);
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
