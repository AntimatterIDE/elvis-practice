import { describe, expect, it } from "vitest";
import {
  applyOnboardDocumentHints,
  buildMinerCorpus,
  normalizeOnboardDraft,
  patientFromOnboardDraft,
} from "@/lib/ocr/onboard-draft";
import { defaultDocuments } from "@/lib/rcm/chart";

describe("onboard draft", () => {
  it("normalizes mined JSON and keeps outside-records hint", () => {
    const draft = normalizeOnboardDraft({
      firstName: "Jane",
      lastName: "Doe",
      dateOfBirth: "1980-05-01",
      sex: "female",
      phone: "",
      email: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      payerName: "",
      memberId: "",
      reasonForVisit: "Low back pain after MVA",
      medicalHistory: "",
      problems: [{ name: "Lumbar radiculopathy", icd: "M54.16", status: "active", onset: "2024-01-01" }],
      medications: [],
      allergies: [{ substance: "NKDA", reaction: "", severity: "unknown" }],
      injuryCase: {
        caseNumber: "NF-1",
        claimNumber: "",
        dateOfInjury: "2024-01-01",
        description: "MVA",
        carrierName: "",
        attorneyName: "",
        attorneyFirm: "",
        attorneyPhone: "",
        attorneyEmail: "",
        notes: "",
      },
      documentHints: ["outside-imaging"],
      warnings: [],
      sourceSummary: "Consult packet",
    });
    expect(draft.firstName).toBe("Jane");
    expect(draft.documentHints).toContain("outside-records");
    expect(draft.warnings.some((item) => /phone/i.test(item))).toBe(true);
    expect(draft.injuryCase?.dateOfInjury).toBe("2024-01-01");
  });

  it("builds miner corpus preferring clinical pages", () => {
    const corpus = buildMinerCorpus({
      text: "",
      pages: [
        { page: 1, text: "Attorney letter", label: "attorney_noise" },
        { page: 2, text: "Consultation HPI", label: "consult" },
        { page: 3, text: "MRI impression", label: "imaging" },
      ],
      maxChars: 10_000,
    });
    expect(corpus).toContain("Consultation HPI");
    expect(corpus).toContain("MRI impression");
    expect(corpus).not.toContain("Attorney letter");
  });

  it("marks document slots received per gap policy", () => {
    const docs = applyOnboardDocumentHints(defaultDocuments(), ["outside-records", "photo-id"], "OCR import");
    expect(docs.find((item) => item.id === "outside-records")?.status).toBe("received");
    expect(docs.find((item) => item.id === "photo-id")?.status).toBe("received");
    expect(docs.find((item) => item.id === "new-patient-intake")?.status).toBe("missing");
  });

  it("creates a patient chart without inventing tradingPartnerId", () => {
    const draft = normalizeOnboardDraft({
      firstName: "Ann",
      lastName: "Lee",
      dateOfBirth: "1975-02-02",
      sex: "female",
      phone: "555-0100",
      email: "a@example.com",
      address: "",
      city: "",
      state: "",
      postalCode: "",
      payerName: "Fidelis",
      memberId: "M1",
      reasonForVisit: "Neck pain",
      medicalHistory: "",
      problems: [],
      medications: [],
      allergies: [],
      injuryCase: null,
      documentHints: ["outside-records"],
      warnings: [],
      sourceSummary: "Agonaldo consult",
    });
    const patient = patientFromOnboardDraft(draft, "p_test");
    expect(patient.id).toBe("p_test");
    expect(patient.coverages[0]?.payerName).toBe("Fidelis");
    expect(patient.coverages[0]?.tradingPartnerId).toBeUndefined();
    expect(patient.documents.find((item) => item.id === "outside-records")?.status).toBe("received");
  });
});
