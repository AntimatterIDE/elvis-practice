import {
  claimDraftFromClinicVisit,
  listClinicVisitsForPatient,
} from "@/lib/encounters/claim-from-visit";
import { listEncounters, staffSession, visitStorageReady } from "@/lib/encounters/store";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { normalizePatient } from "@/lib/rcm/chart";
import { patientName } from "@/lib/rcm/format";
import type { Patient } from "@/lib/rcm/types";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function unauthorized() {
  return Response.json({ message: "Sign in as staff to open visits." }, { status: 401 });
}

function asString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function asIdList(value: unknown) {
  if (!Array.isArray(value)) return [] as string[];
  return value.map((item) => asString(item)).filter((id) => /^[A-Za-z0-9_-]{1,80}$/.test(id)).slice(0, 100);
}

async function portalPatient(patientId: string): Promise<Patient | null> {
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

/**
 * Alignment Clinic scribe visits for a patient (note + ICD + CPT), newest first.
 * Body may include client chart name + appointment ids when the portal row is missing.
 */
export async function POST(request: Request) {
  if (!(await staffSession())) return unauthorized();
  if (!visitStorageReady()) return Response.json({ message: "Supabase is not connected." }, { status: 503 });

  let body: { patientId?: unknown; patientName?: unknown; appointmentIds?: unknown };
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return Response.json({ message: "That patient could not be matched to a visit." }, { status: 400 });
  }

  const patientId = asString(body.patientId);
  if (!patientId) return Response.json({ message: "Choose a patient first." }, { status: 400 });

  const portal = await portalPatient(patientId);
  const patientNameValue = asString(body.patientName) || (portal ? patientName(portal) : "");
  const appointmentIds = asIdList(body.appointmentIds);

  if (!patientNameValue && !appointmentIds.length) {
    return Response.json({
      visits: [],
      encounter: null,
      draft: null,
      message: "No Alignment Clinic visit is linked to this chart yet.",
    });
  }

  let encounters;
  try {
    encounters = await listEncounters(120);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Visits could not be loaded.";
    return Response.json({ message }, { status: 502 });
  }

  const visits = listClinicVisitsForPatient(encounters, {
    patientName: patientNameValue,
    appointmentIds,
  }).map(({ encounter, draft }) => ({ encounter, draft }));

  if (!visits.length) {
    return Response.json({
      visits: [],
      encounter: null,
      draft: null,
      message: "No Alignment Clinic visit with a note and codes was found for this patient.",
    });
  }

  const first = visits[0]!;
  return Response.json({
    visits,
    encounter: first.encounter,
    draft: first.draft ?? claimDraftFromClinicVisit(first.encounter),
  });
}
