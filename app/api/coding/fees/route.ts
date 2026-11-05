import { codeLibrary } from "@/lib/coding/library";
import { getStaffSession } from "@/lib/supabase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await getStaffSession())) return Response.json({ message: "Sign in as staff to look up fees." }, { status: 401 });
  const codes = [
    ...new Set(
      (new URL(request.url).searchParams.get("codes") ?? "")
        .split(",")
        .map((code) => code.trim().toUpperCase())
        .filter((code) => /^[A-Z0-9]{5}$/.test(code)),
    ),
  ].slice(0, 200);
  const library = codeLibrary();
  const fees: Record<string, { nonFacility: number; facility: number }> = {};
  for (const code of codes) {
    const entry = library.procedures.byCode.get(code);
    if (!entry || (entry.nonFacility <= 0 && entry.facility <= 0)) continue;
    fees[code] = { nonFacility: entry.nonFacility, facility: entry.facility };
  }
  return Response.json({ fees, release: library.procedures.release });
}
