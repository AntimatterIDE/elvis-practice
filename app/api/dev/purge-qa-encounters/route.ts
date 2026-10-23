import { purgeQaTestEncounters, staffSession, visitStorageReady } from "@/lib/encounters/store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Temporary staff-only cleanup for encounters labeled "QA TEST…".
 * Remove this route after the one-time purge.
 */
export async function POST(request: Request) {
  if (!(await staffSession())) {
    return Response.json({ message: "Sign in as staff." }, { status: 401 });
  }
  if (!visitStorageReady()) return Response.json({ message: "Supabase is not connected." }, { status: 503 });
  let confirm = "";
  try {
    const json = (await request.json()) as { confirm?: unknown };
    confirm = typeof json.confirm === "string" ? json.confirm : "";
  } catch {
    confirm = "";
  }
  if (confirm !== "QA TEST") {
    return Response.json({ message: 'Send {"confirm":"QA TEST"} to purge.' }, { status: 400 });
  }
  const result = await purgeQaTestEncounters();
  if (!result.ok) return Response.json({ message: result.message, deleted: result.deleted }, { status: result.status });
  return Response.json({ deleted: result.deleted, count: result.deleted.length });
}
