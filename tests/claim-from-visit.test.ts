import { describe, expect, it } from "vitest";
import {
  claimDraftFromClinicVisit,
  clinicVisitHasClaimData,
  encounterBelongsToPatient,
  listClinicVisitsForPatient,
  pickLatestClinicVisit,
} from "@/lib/encounters/claim-from-visit";
import type { Encounter } from "@/lib/encounters/types";

function visit(overrides: Partial<Encounter> = {}): Encounter {
  return {
    id: "enc-1",
    clinicianId: "doc-1",
    patientLabel: "Ada Lovelace",
    appointmentId: "appt-1",
    noteApproved: true,
    status: "approved",
    audioPath: null,
    audioContentType: "audio/webm",
    transcript: "",
    medicalPractice: "Spine",
    noteClinical: "SUBJECTIVE:\nLow back pain",
    icd10: [{ code: "M54.50", description: "Low back pain", approved: true }],
    billingCodes: [
      {
        code: "99213",
        description: "Office visit",
        approved: true,
        units: 1,
        modifiers: [],
        diagnoses: ["M54.50"],
      },
    ],
    progress: null,
    error: null,
    createdAt: "2026-11-06T15:00:00.000Z",
    updatedAt: "2026-11-06T15:30:00.000Z",
    ...overrides,
  };
}

describe("clinic visit claim draft", () => {
  it("requires a note plus ICD and CPT from a review or approved visit", () => {
    expect(clinicVisitHasClaimData(visit({ noteClinical: "  " }))).toBe(false);
    expect(clinicVisitHasClaimData(visit({ status: "generating" }))).toBe(false);
    expect(clinicVisitHasClaimData(visit())).toBe(true);
  });

  it("matches by appointment id or exact patient label", () => {
    expect(
      encounterBelongsToPatient(visit(), { patientName: "Ada Lovelace", appointmentIds: [] }),
    ).toBe(true);
    expect(
      encounterBelongsToPatient(visit({ patientLabel: "Other" }), {
        patientName: "Ada Lovelace",
        appointmentIds: ["appt-1"],
      }),
    ).toBe(true);
    expect(
      encounterBelongsToPatient(visit({ patientLabel: "Other", appointmentId: "" }), {
        patientName: "Ada Lovelace",
        appointmentIds: [],
      }),
    ).toBe(false);
  });

  it("prefers approved codes and picks the newest matching visit", () => {
    const older = visit({
      id: "enc-old",
      createdAt: "2026-11-01T12:00:00.000Z",
      status: "review",
      icd10: [{ code: "M54.50", description: "Low back pain", approved: false }],
      billingCodes: [
        {
          code: "99213",
          description: "Office visit",
          approved: false,
          units: 1,
          modifiers: [],
          diagnoses: [],
        },
      ],
    });
    const newer = visit({
      id: "enc-new",
      createdAt: "2026-11-07T12:00:00.000Z",
      appointmentId: "appt-2",
    });
    const picked = pickLatestClinicVisit([older, newer], {
      patientName: "Ada Lovelace",
      appointmentIds: ["appt-2"],
    });
    expect(picked?.id).toBe("enc-new");
    const draft = claimDraftFromClinicVisit(picked!);
    expect(draft?.source).toBe("approved");
    expect(draft?.diagnoses.map((item) => item.code)).toEqual(["M54.50"]);
    expect(draft?.lines.map((line) => line.code)).toEqual(["99213"]);
    expect(draft?.clinicalNote).toContain("Low back pain");
  });

  it("falls back to review suggestions when nothing is approved yet", () => {
    const review = visit({
      status: "review",
      noteApproved: false,
      icd10: [{ code: "M54.16", description: "Radiculopathy", approved: false }],
      billingCodes: [
        {
          code: "99214",
          description: "Office visit",
          approved: false,
          units: 1,
          modifiers: ["25"],
          diagnoses: [],
        },
      ],
    });
    const draft = claimDraftFromClinicVisit(review);
    expect(draft?.source).toBe("review");
    expect(draft?.diagnoses[0]?.code).toBe("M54.16");
    expect(draft?.lines[0]).toMatchObject({
      code: "99214",
      modifiers: ["25"],
      diagnoses: ["M54.16"],
    });
  });

  it("lists every claimable visit newest first and keeps per-line diagnosis pointers", () => {
    const older = visit({
      id: "enc-old",
      createdAt: "2026-11-01T12:00:00.000Z",
      appointmentId: "appt-old",
      noteClinical: "SUBJECTIVE:\nOlder visit",
      icd10: [
        { code: "M54.50", description: "Low back pain", approved: true },
        { code: "M54.16", description: "Radiculopathy", approved: true },
      ],
      billingCodes: [
        {
          code: "63047",
          description: "Laminectomy",
          approved: true,
          units: 1,
          modifiers: [],
          diagnoses: ["M54.16", "M99.99"],
        },
      ],
    });
    const newer = visit({
      id: "enc-new",
      createdAt: "2026-11-07T12:00:00.000Z",
      appointmentId: "appt-new",
    });
    const listed = listClinicVisitsForPatient([older, newer], {
      patientName: "Ada Lovelace",
      appointmentIds: ["appt-old", "appt-new"],
    });
    expect(listed.map((item) => item.encounter.id)).toEqual(["enc-new", "enc-old"]);
    expect(listed[1]?.draft.lines[0]?.diagnoses).toEqual(["M54.16"]);
  });
});
