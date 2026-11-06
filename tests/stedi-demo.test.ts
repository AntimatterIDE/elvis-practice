import { describe, expect, it } from "vitest";
import { buildProfessionalClaim, claimContentProblems, productionClaimProblems, type ClaimSubmissionInput } from "@/lib/stedi/payload";
import { summarizeEligibility } from "@/lib/stedi/parse";

const ready: ClaimSubmissionInput = {
  claimId: "claim-1",
  status: "ready",
  controlNumber: "CLM1001",
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  tradingPartnerId: "60054",
  payerName: "Aetna",
  filingCode: "CI",
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

  it("bills The Alignment Clinic with its EIN and Dr. Francois as rendering", () => {
    const built = buildProfessionalClaim(ready);
    expect(built.body.billing).toMatchObject({
      organizationName: "The Alignment Clinic",
      employerId: "987654321",
      npi: "1234567893",
    });
    expect(built.body.billing).not.toHaveProperty("firstName");
    expect(built.body.claimInformation.serviceLines[0].renderingProvider).toMatchObject({
      firstName: "Elvis",
      lastName: "Francois",
      npi: "1234567893",
    });
    const titled = buildProfessionalClaim({
      ...ready,
      practice: { ...ready.practice, physicianName: "Dr. Elvis  Francois, M.D." },
    });
    expect(titled.body.claimInformation.serviceLines[0].renderingProvider).toMatchObject({
      firstName: "Elvis",
      lastName: "Francois",
    });
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
    expect(blank.some((problem) => problem.includes("test payer STEDI"))).toBe(true);
  });

  it("refuses a claim when the Stedi payer id was never picked", () => {
    const problems = productionClaimProblems({ ...ready, tradingPartnerId: "" });
    expect(problems.some((problem) => problem.includes("Stedi list"))).toBe(true);
  });

  it("refuses a free-text state that is not a two-letter code", () => {
    const problems = productionClaimProblems({
      ...ready,
      patient: { ...ready.patient, state: "New York" },
    });
    expect(problems.some((problem) => problem.includes("two-letter state"))).toBe(true);
    expect(buildProfessionalClaim(ready).body.subscriber.address.state).toBe("NY");
  });

  it("maps assignment of benefits and prior auth onto the 837P", () => {
    const assigned = buildProfessionalClaim({ ...ready, assignmentOfBenefits: true, priorAuthNumber: "AUTH-99" });
    expect(assigned.body.claimInformation.planParticipationCode).toBe("A");
    expect(assigned.body.claimInformation.benefitsAssignmentCertificationIndicator).toBe("Y");
    expect(assigned.body.claimInformation.claimSupplementalInformation).toEqual({
      priorAuthorizationNumber: "AUTH-99",
    });
    const patientPaid = buildProfessionalClaim({ ...ready, assignmentOfBenefits: false });
    expect(patientPaid.body.claimInformation.planParticipationCode).toBe("C");
    expect(patientPaid.body.claimInformation.benefitsAssignmentCertificationIndicator).toBe("N");
    expect(patientPaid.body.claimInformation).not.toHaveProperty("claimSupplementalInformation");
  });

  it("sends the payer type the biller chose and refuses a claim without one", () => {
    expect(claimContentProblems(ready)).toEqual([]);
    expect(buildProfessionalClaim({ ...ready, filingCode: "MB" }).body.claimInformation.claimFilingCode).toBe("MB");
    const missing = "Choose the payer type on the claim before submitting.";
    expect(claimContentProblems({ ...ready, filingCode: undefined })).toEqual([missing]);
    expect(claimContentProblems({ ...ready, filingCode: "ZZ" })).toEqual([missing]);
  });

  it("points each line at its own diagnoses in claim order", () => {
    const line = ready.lines[0];
    const built = buildProfessionalClaim({
      ...ready,
      lines: [
        { ...line, cpt: "63047", diagnoses: ["M48.062", "m51.17"] },
        { ...line, cpt: "63048", units: 2, modifiers: ["59"], diagnoses: ["M51.17"] },
        { ...line, cpt: "J1010", diagnoses: ["M54.16"], includeOnBill: false },
      ],
    });
    const claim = built.body.claimInformation;
    expect(claim.healthCareCodeInformation).toEqual([
      { diagnosisTypeCode: "ABK", diagnosisCode: "M48062" },
      { diagnosisTypeCode: "ABF", diagnosisCode: "M5117" },
    ]);
    expect(claim.serviceLines.map((service) => service.professionalService.compositeDiagnosisCodePointers.diagnosisCodePointers)).toEqual([
      ["1", "2"],
      ["2"],
    ]);
    expect(claim.serviceLines[1]?.professionalService).toMatchObject({
      procedureCode: "63048",
      procedureModifiers: ["59"],
      serviceUnitCount: "2",
      lineItemChargeAmount: "350.00",
    });
  });

  it("refuses lines a payer would reject for their diagnoses or units", () => {
    const line = ready.lines[0];
    expect(claimContentProblems({ ...ready, lines: [{ ...line, diagnoses: [] }] })).toEqual(["Line 1: link at least one diagnosis."]);
    expect(claimContentProblems({ ...ready, lines: [{ ...line, units: 0 }] })).toEqual(["Line 1: units must be more than 0."]);
    expect(claimContentProblems({ ...ready, lines: [{ ...line, diagnoses: ["M48.062", "M51.17", "M54.16", "M54.50", "G89.29"] }] })).toEqual([
      "Line 1: a line can point to at most 4 diagnoses.",
    ]);
    expect(claimContentProblems({ ...ready, lines: [line, { ...line, diagnoses: [], includeOnBill: false }] })).toEqual([]);
    const thirteen = Array.from({ length: 13 }, (_, index) => `M54.${index + 10}`);
    const crowded = [0, 4, 8, 12].map((start) => ({ ...line, diagnoses: thirteen.slice(start, start + 4) }));
    expect(claimContentProblems({ ...ready, lines: crowded })).toEqual([
      "A claim can carry at most 12 diagnoses and this one has 13. Split the lines over two claims.",
    ]);
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

  it("prefers out-of-network benefit amounts for this practice", () => {
    const summary = summarizeEligibility({
      planStatus: [{ status: "Active Coverage" }],
      benefitsInformation: [
        { code: "1", name: "Active Coverage" },
        { code: "B", benefitAmount: "20", inPlanNetworkIndicator: "Y" },
        { code: "B", benefitAmount: "45", inPlanNetworkIndicator: "N" },
        { code: "A", benefitPercent: "0.2", inPlanNetworkIndicator: "Y" },
        { code: "A", benefitPercent: "0.4", inPlanNetworkIndicator: "N" },
      ],
    });
    expect(summary.copay).toBe(45);
    expect(summary.coinsurance).toBe(40);
    expect(summary.summary).toContain("out-of-network");
  });
});
