/**
 * OCR accuracy against fixture ground truth.
 *
 * Offline: scores hand-built drafts against manifest expected values (always runs).
 * Live: when OPENAI_API_KEY + OCR_SERVICE_URL + OCR_SERVICE_KEY are set, extracts
 * insurance + one preferred clinical packet end-to-end.
 */
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { mineOnboardDraftSectioned } from "@/lib/ocr/onboard-draft";

const root = path.resolve(__dirname, "..");
const manifestPath = path.join(root, "docs/ocr-fixtures/manifest.json");
const scoreScript = path.join(root, "docs/ocr-fixtures/score_draft.py");

type Expected = Record<string, unknown>;

type Manifest = {
  preferred_tests?: string[];
  catalog: {
    singles: Array<{ file: string; expected?: Expected }>;
    packets: Array<{ id: string; combined: string; expected?: Expected }>;
  };
};

function scoreDraft(docId: string, summary: Record<string, unknown>, expected?: Expected) {
  const payload = JSON.stringify({ id: docId, summary, expected });
  const result = spawnSync("python3", [scoreScript], {
    input: payload,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || "score_draft.py failed");
  }
  return JSON.parse(result.stdout) as {
    score: number;
    checks: Array<{ name: string; ok: boolean; detail: string }>;
  };
}

async function callOcrDirect(filePath: string) {
  const base = (process.env.OCR_SERVICE_URL || "").trim().replace(/\/$/, "");
  const key = (process.env.OCR_SERVICE_KEY || "").trim();
  if (!base || !key) return null;
  const bytes = readFileSync(filePath);
  const form = new FormData();
  form.append("file", new Blob([bytes], { type: "application/pdf" }), path.basename(filePath));
  const res = await fetch(`${base}/v1/ocr/extract?structured=1&mode=onboard`, {
    method: "POST",
    headers: { "X-OCR-Service-Key": key },
    body: form,
    signal: AbortSignal.timeout(180_000),
  });
  const json = (await res.json().catch(() => null)) as {
    success?: boolean;
    text?: string;
    pages?: { page: number; text: string; label: string }[];
    tables?: { page: number; rows: string[][] }[];
    form_fields?: { name: string; value: string }[];
  } | null;
  if (!res.ok || !json?.success) return null;
  return json;
}

function draftSummary(draft: {
  firstName: string;
  lastName: string;
  dateOfBirth: string;
  payerName: string;
  memberId: string;
  sex: string;
  reasonForVisit: string;
  medicalHistory: string;
  imagingFindings: string;
  documentHints: string[];
  problems: unknown[];
  injuryCase: unknown;
  warnings: string[];
}) {
  return {
    firstName: draft.firstName,
    lastName: draft.lastName,
    dateOfBirth: draft.dateOfBirth,
    payerName: draft.payerName,
    memberId: draft.memberId,
    sex: draft.sex,
    reasonForVisit: draft.reasonForVisit,
    medicalHistory: draft.medicalHistory,
    imagingFindings: draft.imagingFindings,
    documentHints: draft.documentHints,
    problems: draft.problems,
    injuryCase: draft.injuryCase,
    warnings: draft.warnings,
  };
}

