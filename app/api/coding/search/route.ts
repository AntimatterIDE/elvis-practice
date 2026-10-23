import { searchDiagnoses, searchProcedures } from "@/lib/coding/codes";
import { codeLibrary } from "@/lib/coding/library";
import { getStaffSession } from "@/lib/supabase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  if (!(await getStaffSession())) return Response.json({ message: "Sign in as staff to look up codes." }, { status: 401 });
  const params = new URL(request.url).searchParams;
  const kind = params.get("kind");
  if (kind !== "diagnosis" && kind !== "procedure") {
    return Response.json({ message: "Search diagnosis or procedure codes." }, { status: 400 });
  }
  const query = (params.get("q") ?? "").slice(0, 80);
  const library = codeLibrary();
  if (kind === "diagnosis") {
    return Response.json({ matches: searchDiagnoses(library, query), release: library.diagnoses.release });
  }
  return Response.json({ matches: searchProcedures(library, query), release: library.procedures.release });
}
