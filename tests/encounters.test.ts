import { describe, expect, it } from "vitest";
import { buildCodeLibrary } from "@/lib/coding/codes";
import { approvalStatus, claimLinesFromEncounter, reviewCodes, type LineChoice } from "@/lib/encounters/approve";
import { parseClinicalNote } from "@/lib/encounters/template";
import { filesFromChunks } from "@/lib/encounters/local-audio";
import { audioPaths } from "@/lib/encounters/types";
import { runVisitPipeline, type VisitSnapshot } from "@/lib/encounters/pipeline";

const library = buildCodeLibrary(
  {
    release: "ICD-10-CM test",
    effectiveFrom: "2026-10-01",
    rows: [
      ["M48.06", 0, "Spinal stenosis, lumbar region"],
      ["M48.061", 1, "Spinal stenosis, lumbar region without neurogenic claudication"],
      ["M48.062", 1, "Spinal stenosis, lumbar region with neurogenic claudication"],
      ["M51.17", 1, "Intervertebral disc disorders with radiculopathy, lumbosacral region"],
      ["M54.5", 0, "Low back pain"],
      ["M54.50", 1, "Low back pain, unspecified"],
      ["M54.16", 1, "Radiculopathy, lumbar region"],
      ["G89.29", 1, "Other chronic pain"],
    ],
  },
  {
    release: "procedures test",
    effectiveFrom: "2026-10-01",
    rows: [
      ["63047", "", "A", "090"],
      ["63048", "", "A", "ZZZ"],
      ["99213", "", "A", "XXX"],
      ["J1010", "Injection, methylprednisolone acetate, 1 mg", "E", "XXX"],
    ],
  },
);

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

  it("transcribes, writes the note, then waits for the doctor's codes", async () => {
    const saved: VisitSnapshot[] = [];
    const result = await runVisitPipeline(start, {
      download: async () => ({ bytes: new Uint8Array([1, 2, 3]), contentType: "audio/webm" }),
      transcribe: async () => "Patient has knee pain.",
      writeNote: async () => ({ medicalPractice: "Orthopedic surgery", noteClinical: "SUBJECTIVE:\nKnee pain" }),
      save: async (patch) => {
        saved.push(patch);
      },
      now: () => "2026-10-13T12:00:00.000Z",
    });

    expect(saved.map((visit) => visit.status)).toEqual(["transcribing", "generating", "review"]);
    expect(result.status).toBe("review");
    expect(result.transcript).toBe("Patient has knee pain.");
    expect(result.noteClinical).toBe("SUBJECTIVE:\nKnee pain");
    expect(result.icd10).toEqual([]);
    expect(result.billingCodes).toEqual([]);
    expect(result.progress).toEqual({ step: "review", startedAt: "2026-10-13T12:00:00.000Z" });
  });

  it("skips transcription and the note when they are already written", async () => {
    let transcribed = false;
    const result = await runVisitPipeline(
      {
        ...start,
        status: "error",
        transcript: "Already heard.",
        medicalPractice: "Orthopedic surgery",
        noteClinical: "SUBJECTIVE:\nKnee pain",
        icd10: [{ code: "M54.50", description: "Low back pain, unspecified", approved: true }],
        billingCodes: [{ code: "99213", description: "", approved: true, units: 1, modifiers: [], diagnoses: ["M54.50"] }],
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
        save: async () => {},
      },
    );
    expect(transcribed).toBe(false);
    expect(result.status).toBe("review");
    expect(result.icd10).toHaveLength(1);
    expect(result.billingCodes[0]?.diagnoses).toEqual(["M54.50"]);
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
        save: async (patch) => {
          saved.visit = patch;
        },
      }),
    ).rejects.toThrow("The recording could not be transcribed.");
    expect(saved.visit?.status).toBe("error");
    expect(saved.visit?.error).toBe("The recording could not be transcribed.");
  });

  it("joins each saved segment into one transcript", async () => {
    const paths: string[] = [];
    const result = await runVisitPipeline(
      { ...start, audioPath: "visit-1/part-0.webm\nvisit-1/part-1.webm" },
      {
        download: async (path) => {
          paths.push(path);
          return { bytes: new Uint8Array([1, 2, 3]), contentType: "audio/webm" };
        },
        transcribe: async (file) => `heard ${file.filename}`,
        writeNote: async () => ({ medicalPractice: "Orthopedic surgery", noteClinical: "SUBJECTIVE:\nKnee pain" }),
        save: async () => {},
      },
    );
    expect(paths).toEqual(["visit-1/part-0.webm", "visit-1/part-1.webm"]);
    expect(result.transcript).toBe("heard part-0.webm\n\nheard part-1.webm");
  });
});

describe("phone recording cache", () => {
  it("keeps chunk order and drops an empty segment", () => {
    expect(audioPaths("a.webm\n\nb.webm")).toEqual(["a.webm", "b.webm"]);
    const files = filesFromChunks(
      [
        { part: 1, seq: 0, blob: new Blob([new Uint8Array(400)]) },
        { part: 0, seq: 1, blob: new Blob([new Uint8Array(200)]) },
        { part: 0, seq: 0, blob: new Blob([new Uint8Array(300)]) },
        { part: 2, seq: 0, blob: new Blob([new Uint8Array(20)]) },
      ],
      "audio/webm;codecs=opus",
    );
    expect(files.map((file) => file.part)).toEqual([0, 1]);
    expect(files[0]?.blob.size).toBe(500);
    expect(files[0]?.type).toBe("audio/webm");
  });
});

