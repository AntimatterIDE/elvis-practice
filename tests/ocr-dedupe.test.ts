import { describe, expect, it } from "vitest";
import { emptyOnboardDraft, normalizeOnboardDraft } from "@/lib/ocr/onboard-draft";
import {
  findOcrImportMatch,
  mergeOnboardIntoPatient,
  normalizeHashes,
  normalizePersonKey,
  patientFromOnboardDraftWithHashes,
} from "@/lib/ocr/dedupe";
import { withChart } from "@/lib/rcm/chart";
import type { Patient } from "@/lib/rcm/types";

const hashA = "a".repeat(64);
const hashB = "b".repeat(64);

function basePatient(extra: Partial<Patient> = {}): Patient {
  return {
    ...withChart({
      firstName: "Jane",
      lastName: "Doe",
      dateOfBirth: "1980-05-01",
      sex: "female",
      memberId: "",
      payerName: "Self-pay",
      phone: "555-555-0100",
      email: "",
      address: "",
      city: "",
      state: "",
      postalCode: "",
    }),
    id: "p_existing",
    createdAt: "2026-01-01T00:00:00.000Z",
    mrn: "100301",
    ocrImportHashes: [hashA],
    ...extra,
  };
}

describe("ocr dedupe", () => {
  it("normalizes person keys and hashes", () => {
    expect(normalizePersonKey(" Jane ", "DOE", "1980-05-01T12:00:00")).toBe("jane|doe|1980-05-01");
    expect(normalizeHashes([hashA.toUpperCase(), hashA, "nope"])).toEqual([hashA]);
  });

  it("matches by fingerprint before name/dob", () => {
    const patients = [basePatient()];
    const byHash = findOcrImportMatch(patients, {
      firstName: "Other",
      lastName: "Person",
      dateOfBirth: "1999-01-01",
      fingerprints: [hashA],
    });
    expect(byHash?.reason).toBe("fingerprint");
    expect(byHash?.patient.id).toBe("p_existing");

    const byName = findOcrImportMatch(patients, {
      firstName: "Jane",
      lastName: "Doe",
      dateOfBirth: "1980-05-01",
      fingerprints: [hashB],
    });
    expect(byName?.reason).toBe("name_dob");

    const flipped = findOcrImportMatch(
      [
        basePatient({
          id: "p_agonaldo",
          firstName: "Fransisco",
          lastName: "Agonaldo",
          dateOfBirth: "1969-09-26",
          ocrImportHashes: [],
        }),
      ],
      {
        firstName: "Francisco",
        lastName: "Agonaldo",
        dateOfBirth: "1969-09-26",
        fingerprints: [],
      },
    );
    expect(flipped?.patient.id).toBe("p_agonaldo");
    expect(flipped?.reason).toBe("name_dob_fuzzy");

    const twin = findOcrImportMatch(
      [basePatient({ id: "p_twin", firstName: "Daniel", lastName: "Hernandez", dateOfBirth: "2001-06-14", ocrImportHashes: [] })],
      { firstName: "Daniela", lastName: "Hernandez", dateOfBirth: "2001-06-14", fingerprints: [] },
    );
    expect(twin?.reason).toBe("name_dob_fuzzy");
    expect(twin?.patient.id).toBe("p_twin");
  });

  it("stores fingerprints on create and merges without duplicating problems", () => {
    const draft = normalizeOnboardDraft({
      ...emptyOnboardDraft(),
      firstName: "Jane",
      lastName: "Doe",
      dateOfBirth: "1980-05-01",
      sex: "female",
      phone: "555-9999",
      reasonForVisit: "Back pain",
      problems: [{ name: "Radiculopathy", icd: "M54.16", status: "active", onset: "" }],
      documentHints: ["outside-records"],
      sourceSummary: "retest",
    });
    const created = patientFromOnboardDraftWithHashes(draft, "p_new", [hashB]);
    expect(created.ocrImportHashes).toEqual([hashB]);

    const existing = basePatient({
      problems: [{ id: "prob1", name: "Radiculopathy", icd: "M54.16", status: "active", onset: "" }],
    });
    const merged = mergeOnboardIntoPatient(existing, draft, [hashB], {
      accept: ["phone", "problems"],
    });
    expect(merged.id).toBe("p_existing");
    expect(merged.ocrImportHashes?.sort()).toEqual([hashA, hashB].sort());
    expect(merged.problems.filter((item) => item.name === "Radiculopathy")).toHaveLength(1);
    // Phone already filled — without overwrite it stays.
    expect(merged.phone).toBe("555-555-0100");
    expect(merged.documents.find((item) => item.id === "outside-records")?.status).toBe("received");
  });

  it("writes OCR fields only when accepted, and overwrites only when requested", () => {
    const draft = normalizeOnboardDraft({
      ...emptyOnboardDraft(),
      firstName: "Janet",
      lastName: "Doe",
      dateOfBirth: "1980-05-01",
      phone: "555-555-9999",
      email: "janet@example.com",
      problems: [{ name: "Cervical radiculopathy", icd: "M54.12", status: "active", onset: "" }],
    });
    const existing = basePatient({
      email: "old@example.com",
      problems: [{ id: "prob1", name: "Lumbar strain", icd: "", status: "active", onset: "" }],
    });
    const ignored = mergeOnboardIntoPatient(existing, draft, [], { accept: [] });
    expect(ignored.phone).toBe("555-555-0100");
    expect(ignored.email).toBe("old@example.com");
    expect(ignored.firstName).toBe("Jane");
    expect(ignored.problems).toHaveLength(1);
    expect(ignored.documents.find((item) => item.id === "outside-records")?.status).not.toBe("received");

    const filled = mergeOnboardIntoPatient(existing, draft, [], {
      accept: ["email", "problems"],
    });
    expect(filled.phone).toBe("555-555-0100");
    expect(filled.email).toBe("old@example.com");
    expect(filled.firstName).toBe("Jane");
    expect(filled.problems).toHaveLength(2);

    const overwritten = mergeOnboardIntoPatient(existing, draft, [], {
      accept: ["phone", "email", "firstName", "problems"],
      overwrite: ["phone", "email", "firstName", "problems"],
    });
    expect(overwritten.phone).toBe("555-555-9999");
    expect(overwritten.email).toBe("janet@example.com");
    expect(overwritten.firstName).toBe("Janet");
    expect(overwritten.problems).toHaveLength(1);
    expect(overwritten.problems[0]?.name).toMatch(/Cervical radiculopathy/i);
  });
});