describe("OCR accuracy fixtures", () => {
  const manifest = JSON.parse(readFileSync(manifestPath, "utf8")) as Manifest;
  const insurance = manifest.catalog.singles.find((item) => item.file.includes("encounter-insurance-fictional"));
  const imagingCervical = manifest.catalog.singles.find((item) => item.file.includes("outside-imaging-cervical.pdf"));
  const emgCervical = manifest.catalog.singles.find((item) => item.file.includes("emg-cervical-radiculopathy.pdf"));
  const cervicalPacket = manifest.catalog.packets.find((item) => item.id === "cervical-mva-imaging-emg");
  const lumbarPacket = manifest.catalog.packets.find((item) => item.id === "lumbar-mva-imaging-emg");

  it("scores exact ground truth for the insurance fixture", () => {
    expect(insurance?.expected?.firstName).toBe("Alicia");
    const scored = scoreDraft(
      insurance!.file,
      {
        firstName: "Alicia",
        lastName: "Mendel",
        dateOfBirth: "1986-07-14",
        payerName: "SilverShield Health Plan",
        memberId: "SS-983441221",
        sex: "female",
        reasonForVisit: "Persistent cough",
        medicalHistory: "",
        documentHints: ["outside-records"],
        problems: [],
        injuryCase: null,
        warnings: [],
      },
      insurance!.expected,
    );
    const exact = scored.checks.filter((check) => check.name.startsWith("exact_"));
    expect(exact.length).toBeGreaterThan(0);
    expect(exact.every((check) => check.ok)).toBe(true);
    expect(scored.score).toBe(100);
  });

  it("fails exact checks when identity is wrong", () => {
    const scored = scoreDraft(
      insurance!.file,
      {
        firstName: "Wrong",
        lastName: "Person",
        dateOfBirth: "2000-01-01",
        payerName: "Other",
        memberId: "X",
        reasonForVisit: "cough",
        documentHints: ["outside-records"],
        problems: [],
        injuryCase: null,
        warnings: [],
      },
      insurance!.expected,
    );
    expect(scored.checks.some((check) => check.name === "exact_firstName" && !check.ok)).toBe(true);
    expect(scored.score).toBeLessThan(100);
  });

  it("scores exact imagingFindings for cervical MRI single", () => {
    expect(imagingCervical?.expected?.imagingFindings).toBeTruthy();
    const scored = scoreDraft(
      imagingCervical!.file,
      {
        imagingFindings: imagingCervical!.expected!.imagingFindings,
        reasonForVisit: "neck pain",
        medicalHistory: "",
        documentHints: ["outside-imaging"],
        problems: [],
        injuryCase: null,
        warnings: [],
      },
      imagingCervical!.expected,
    );
    expect(scored.checks.some((check) => check.name === "exact_imagingFindings" && check.ok)).toBe(true);
  });

  it("scores exact identity for cervical EMG single", () => {
    expect(emgCervical?.expected?.dateOfBirth).toBe("1947-07-07");
    const scored = scoreDraft(
      emgCervical!.file,
      {
        firstName: "Sample",
        lastName: "Radiculopathy Case",
        dateOfBirth: "1947-07-07",
        sex: "male",
        reasonForVisit: "Cervical radiculopathy",
        medicalHistory: "",
        documentHints: ["outside-records"],
        problems: [{ name: "Cervical radiculopathy" }],
        injuryCase: null,
        warnings: [],
      },
      emgCervical!.expected,
    );
    const exact = scored.checks.filter((check) => check.name.startsWith("exact_"));
    expect(exact.every((check) => check.ok)).toBe(true);
  });

  it("scores soft clinical needles for cervical-mva packet", () => {
    expect(cervicalPacket?.expected).toBeTruthy();
    const scored = scoreDraft(
      cervicalPacket!.id,
      {
        firstName: "Jane",
        lastName: "Doe",
        reasonForVisit: "Neck pain after accident",
        medicalHistory: "",
        imagingFindings: "C5-6 disc herniation with cord contact",
        documentHints: ["outside-records", "outside-imaging"],
        problems: [{ name: "Cervical radiculopathy" }],
        injuryCase: { description: "MVA" },
        warnings: [],
      },
      cervicalPacket!.expected,
    );
    expect(scored.checks.some((c) => c.name === "soft_problems_should_mention" && c.ok)).toBe(true);
    expect(scored.checks.some((c) => c.name === "soft_imagingFindings_should_mention" && c.ok)).toBe(true);
    expect(scored.checks.some((c) => c.name === "hint_outside-imaging" && c.ok)).toBe(true);
  });

  it("scores soft clinical needles for lumbar-mva packet", () => {
    expect(lumbarPacket?.expected).toBeTruthy();
    const scored = scoreDraft(
      lumbarPacket!.id,
      {
        firstName: "John",
        lastName: "Doe",
        reasonForVisit: "Low back pain after motor vehicle accident",
        medicalHistory: "Lumbar radiculopathy",
        imagingFindings: "L5-S1 disc herniation",
        documentHints: ["outside-records", "outside-imaging"],
        problems: [{ name: "Lumbar radiculopathy" }],
        injuryCase: { description: "MVA" },
        warnings: [],
      },
      lumbarPacket!.expected,
    );
    expect(scored.checks.some((c) => c.name === "soft_reasonForVisit_or_history" && c.ok)).toBe(true);
    expect(scored.checks.some((c) => c.name === "soft_imagingFindings_should_mention" && c.ok)).toBe(true);
  });

  it("live extracts insurance fixture when OCR + OpenAI credentials are set", async () => {
    const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());
    const hasOcr = Boolean(process.env.OCR_SERVICE_URL?.trim() && process.env.OCR_SERVICE_KEY?.trim());
    if (!hasOpenAi || !hasOcr) return;

    const pdfPath = path.join(root, "docs/ocr-fixtures", insurance!.file);
    const ocr = await callOcrDirect(pdfPath);
    expect(ocr?.text?.length).toBeGreaterThan(100);

    const { draft } = await mineOnboardDraftSectioned({
      text: ocr!.text || "",
      pages: ocr!.pages,
      tables: ocr!.tables,
      formFields: ocr!.form_fields,
    });

    const scored = scoreDraft(insurance!.file, draftSummary(draft), insurance!.expected);

    for (const key of ["firstName", "lastName", "dateOfBirth", "memberId"] as const) {
      const check = scored.checks.find((item) => item.name === `exact_${key}`);
      expect(check?.ok, `${key}: ${check?.detail}`).toBe(true);
    }
  }, 180_000);

  it("live extracts cervical-mva packet soft needles when credentials are set", async () => {
    const hasOpenAi = Boolean(process.env.OPENAI_API_KEY?.trim());
    const hasOcr = Boolean(process.env.OCR_SERVICE_URL?.trim() && process.env.OCR_SERVICE_KEY?.trim());
    if (!hasOpenAi || !hasOcr) return;

    const pdfPath = path.join(root, "docs/ocr-fixtures", cervicalPacket!.combined);
    const ocr = await callOcrDirect(pdfPath);
    expect(ocr?.text?.length).toBeGreaterThan(100);

    const { draft } = await mineOnboardDraftSectioned({
      text: ocr!.text || "",
      pages: ocr!.pages,
      tables: ocr!.tables,
      formFields: ocr!.form_fields,
    });

    const scored = scoreDraft(cervicalPacket!.id, draftSummary(draft), cervicalPacket!.expected);
    const softImaging = scored.checks.find((c) => c.name === "soft_imagingFindings_should_mention");
    const softProblems = scored.checks.find((c) => c.name === "soft_problems_should_mention");
    expect(softImaging?.ok || softProblems?.ok, JSON.stringify(scored.checks.filter((c) => c.name.startsWith("soft_")))).toBe(
      true,
    );
  }, 180_000);
});
