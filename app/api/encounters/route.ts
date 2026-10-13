import { staffSession, createEncounter, listEncounters, visitStorageReady } from "@/lib/encounters/store";
import { audioByteLimit } from "@/lib/encounters/types";

export const dynamic = "force-dynamic";

function unauthorized() {
  return Response.json({ message: "Sign in as staff to record a visit." }, { status: 401 });
}

export async function GET() {
  if (!(await staffSession())) return unauthorized();
  if (!visitStorageReady()) return Response.json({ message: "Supabase is not connected." }, { status: 503 });
  try {
    const encounters = await listEncounters();
    return Response.json({ encounters });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Visits could not be loaded.";
    return Response.json({ message }, { status: 502 });
  }
}

export async function POST(request: Request) {
  const session = await staffSession();
  if (!session) return unauthorized();
  if (!visitStorageReady()) return Response.json({ message: "Supabase is not connected." }, { status: 503 });

  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ message: "The visit could not be started." }, { status: 400 });
  }
  const body = json as { patientLabel?: unknown; appointmentId?: unknown; contentType?: unknown; byteSize?: unknown };
  const created = await createEncounter({
    clinicianId: session.userId,
    patientLabel: typeof body.patientLabel === "string" ? body.patientLabel : "",
    appointmentId: typeof body.appointmentId === "string" ? body.appointmentId : "",
    contentType: typeof body.contentType === "string" ? body.contentType : "",
    byteSize: typeof body.byteSize === "number" ? body.byteSize : Number.NaN,
  });
  if (!created.ok) return Response.json({ message: created.message }, { status: 400 });
  return Response.json({ encounter: created.encounter, signedUrl: created.signedUrl, byteLimit: audioByteLimit });
}
