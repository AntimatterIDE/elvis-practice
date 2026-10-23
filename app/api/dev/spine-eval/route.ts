import { readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { suggestVisitCodes } from "@/lib/coding/suggest";
import { codeLibrary } from "@/lib/coding/library";
import { getStaffSession } from "@/lib/supabase/session";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 300;

type Fixture = {
  id: string;
  expectedCptAnyOf: string[];
  expectedIcdAnyOf: string[];
  expectedModifiersAnyOf?: string[];
};

function matchesPattern(code: string, pattern: string) {
  const trimmed = pattern.trim();
  if (trimmed.endsWith("*")) return code.startsWith(trimmed.slice(0, -1));
  return code === trimmed;
}

function readJson<T>(relative: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), relative), "utf8")) as T;
}

/**
 * Live suggest path (same as visit pipeline /api/coding/suggest).
 * Staff session, or temporary x-spine-eval header for batch runs.
 */
export async function POST(request: Request) {
  const staff = await getStaffSession();
  const evalHeader = request.headers.get("x-spine-eval")?.trim() ?? "";
  const evalSecret = (process.env.SPINE_EVAL_TOKEN ?? "clinix-spine-eval-2026-10-23").trim();
  const allowed = Boolean(staff) || (evalHeader.length > 0 && evalHeader === evalSecret);
  if (!allowed) {
    return Response.json({ message: "Sign in as staff to run the coding eval." }, { status: 401 });
  }

  let body: { limit?: unknown; ids?: unknown; imperfect?: unknown } = {};
  try {
    body = (await request.json()) as { limit?: unknown; ids?: unknown; imperfect?: unknown };
  } catch {
    body = {};
  }

  const useImperfect = body.imperfect !== false && body.imperfect !== "false" && body.imperfect !== 0;
  const fixtures = readJson<Fixture[]>("tests/fixtures/spine-office-facts.json");
  const cleanNotes = new Map(
    (readJson<{ id: string; note: string }[]>("docs/spine-coding/baseline-2026-10-22/cases.json")).map((item) => [
      item.id,
      item.note,
    ]),
  );
  const imperfectPath = "docs/spine-coding/baseline-2026-10-22/imperfect-cases.json";
  const imperfectNotes = existsSync(path.join(process.cwd(), imperfectPath))
    ? new Map(
        (readJson<{ id: string; note: string; imperfect?: boolean; mutations?: string[] }[]>(imperfectPath)).map(
          (item) => [item.id, item],
        ),
      )
    : new Map();

  const onlyIds = Array.isArray(body.ids)
    ? new Set(body.ids.filter((item): item is string => typeof item === "string"))
    : null;
  const limit = typeof body.limit === "number" && body.limit > 0 ? Math.floor(body.limit) : fixtures.length;
  const selected = fixtures.filter((fixture) => (onlyIds ? onlyIds.has(fixture.id) : true)).slice(0, limit);

  const library = codeLibrary();
  const rows = [];
  for (const fixture of selected) {
    const imperfect = useImperfect ? imperfectNotes.get(fixture.id) : null;
    const note = imperfect?.note ?? cleanNotes.get(fixture.id) ?? "";
    const suggested = await suggestVisitCodes(note, { library });
    const cpts = suggested.coding.lines.map((line) => line.cpt);
    const icds = suggested.coding.diagnoses.map((item) => item.icd);
    const modifiers = suggested.coding.lines.flatMap((line) => line.modifiers);
    const cptHit =
      !fixture.expectedCptAnyOf.length || fixture.expectedCptAnyOf.some((code) => cpts.includes(code));
    const icdHit =
      !fixture.expectedIcdAnyOf.length ||
      fixture.expectedIcdAnyOf.some((pattern) => icds.some((code) => matchesPattern(code, pattern)));
    const modifierHit =
      !(fixture.expectedModifiersAnyOf ?? []).length ||
      (fixture.expectedModifiersAnyOf ?? []).every((modifier) => modifiers.includes(modifier));
    const hardFail = suggested.extractWarnings.some((item) => /credit|billing|api key/i.test(item.message));
    rows.push({
      id: fixture.id,
      imperfect: Boolean(imperfect?.imperfect),
      mutations: imperfect?.mutations ?? [],
      cptHit,
      icdHit,
      modifierHit,
      cpts,
      icds,
      modifiers,
      extractWarnings: suggested.extractWarnings.map((item) => item.message),
      codingWarnings: suggested.coding.warnings,
      blocked: suggested.blocked,
      enabled: suggested.enabled,
      codeHit: cptHit && icdHit,
      ok:
        Boolean(suggested.enabled) &&
        cptHit &&
        icdHit &&
        modifierHit &&
        suggested.blocked.length === 0 &&
        !hardFail,
    });
  }

  const passed = rows.filter((row) => row.ok).length;
  const codePassed = rows.filter((row) => row.codeHit).length;
  return Response.json({
    generatedAt: new Date().toISOString(),
    path: "suggestVisitCodes",
    imperfect: useImperfect,
    count: rows.length,
    passed,
    failed: rows.length - passed,
    passRate: rows.length ? passed / rows.length : 0,
    codePassRate: rows.length ? codePassed / rows.length : 0,
    rows,
  });
}