describe("visit approval", () => {
  const visitDiagnoses = ["M48.062", "M51.17", "M54.16", "M54.50", "G89.29"];

  function lineProblem(patch: Partial<LineChoice>) {
    const line: LineChoice = { code: "63047", units: 1, modifiers: [], diagnoses: ["M48.062"], ...patch };
    const reviewed = reviewCodes(library, { icd10: visitDiagnoses, billingCodes: [line] });
    return reviewed.ok ? "" : reviewed.error;
  }

  it("accepts any valid code the doctor enters, with units, modifiers, and linked diagnoses", () => {
    const reviewed = reviewCodes(library, {
      icd10: ["m48.062", "M51.17", "M48062"],
      billingCodes: [
        { code: "63047", units: 1, modifiers: [], diagnoses: ["M48.062", "M51.17"] },
        { code: "63048", units: 2, modifiers: ["59"], diagnoses: ["M48062"] },
      ],
    });
    expect(reviewed).toEqual({
      ok: true,
      icd10: [
        { code: "M48.062", description: "Spinal stenosis, lumbar region with neurogenic claudication", approved: true },
        { code: "M51.17", description: "Intervertebral disc disorders with radiculopathy, lumbosacral region", approved: true },
      ],
      billingCodes: [
        { code: "63047", description: "", approved: true, units: 1, modifiers: [], diagnoses: ["M48.062", "M51.17"] },
        { code: "63048", description: "", approved: true, units: 2, modifiers: ["59"], diagnoses: ["M48.062"] },
      ],
    });
  });

  it("stays in review until the note, a diagnosis, and a procedure are approved", () => {
    const diagnosisOnly = reviewCodes(library, { icd10: ["M54.50"], billingCodes: [] });
    const visit = reviewCodes(library, {
      icd10: ["M54.50"],
      billingCodes: [{ code: "99213", units: 1, modifiers: ["25"], diagnoses: ["M54.50"] }],
    });
    if (!diagnosisOnly.ok || !visit.ok) throw new Error("Both code sets should be valid.");
    expect(approvalStatus(true, diagnosisOnly.icd10, diagnosisOnly.billingCodes)).toBe("review");
    expect(approvalStatus(false, visit.icd10, visit.billingCodes)).toBe("review");
    expect(approvalStatus(true, visit.icd10, visit.billingCodes)).toBe("approved");
  });

  it("points a category code to its billable codes", () => {
    expect(reviewCodes(library, { icd10: ["M54.5"], billingCodes: [] })).toEqual({
      ok: false,
      error: "M54.5 is a category, not a billable code. Use a more specific code, such as M54.50.",
    });
    expect(reviewCodes(library, { icd10: ["M48.06"], billingCodes: [] })).toEqual({
      ok: false,
      error: "M48.06 is a category, not a billable code. Use a more specific code, such as M48.061 or M48.062.",
    });
  });

  it("rejects a procedure code that is not in the release", () => {
    expect(lineProblem({ code: "J1030", units: 40 })).toBe("Line 1: J1030 is not a code in procedures test.");
  });

  it("checks the units, modifiers, and diagnosis links on each line", () => {
    const units = "Line 1: units must be a whole number from 1 to 999.";
    expect(lineProblem({ units: 0 })).toBe(units);
    expect(lineProblem({ units: 1.5 })).toBe(units);
    expect(lineProblem({ modifiers: ["5"] })).toBe(
      "Line 1: 5 is not a modifier. A modifier is two letters or digits, such as 25, 59, LT, or RT.",
    );
    expect(lineProblem({ modifiers: ["LT", "lt"] })).toBe("Line 1: a modifier is listed twice.");
    expect(lineProblem({ modifiers: ["22", "59", "LT", "RT", "XS"] })).toBe("Line 1: a line takes at most 4 modifiers.");
    expect(lineProblem({ diagnoses: [] })).toBe("Line 1: link at least one diagnosis.");
    expect(lineProblem({ diagnoses: visitDiagnoses })).toBe("Line 1: a line can point to at most 4 diagnoses.");
    expect(lineProblem({ diagnoses: ["M51.16"] })).toBe("Line 1: M51.16 is not one of this visit's diagnoses.");
    expect(lineProblem({ units: 3, modifiers: ["lt"], diagnoses: ["M54.16", "M48.062"] })).toBe("");
  });

  it("caps a visit at 12 diagnoses", () => {
    const codes = Array.from({ length: 13 }, (_, index) => `M54.${index + 10}`);
    const many = buildCodeLibrary(
      { release: "ICD-10-CM test", effectiveFrom: "2026-10-01", rows: codes.map((code) => [code, 1, code]) },
      { release: "procedures test", effectiveFrom: "2026-10-01", rows: [] },
    );
    expect(reviewCodes(many, { icd10: codes, billingCodes: [] })).toEqual({
      ok: false,
      error: "A claim can carry at most 12 diagnoses. Keep the 12 that support the procedures.",
    });
  });

  it("points older lines without their own diagnoses at every approved diagnosis", () => {
    const lines = claimLinesFromEncounter({
      icd10: [
        { code: "M54.50", description: "Low back pain, unspecified", approved: true },
        { code: "M54.16", description: "Radiculopathy, lumbar region", approved: false },
      ],
      billingCodes: [
        { code: "99213", description: "", approved: true, units: 1, modifiers: [], diagnoses: [] },
        { code: "J1010", description: "", approved: false, units: 1, modifiers: [], diagnoses: [] },
        { code: "63047", description: "", approved: true, units: 1, modifiers: ["LT"], diagnoses: ["M54.16"] },
      ],
    });
    expect(lines).toEqual([
      { code: "99213", description: "", units: 1, modifiers: [], diagnoses: ["M54.50"] },
      { code: "63047", description: "", units: 1, modifiers: ["LT"], diagnoses: ["M54.16"] },
    ]);
  });
});
