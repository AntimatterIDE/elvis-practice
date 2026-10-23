import { claimCodeProblems } from "@/lib/coding/codes";
import { codeLibrary } from "@/lib/coding/library";
import { getStaffSession } from "@/lib/supabase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type LineBody = {
  cpt?: unknown;
  modifiers?: unknown;
  diagnoses?: unknown;
  includeOnBill?: unknown;
  units?: unknown;
};

export async function POST(request: Request) {
  if (!(await getStaffSession())) {
    return Response.json({ message: "Sign in as staff to check codes.", problems: [] as string[] }, { status: 401 });
  }
  let body: { dateOfService?: unknown; lines?: unknown };
  try {
    body = (await request.json()) as { dateOfService?: unknown; lines?: unknown };
  } catch {
    return Response.json({ message: "Send the date of service and the claim lines.", problems: [] as string[] }, { status: 400 });
  }
  const dateOfService = typeof body.dateOfService === "string" ? body.dateOfService.slice(0, 10) : "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfService)) {
    return Response.json({ message: "Enter the date of service before checking codes.", problems: [] as string[] }, { status: 400 });
  }
  if (!Array.isArray(body.lines)) {
    return Response.json({ message: "Send the claim lines as a list.", problems: [] as string[] }, { status: 400 });
  }
  const lines = body.lines.map((item) => {
    const line = (item ?? {}) as LineBody;
    const modifiers = Array.isArray(line.modifiers)
      ? line.modifiers.filter((value): value is string => typeof value === "string").map((value) => value.trim().toUpperCase()).filter(Boolean)
      : [];
    const diagnoses = Array.isArray(line.diagnoses)
      ? line.diagnoses.filter((value): value is string => typeof value === "string").map((value) => value.trim()).filter(Boolean)
      : [];
    const units = typeof line.units === "number" ? line.units : Number(line.units);
    return {
      cpt: typeof line.cpt === "string" ? line.cpt.trim().toUpperCase() : "",
      modifiers,
      diagnoses,
      includeOnBill: line.includeOnBill !== false,
      units: Number.isFinite(units) ? units : undefined,
    };
  });
  const problems = claimCodeProblems(codeLibrary(), { dateOfService, lines });
  return Response.json({ problems });
}
