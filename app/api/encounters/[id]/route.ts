import { getEncounter, reviewEncounter, staffSession, visitStorageReady } from "@/lib/encounters/store";

export const dynamic = "force-dynamic";

type Params = { id: string };

function unauthorized() {
  return Response.json({ message: "Sign in as staff to record a visit." }, { status: 401 });
}

export async function GET(_request: Request, context: { params: Promise<Params> }) {
  if (!(await staffSession())) return unauthorized();
  if (!visitStorageReady()) return Response.json({ message: "Supabase is not connected." }, { status: 503 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ message: "That visit could not be found." }, { status: 404 });
  try {
    const encounter = await getEncounter(id);
    if (!encounter) return Response.json({ message: "That visit could not be found." }, { status: 404 });
    return Response.json({ encounter });
  } catch (error) {
    const message = error instanceof Error ? error.message : "That visit could not be opened.";
    return Response.json({ message }, { status: 502 });
  }
}

function codeList(value: unknown) {
  if (!Array.isArray(value)) return [];
  return value.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim());
}

export async function PATCH(request: Request, context: { params: Promise<Params> }) {
  if (!(await staffSession())) return unauthorized();
  if (!visitStorageReady()) return Response.json({ message: "Supabase is not connected." }, { status: 503 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ message: "That visit could not be found." }, { status: 404 });
  let json: unknown;
  try {
    json = await request.json();
  } catch {
    return Response.json({ message: "The approval could not be saved." }, { status: 400 });
  }
  const body = json as { noteApproved?: unknown; icd10?: unknown; billingCodes?: unknown };
  const reviewed = await reviewEncounter(id, {
    noteApproved: body.noteApproved === true,
    icd10: codeList(body.icd10),
    billingCodes: codeList(body.billingCodes),
  });
  if (!reviewed.ok) return Response.json({ message: reviewed.message }, { status: reviewed.status });
  return Response.json({ encounter: reviewed.encounter });
}
