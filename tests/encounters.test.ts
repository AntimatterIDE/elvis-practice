import { describe, expect, it } from "vitest";
import { scoreCodes, levelForScore, suggestCodes } from "@/lib/encounters/codes";
import { applyCodeApproval, approvalStatus } from "@/lib/encounters/approve";
import { parseClinicalNote } from "@/lib/encounters/template";
import { runVisitPipeline, type VisitSnapshot } from "@/lib/encounters/pipeline";

const diabetes = [{ code: "E11.9", description: "Type 2 diabetes mellitus without complications" }];

describe("visit coding", () => {
  it("scores a description word, its synonyms, and a partial token", () => {
    const [match] = scoreCodes("diabetes", diabetes);
    expect(match?.code).toBe("E11.9");
    expect(match?.score).toBe(5.5);
  });

  it("gives an exact code token ten points", () => {
    const [match] = scoreCodes("documented i10 today", [{ code: "I10", description: "Essential hypertension" }]);
    expect(match?.score).toBe(10);
  });

  it("keeps the coding service level comparisons", () => {
    expect(levelForScore(10)).toBe(1);
    expect(levelForScore(2)).toBe(1);
    expect(levelForScore(0.9)).toBe(2);
    expect(levelForScore(0.86)).toBe(2);
    expect(levelForScore(0.8)).toBe(3);
    expect(levelForScore(0.5)).toBeNull();
  });

  it("drops scores that never clear the lowest level", () => {
    expect(suggestCodes("pain", [{ code: "Z00", description: "zz" }])).toEqual([]);
  });
});

describe("clinical note parsing", () => {
  it("treats the first line as the specialty", () => {
    const note = parseClinicalNote("Orthopedic surgery\nSUBJECTIVE:\nKnee pain");
    expect(note).toEqual({
      medicalPractice: "Orthopedic surgery",
      noteClinical: "SUBJECTIVE:\nKnee pain",
    });
  });
});

describe("visit pipeline", () => {
  const start: VisitSnapshot = {
    id: "visit-1",
    status: "uploaded",
    audioPath: "visit-1/recording.webm",
    audioContentType: "audio/webm",
    transcript: "",
    medicalPractice: "",
    noteClinical: "",
    icd10: [],
    billingCodes: [],
    progress: null,
    error: null,
  };

  it("transcribes, writes the note, then stores codes", async () => {
    const saved: VisitSnapshot[] = [];
    const result = await runVisitPipeline(start, {
      download: async () => ({ bytes: new Uint8Array([1, 2, 3]), contentType: "audio/webm" }),
      transcribe: async () => "Patient has knee pain.",
      writeNote: async () => ({ medicalPractice: "Orthopedic surgery", noteClinical: "SUBJECTIVE:\nKnee pain" }),
      codeNote: () => ({
        icd10: [{ code: "M25.569", description: "Pain in unspecified knee", level: 1, approved: false }],
        billingCodes: [{ code: "99213", description: "Office visit", level: 1, approved: false }],
      }),
      save: async (patch) => {
        saved.push(patch);
      },
      now: () => "2026-10-13T12:00:00.000Z",
    });

    expect(saved.map((visit) => visit.status)).toEqual([
      "transcribing",
      "generating",
      "generating_icd10",
      "generating_icd10",
      "generating_cpt",
      "review",
    ]);
    expect(result.status).toBe("review");
    expect(result.transcript).toBe("Patient has knee pain.");
    expect(result.icd10[0]?.code).toBe("M25.569");
    expect(result.billingCodes[0]?.code).toBe("99213");
    expect(result.progress).toEqual({ step: "review", startedAt: "2026-10-13T12:00:00.000Z" });
  });

  it("skips transcription and coding when those fields are already filled", async () => {
    let transcribed = false;
    let coded = false;
    const result = await runVisitPipeline(
      {
        ...start,
        status: "error",
        transcript: "Already heard.",
        medicalPractice: "Orthopedic surgery",
        noteClinical: "SUBJECTIVE:\nKnee pain",
        icd10: [{ code: "M25.569", description: "Pain in unspecified knee", level: 1, approved: false }],
        billingCodes: [{ code: "99213", description: "Office visit", level: 1, approved: false }],
      },
      {
        download: async () => {
          throw new Error("should not download");
        },
        transcribe: async () => {
          transcribed = true;
          return "nope";
        },
        writeNote: async () => {
          throw new Error("should not write");
        },
        codeNote: () => {
          coded = true;
          return { icd10: [], billingCodes: [] };
        },
        save: async () => {},
      },
    );
    expect(transcribed).toBe(false);
    expect(coded).toBe(false);
    expect(result.status).toBe("review");
    expect(result.icd10).toHaveLength(1);
  });

  it("records an error when transcription fails", async () => {
    const saved: { visit: VisitSnapshot | null } = { visit: null };
    await expect(
      runVisitPipeline(start, {
        download: async () => ({ bytes: new Uint8Array([1]), contentType: "audio/webm" }),
        transcribe: async () => {
          throw new Error("The recording could not be transcribed.");
        },
        writeNote: async () => ({ medicalPractice: "General Practice", noteClinical: "Note" }),
        codeNote: () => ({ icd10: [], billingCodes: [] }),
        save: async (patch) => {
          saved.visit = patch;
        },
      }),
    ).rejects.toThrow("The recording could not be transcribed.");
    expect(saved.visit?.status).toBe("error");
    expect(saved.visit?.error).toBe("The recording could not be transcribed.");
  });
});

describe("visit approval", () => {
  const icd = [{ code: "M54.50", description: "Low back pain", level: 1 as const, approved: false }];
  const cpt = [{ code: "99213", description: "Office visit", level: 1 as const, approved: false }];

  it("stays in review until the note and both code lists are approved", () => {
    const diagnoses = applyCodeApproval(icd, ["M54.50"]);
    const procedures = applyCodeApproval(cpt, []);
    expect(diagnoses?.[0]?.approved).toBe(true);
    expect(approvalStatus(true, diagnoses ?? [], procedures ?? [])).toBe("review");
    expect(approvalStatus(true, diagnoses ?? [], applyCodeApproval(cpt, ["99213"]) ?? [])).toBe("approved");
    expect(applyCodeApproval(icd, ["Z99"])).toBeNull();
  });
});
