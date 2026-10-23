import { readFileSync } from "node:fs";
import path from "node:path";
import { claimCodeProblems } from "@/lib/coding/codes";
import { extractCodingFacts } from "@/lib/coding/extract";
import { codeLibrary } from "@/lib/coding/library";
import { codeVisit } from "@/lib/coding/spine";
import { getStaffSession } from "@/lib/supabase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Fixture = {
  id: string;
  expectedCptAnyOf: string[];
  expectedIcdAnyOf: string[];
};

function matchesPattern(code: string, pattern: string) {
  const trimmed = pattern.trim();
  if (trimmed.endsWith("*")) return code.startsWith(trimmed.slice(0, -1));
  return code === trimmed;
}

/** Live extract→code eval on production OpenAI. Staff session, or temporary eval header. */
export async function POST(request: Request) {
  const staff = await getStaffSession();
  const evalHeader = request.headers.get("x-spine-eval")?.trim() ?? "";
  const evalSecret = (process.env.SPINE_EVAL_TOKEN ?? "clinix-spine-eval-2026-10-23").trim();
  const allowed = Boolean(staff) || (evalHeader.length > 0 && evalHeader === evalSecret);
  if (!allowed) {
    return Response.json({ message: "Sign in as staff to run the coding eval." }, { status: 401 });
  }

  let body: { limit?: unknown; ids?: unknown } = {};
  try {
    body = (await request.json()) as { limit?: unknown; ids?: unknown };
  } catch {
    body = {};
  }

  const fixtures = JSON.parse(
    readFileSync(path.join(process.cwd(), "tests/fixtures/spine-office-facts.json"), "utf8"),
  ) as Fixture[];
  const notes = new Map(
    (
      JSON.parse(
        readFileSync(path.join(process.cwd(), "docs/spine-coding/baseline-2026-10-22/cases.json"), "utf8"),
      ) as { id: string; note: string }[]
    ).map((item) => [item.id, item.note]),
  );

  const onlyIds = Array.isArray(body.ids)
    ? new Set(body.ids.filter((item): item is string => typeof item === "string"))
    : null;
  const limit = typeof body.limit === "number" && body.limit > 0 ? Math.floor(body.limit) : fixtures.length;
  const selected = fixtures.filter((fixture) => (onlyIds ? onlyIds.has(fixture.id) : true)).slice(0, limit);

  const library = codeLibrary();
  const rows = [];
  for (const fixture of selected) {
    const note = notes.get(fixture.id) ?? "";
    const extracted = await extractCodingFacts(note);
    const coded = codeVisit(extracted.facts, library);
    const cpts = coded.lines.map((line) => line.cpt);
    const icds = coded.diagnoses.map((item) => item.icd);
    const problems = claimCodeProblems(library, {
      dateOfService: new Date().toISOString().slice(0, 10),
      lines: coded.lines.map((line) => ({
        cpt: line.cpt,
        modifiers: line.modifiers,
        diagnoses: line.diagnosisPointers.length ? line.diagnosisPointers : icds.slice(0, 1),
        includeOnBill: line.cpt !== "99024",
        units: line.units,
      })),
    });
    const cptHit =
      !fixture.expectedCptAnyOf.length || fixture.expectedCptAnyOf.some((code) => cpts.includes(code));
    const icdHit =
      !fixture.expectedIcdAnyOf.length ||
      fixture.expectedIcdAnyOf.some((pattern) => icds.some((code) => matchesPattern(code, pattern)));
    rows.push({
      id: fixture.id,
      cptHit,
      icdHit,
      cpts,
      icds,
      extractWarnings: extracted.warnings.map((item) => item.message),
      validatorProblems: problems,
      ok: cptHit && icdHit && problems.length === 0 && !extracted.warnings.some((item) => /credit|billing|api key/i.test(item.message)),
    });
  }

  const passed = rows.filter((row) => row.ok).length;
  return Response.json({
    generatedAt: new Date().toISOString(),
    count: rows.length,
    passed,
    failed: rows.length - passed,
    passRate: rows.length ? passed / rows.length : 0,
    rows,
  });
}
