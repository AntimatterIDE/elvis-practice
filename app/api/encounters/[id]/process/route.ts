import { processEncounter, staffSession, visitStorageReady } from "@/lib/encounters/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Params = { id: string };

function unauthorized() {
  return Response.json({ message: "Sign in as staff to record a visit." }, { status: 401 });
}

export async function POST(request: Request, context: { params: Promise<Params> }) {
  if (!(await staffSession())) return unauthorized();
  if (!visitStorageReady()) return Response.json({ message: "Supabase is not connected." }, { status: 503 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ message: "That visit could not be found." }, { status: 404 });

  let retry = false;
  try {
    const json = (await request.json()) as { retry?: unknown };
    retry = json.retry === true;
  } catch {
    retry = false;
  }

  const result = await processEncounter(id, retry);
  if (!result.ok) {
    const encounter = "encounter" in result ? (result.encounter ?? null) : null;
    return Response.json({ message: result.message, encounter }, { status: result.status });
  }
  return Response.json({ encounter: result.encounter });
}
