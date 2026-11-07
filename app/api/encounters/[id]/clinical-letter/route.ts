import { writeClinicalLetter, type ClinicalLetterContext } from "@/lib/encounters/clinical-letter";
import { renderClinicalLetterPdf } from "@/lib/encounters/clinical-letter-pdf";
import { getEncounter, staffSession, visitStorageReady } from "@/lib/encounters/store";
import { storeChartBytes } from "@/lib/chart-files/store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizePatient } from "@/lib/rcm/chart";
import { patientName } from "@/lib/rcm/format";
import type { Patient } from "@/lib/rcm/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Params = { id: string };

const slotId = "consultation-report";

type ChartPayload = {
  patientName?: unknown;
  dateOfBirth?: unknown;
  phone?: unknown;
  payerName?: unknown;
  memberId?: unknown;
  medicalHistory?: unknown;
  surgicalHistory?: unknown;
  dateOfInjury?: unknown;
  injuryDescription?: unknown;
  diagnoses?: unknown;
};

function unauthorized() {
  return Response.json({ message: "Sign in as staff to record a visit." }, { status: 401 });
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asStringList(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value.map((item) => asString(item)).filter(Boolean).slice(0, 12);
}

async function chartForPatient(patientId: string): Promise<Patient | null> {
  if (!/^[A-Za-z0-9_-]{1,80}$/.test(patientId)) return null;
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase.from("portal_patients").select("id, mrn, chart").eq("id", patientId).maybeSingle();
    if (error || !data) return null;
    const chart = data.chart;
    if (!chart || typeof chart !== "object" || Array.isArray(chart)) return null;
    return normalizePatient({ ...(chart as Patient), id: data.id, mrn: data.mrn });
  } catch {
    return null;
  }
}

function buildContext(input: {
  noteClinical: string;
  medicalPractice: string;
  fallbackName: string;
  dateOfService: string;
  patient: Patient | null;
  chart: ChartPayload;
  encounterDiagnoses: string[];
}): ClinicalLetterContext {
  const injury = input.patient?.cases?.[0];
  const fromPatientDiagnoses =
    input.patient?.problems
      ?.filter((problem) => problem.status === "active")
      .map((problem) => [problem.icd, problem.name].filter(Boolean).join(" — "))
      .filter(Boolean)
      .slice(0, 12) ?? [];
  const fromPayload = asStringList(input.chart.diagnoses);
  return {
    patientName:
      (input.patient ? patientName(input.patient) : "") ||
      asString(input.chart.patientName) ||
      input.fallbackName ||
      "Patient",
    dateOfBirth: input.patient?.dateOfBirth || asString(input.chart.dateOfBirth),
    dateOfService: input.dateOfService,
    phone: input.patient?.phone || asString(input.chart.phone),
    payerName: input.patient?.payerName || input.patient?.coverages?.[0]?.payerName || asString(input.chart.payerName),
    memberId: input.patient?.memberId || input.patient?.coverages?.[0]?.memberId || asString(input.chart.memberId),
    medicalHistory: [
      input.patient?.medicalHistory || asString(input.chart.medicalHistory),
      input.patient?.surgicalHistory || asString(input.chart.surgicalHistory),
    ]
      .filter(Boolean)
      .join("\n\n"),
    injuryDescription: injury?.description || asString(input.chart.injuryDescription),
    dateOfInjury: injury?.dateOfInjury || asString(input.chart.dateOfInjury),
    noteClinical: input.noteClinical,
    medicalPractice: input.medicalPractice,
    diagnoses: fromPatientDiagnoses.length
      ? fromPatientDiagnoses
      : fromPayload.length
        ? fromPayload
        : input.encounterDiagnoses,
  };
}

export async function POST(request: Request, context: { params: Promise<Params> }) {
  if (!(await staffSession())) return unauthorized();
  if (!visitStorageReady()) return Response.json({ message: "Supabase is not connected." }, { status: 503 });

  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ message: "That visit could not be found." }, { status: 404 });

  let patientId = "";
  let chart: ChartPayload = {};
  try {
    const json = (await request.json()) as { patientId?: unknown; chart?: ChartPayload };
    patientId = asString(json.patientId);
    if (json.chart && typeof json.chart === "object") chart = json.chart;
  } catch {
    patientId = "";
  }

  let encounter;
  try {
    encounter = await getEncounter(id);
  } catch (error) {
    const message = error instanceof Error ? error.message : "That visit could not be opened.";
    return Response.json({ message }, { status: 502 });
  }
  if (!encounter) return Response.json({ message: "That visit could not be found." }, { status: 404 });
  if (encounter.status !== "review" && encounter.status !== "approved") {
    return Response.json({ message: "Finish the note first, then create the clinical letter from review." }, { status: 409 });
  }
  if (!encounter.noteClinical.trim()) {
    return Response.json({ message: "This visit does not have a note yet." }, { status: 400 });
  }
  if (!patientId) {
    return Response.json({ message: "Link this visit to a patient chart so the letter can be stored on Files." }, { status: 400 });
  }

  const patient = await chartForPatient(patientId);
  const dateOfService = encounter.createdAt.slice(0, 10);
  const letterContext = buildContext({
    noteClinical: encounter.noteClinical,
    medicalPractice: encounter.medicalPractice,
    fallbackName: encounter.patientLabel,
    dateOfService,
    patient,
    chart,
    encounterDiagnoses: encounter.icd10.map((code) => `${code.code} — ${code.description}`).slice(0, 12),
  });

  let draft;
  try {
    draft = await writeClinicalLetter(letterContext);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The clinical letter could not be written.";
    return Response.json({ message }, { status: 502 });
  }

  let pdf: Buffer;
  try {
    pdf = await renderClinicalLetterPdf(draft);
  } catch (error) {
    const message = error instanceof Error ? error.message : "The clinical letter PDF could not be built.";
    return Response.json({ message }, { status: 502 });
  }

  const safeLabel =
    (draft.patientName || "patient")
      .normalize("NFKD")
      .replace(/[^\w\s-]+/g, "")
      .trim()
      .replace(/\s+/g, "-")
      .slice(0, 40) || "patient";
  const fileName = `Clinical-Letter-${safeLabel}-${draft.dateOfService || dateOfService}.pdf`;
  const stored = await storeChartBytes({
    patientId,
    slotId,
    fileName,
    contentType: "application/pdf",
    bytes: pdf,
  });
  if (!stored.ok) return Response.json({ message: stored.message }, { status: 502 });

  return Response.json({
    ok: true,
    path: stored.path,
    url: stored.url,
    label: stored.label || fileName,
    title: draft.title,
    patientId,
    slotId,
  });
}
