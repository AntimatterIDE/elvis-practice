import type { LineChoice } from "@/lib/encounters/approve";
import { deleteDraftEncounter, getEncounter, reviewEncounter, staffSession, visitStorageReady } from "@/lib/encounters/store";

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

function lineList(value: unknown): LineChoice[] | null {
  if (!Array.isArray(value)) return [];
  const lines: LineChoice[] = [];
  for (const item of value) {
    if (!item || typeof item !== "object" || Array.isArray(item)) return null;
    const record = item as { code?: unknown; units?: unknown; modifiers?: unknown; diagnoses?: unknown };
    if (typeof record.code !== "string" || typeof record.units !== "number") return null;
    lines.push({ code: record.code, units: record.units, modifiers: codeList(record.modifiers), diagnoses: codeList(record.diagnoses) });
  }
  return lines;
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
  const billingCodes = lineList(body.billingCodes);
  if (!billingCodes) {
    return Response.json({ message: "This page is out of date. Reload it and approve the visit again." }, { status: 400 });
  }
  const reviewed = await reviewEncounter(id, {
    noteApproved: body.noteApproved === true,
    icd10: codeList(body.icd10),
    billingCodes,
  });
  if (!reviewed.ok) return Response.json({ message: reviewed.message }, { status: reviewed.status });
  return Response.json({ encounter: reviewed.encounter });
}

export async function DELETE(_request: Request, context: { params: Promise<Params> }) {
  if (!(await staffSession())) return unauthorized();
  if (!visitStorageReady()) return Response.json({ message: "Supabase is not connected." }, { status: 503 });
  const { id } = await context.params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ message: "That visit could not be found." }, { status: 404 });
  const removed = await deleteDraftEncounter(id);
  if (!removed.ok) return Response.json({ message: removed.message }, { status: removed.status });
  return Response.json({ ok: true });
}
