import { describe, expect, it } from "vitest";
import {
  applyOnboardDocumentHints,
  buildMinerCorpus,
  buildSectionCorpus,
  chartSlotsForOnboardFiles,
  dedupeProblems,
  enrichOnboardDraftFromCorpus,
  intakeAnswersFromOnboardDraft,
  markSlotsFromUploads,
  mergeSectionDrafts,
  normalizeOnboardDraft,
  patientFromOnboardDraft,
  refineIdentity,
  refineOnboardDraftFromCorpus,
  refreshOnboardWarnings,
} from "@/lib/ocr/onboard-draft";
import { normalizeIcdCode } from "@/lib/ocr/icd-normalize";
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

  it("keeps summary fields clean and does not dump raw OCR into history", () => {
    const draft = enrichOnboardDraftFromCorpus(
      normalizeOnboardDraft({
        ...emptyish(),
        firstName: "Pat",
        lastName: "Lee",
        dateOfBirth: "1990-01-01",
        sex: "female",
        reasonForVisit: "Neck pain",
        medicalHistory: "Prior PT\n\nOutside records excerpt:\nWhat: 20 µV/div noise dump",
        imagingFindings: "C5-6 disc bulge",
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
          notes: "Rear passenger\n\nOutside records excerpt:\nPAGE 2 emg_ncv tables",
        },
        documentHints: ["outside-records"],
        warnings: [],
        sourceSummary: "",
      }),
      "Consultation: cervical radiculopathy with MRI C5-C6 disc herniation.",
    );
    expect(draft.medicalHistory).toContain("Prior PT");
    expect(draft.medicalHistory).not.toContain("Outside records excerpt");
    expect(draft.medicalHistory).not.toContain("µV/div");
    expect(draft.injuryCase?.notes).toContain("Rear passenger");
    expect(draft.injuryCase?.notes).not.toContain("emg_ncv");
    expect(draft.imagingFindings).toContain("C5-6");
    expect(draft.sourceSummary).toContain("Consultation");
  });

  it("drops stale missing-field warnings once values are filled", () => {
    const draft = refreshOnboardWarnings(
      normalizeOnboardDraft({
        ...emptyish(),
        firstName: "Margaret",
        lastName: "Palmquist",
        phone: "(718) 255-6615",
        memberId: "000-04-9452",
        payerName: "NF",
        email: "",
        warnings: ["missing phone", "Missing member id", "Missing email", "Missing Referring name and phone"],
      }),
    );
    expect(draft.warnings.some((item) => /phone/i.test(item))).toBe(false);
    expect(draft.warnings.some((item) => /member/i.test(item))).toBe(false);
    expect(draft.warnings.some((item) => /payer/i.test(item))).toBe(false);
    expect(draft.warnings.some((item) => /referring/i.test(item))).toBe(false);
    expect(draft.warnings.some((item) => /email/i.test(item))).toBe(true);
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
    expect(slots).toEqual(expect.arrayContaining(["outside-records", "outside-imaging"]));
    expect(slots).not.toContain("consultation-report");
    const docs = markSlotsFromUploads(defaultDocuments(), [
      { slotId: "outside-records", fileName: "packet.pdf" },
      { slotId: "outside-imaging", fileName: "packet.pdf" },
    ]);
    expect(docs.find((item) => item.id === "outside-records")?.note).toContain("packet.pdf");
    expect(docs.find((item) => item.id === "outside-imaging")?.status).toBe("received");
  });

  it("splits CamelCase identity and strips honorifics", () => {
    const camel = refineIdentity(
      normalizeOnboardDraft({
        ...emptyish(),
        firstName: "SampleRadiculopathyCase",
        lastName: "",
      }),
    );
    expect(camel.firstName).toBe("Sample");
    expect(camel.lastName).toBe("Radiculopathy Case");

    const splitLast = refineIdentity(
      normalizeOnboardDraft({
        ...emptyish(),
        firstName: "Sample",
        lastName: "SampleRadiculopathyCase",
      }),
    );
    expect(splitLast.firstName).toBe("Sample");
    expect(splitLast.lastName).toBe("Radiculopathy Case");

    const honor = refineIdentity(
      normalizeOnboardDraft({
        ...emptyish(),
        firstName: "Mr.",
        lastName: "Sample",
      }),
    );
    expect(honor.firstName).toBe("");
    expect(honor.lastName).toBe("Sample");

    const honorLast = refineIdentity(
      normalizeOnboardDraft({
        ...emptyish(),
        firstName: "Buzz",
        lastName: "Mr.",
      }),
    );
    expect(honorLast.firstName).toBe("Buzz");
    expect(honorLast.lastName).toBe("");
  });

  it("dedupes problems and maps common ICD-9 codes", () => {
    expect(normalizeIcdCode("847.0").icd).toBe("S13.4XXA");
    expect(normalizeIcdCode("999.9").icd).toBe("");
    expect(normalizeIcdCode("999.9").clearedLegacy).toBe(true);
    expect(normalizeIcdCode("M54.12").icd).toBe("M54.12");

    const draft = normalizeOnboardDraft({
      ...emptyish(),
      firstName: "Pat",
      lastName: "Lee",
      problems: [
        { name: "Cervical radiculopathy", icd: "", status: "active", onset: "" },
        { name: "Cervical radiculopathy", icd: "M54.12", status: "active", onset: "2020-01-02" },
        { name: "Whiplash", icd: "847.0", status: "active", onset: "" },
        { name: "Cervical sprain/strain (847.0)", icd: "", status: "active", onset: "" },
      ],
    });
    expect(draft.problems).toHaveLength(3);
    expect(draft.problems.find((p) => p.name === "Cervical radiculopathy")?.onset).toBe("2020-01-02");
    expect(draft.problems.find((p) => p.name === "Cervical radiculopathy")?.icd).toBe("M54.12");
    expect(draft.problems.find((p) => p.name === "Whiplash")?.icd).toBe("S13.4XXA");
    expect(draft.problems.find((p) => /sprain/i.test(p.name))?.icd).toBe("S13.4XXA");
    expect(dedupeProblems(draft.problems)).toHaveLength(3);
  });

  it("clears toll-free phones and placeholder dates from drafts", () => {
    const draft = refineOnboardDraftFromCorpus(
      normalizeOnboardDraft({
        ...emptyish(),
        firstName: "Darion",
        lastName: "XXXX",
        phone: "855-573-2663",
        dateOfBirth: "YYYY-MM-DD",
        memberId: "XXXXXX",
        injuryCase: {
          caseNumber: "",
          claimNumber: "",
          dateOfInjury: "YYYY-02-03",
          description: "MVA",
          carrierName: "",
          attorneyName: "",
          attorneyFirm: "",
          attorneyPhone: "",
          attorneyEmail: "",
          notes: "",
        },
      }),
      "Patient phone: (949) 555-1212\nDate of injury: 02/03/2020",
    );
    expect(draft.phone).toMatch(/949/);
    expect(draft.dateOfBirth).toBe("");
    expect(draft.memberId).toBe("");
    expect(draft.injuryCase?.dateOfInjury).toBe("2020-02-03");
  });

  it("scrapes phone email DOI and labeled names from corpus", () => {
    const draft = refineOnboardDraftFromCorpus(
      normalizeOnboardDraft({ ...emptyish() }),
      [
        "Patient: Maryann Tice",
        "DOB: 03/15/1968",
        "Phone: (555) 222-3344",
        "Email: maryann@example.com",
        "Member ID: AB1234567",
        "Date of injury: 10/01/2025",
      ].join("\n"),
    );
    expect(draft.firstName).toBe("Maryann");
    expect(draft.lastName).toBe("Tice");
    expect(draft.dateOfBirth).toBe("1968-03-15");
    expect(draft.phone).toMatch(/555/);
    expect(draft.email).toBe("maryann@example.com");
    expect(draft.memberId).toBe("AB1234567");
    expect(draft.injuryCase?.dateOfInjury).toBe("2025-10-01");
  });

  it("includes page-1 imaging text in demographics section corpus", () => {
    const corpus = buildSectionCorpus(
      {
        text: "",
        pages: [
          { page: 1, text: "Patient: Jane Doe\nMRI CERVICAL", label: "imaging" },
          { page: 2, text: "Insurance card front", label: "insurance_card" },
          { page: 3, text: "Consult note", label: "consult" },
        ],
        formFields: [{ name: "Patient Name", value: "Jane Doe" }],
      },
      "demographics",
    );
    expect(corpus).toContain("Patient: Jane Doe");
    expect(corpus).toContain("Insurance card front");
    expect(corpus).not.toContain("Consult note");
  });
});
