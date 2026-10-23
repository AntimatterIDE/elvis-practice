import { suggestVisitCodes } from "@/lib/coding/suggest";
import { codeLibrary } from "@/lib/coding/library";
import { getStaffSession } from "@/lib/supabase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 120;

/** Staff-only: note → extract facts → spine rules → CMS/NCCI check. */
export async function POST(request: Request) {
  if (!(await getStaffSession())) {
    return Response.json({ message: "Sign in as staff to generate codes." }, { status: 401 });
  }
  let body: { note?: unknown; dateOfService?: unknown };
  try {
    body = (await request.json()) as { note?: unknown; dateOfService?: unknown };
  } catch {
    return Response.json({ message: "Send a clinical note as JSON." }, { status: 400 });
  }
  const note = typeof body.note === "string" ? body.note.trim() : "";
  if (note.length < 20) {
    return Response.json({ message: "Paste a clinical note (at least a few lines)." }, { status: 400 });
  }
  if (note.length > 80_000) {
    return Response.json({ message: "That note is too long to code in one request." }, { status: 400 });
  }
  const dateOfService =
    typeof body.dateOfService === "string" && /^\d{4}-\d{2}-\d{2}$/.test(body.dateOfService.slice(0, 10))
      ? body.dateOfService.slice(0, 10)
      : new Date().toISOString().slice(0, 10);

  const library = codeLibrary();
  const result = await suggestVisitCodes(note, { library, dateOfService });
  return Response.json({
    enabled: result.enabled,
    dateOfService,
    diagnoses: result.coding.diagnoses,
    lines: result.coding.lines,
    warnings: [...result.extractWarnings.map((item) => item.message), ...result.coding.warnings],
    blocked: result.blocked,
    facts: result.facts,
  });
}
