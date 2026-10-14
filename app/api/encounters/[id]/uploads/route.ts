import { resignEncounterUploads, staffSession, visitStorageReady } from "@/lib/encounters/store";

export const dynamic = "force-dynamic";

type Params = { id: string };

export async function POST(_request: Request, context: { params: Promise<Params> }) {
  if (!(await staffSession())) return Response.json({ message: "Sign in as staff to record a visit." }, { status: 401 });
  if (!visitStorageReady()) return Response.json({ message: "Supabase is not connected." }, { status: 503 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ message: "That visit could not be found." }, { status: 404 });
  const signed = await resignEncounterUploads(id);
  if (!signed.ok) return Response.json({ message: signed.message }, { status: signed.status });
  return Response.json({ uploads: signed.uploads, encounter: signed.encounter });
}
