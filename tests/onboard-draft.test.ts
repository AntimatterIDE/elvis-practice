import { describe, expect, it } from "vitest";
import {
  applyOnboardDocumentHints,
  buildMinerCorpus,
  chartSlotsForOnboardFiles,
  enrichOnboardDraftFromCorpus,
  intakeAnswersFromOnboardDraft,
  markSlotsFromUploads,
  mergeSectionDrafts,
  normalizeOnboardDraft,
  patientFromOnboardDraft,
} from "@/lib/ocr/onboard-draft";
import { defaultDocuments } from "@/lib/rcm/chart";

function emptyish() {
  return {
    firstName: "",
    lastName: "",
    dateOfBirth: "",
    sex: "unknown",
    phone: "",
    email: "",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    payerName: "",
    memberId: "",
    reasonForVisit: "",
    medicalHistory: "",
    surgicalHistory: "",
    pcpName: "",
    pcpPhone: "",
    referringName: "",
    referringPhone: "",
    pharmacyName: "",
    pharmacyPhone: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelation: "",
    imagingFindings: "",
    problems: [],
    medications: [],
    allergies: [],
    injuryCase: null,
    documentHints: ["outside-records"],
    warnings: [],
    sourceSummary: "",
  };
}

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

  it("folds OCR corpus into medical history and injury notes", () => {
    const draft = enrichOnboardDraftFromCorpus(
      normalizeOnboardDraft({
        firstName: "Pat",
        lastName: "Lee",
        dateOfBirth: "1990-01-01",
        sex: "female",
        phone: "",
        email: "",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        payerName: "",
        memberId: "",
        reasonForVisit: "Neck pain",
        medicalHistory: "Prior PT",
        problems: [],
        medications: [],
        allergies: [],
        injuryCase: {
          caseNumber: "",
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
        documentHints: ["outside-records"],
        warnings: [],
        sourceSummary: "",
      }),
      "Consultation: cervical radiculopathy with MRI C5-C6 disc herniation.",
    );
    expect(draft.medicalHistory).toContain("Prior PT");
    expect(draft.medicalHistory).toContain("Outside records excerpt");
    expect(draft.medicalHistory).toContain("cervical radiculopathy");
    expect(draft.injuryCase?.notes).toContain("cervical radiculopathy");
    expect(draft.sourceSummary).toContain("Consultation");
  });

  it("merges section drafts and maps intake answers", () => {
    const a = normalizeOnboardDraft({
      ...emptyish(),
      firstName: "Pat",
      lastName: "Lee",
      phone: "555-0100",
      emergencyName: "Sam",
    });
    const b = normalizeOnboardDraft({
      ...emptyish(),
      medicalHistory: "Prior fusion",
      surgicalHistory: "ACDF 2019",
      problems: [{ name: "Radiculopathy", icd: "M54.16", status: "active", onset: "" }],
    });
    const c = normalizeOnboardDraft({
      ...emptyish(),
      imagingFindings: "C5-6 herniation",
      documentHints: ["outside-imaging"],
    });
    const merged = mergeSectionDrafts([a, b, c]);
    expect(merged.firstName).toBe("Pat");
    expect(merged.surgicalHistory).toBe("ACDF 2019");
    expect(merged.imagingFindings).toContain("herniation");
    expect(merged.documentHints).toEqual(expect.arrayContaining(["outside-records", "outside-imaging"]));
    const answers = intakeAnswersFromOnboardDraft(
      [
        { id: "firstName", mapsTo: "firstName" },
        { id: "phone", mapsTo: "phone" },
        { id: "emergencyName", mapsTo: "emergencyName" },
      ],
      merged,
    );
    expect(answers).toEqual({ firstName: "Pat", phone: "555-0100", emergencyName: "Sam" });
  });

  it("maps packet hints to chart slots and marks filed documents", () => {
    const pdf = new File(["x"], "packet.pdf", { type: "application/pdf" });
    const slots = chartSlotsForOnboardFiles([pdf], ["outside-records", "outside-imaging"], [
      { label: "imaging" },
      { label: "consult" },
    ]);
    expect(slots).toEqual(expect.arrayContaining(["outside-records", "outside-imaging", "consultation-report"]));
    const docs = markSlotsFromUploads(defaultDocuments(), [
      { slotId: "outside-records", fileName: "packet.pdf" },
      { slotId: "outside-imaging", fileName: "packet.pdf" },
    ]);
    expect(docs.find((item) => item.id === "outside-records")?.note).toContain("packet.pdf");
    expect(docs.find((item) => item.id === "outside-imaging")?.status).toBe("received");
  });
});
