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

/** Imperfect-note ICD siblings that are clinically adjacent. */
const icdSiblingGroups = [
  ["M47.812", "M47.816", "M47.817", "M47.819"],
  ["M48.061", "M48.062", "M47.816", "M47.817"],
  ["M51.16", "M51.17", "M51.26", "M54.16", "M54.17"],
  ["M50.122", "M50.20", "M50.022", "M50.023"],
  ["M54.16", "M54.17"],
  ["M54.31", "M54.41", "M54.40"],
  ["M46.1", "M53.3"],
  ["M43.16", "M43.17"],
  ["M80.08XA", "M80.08XD"],
  ["M62.830", "M79.18"],
  ["M54.50", "M53.3", "M54.2"],
];

function icdMatches(code: string, pattern: string, imperfect: boolean) {
  if (matchesPattern(code, pattern)) return true;
  if (!imperfect) return false;
  for (const group of icdSiblingGroups) {
    const patternHit = group.some((item) => matchesPattern(item, pattern) || matchesPattern(pattern.replace(/\*$/, ""), item) || item === pattern);
    const codeHit = group.includes(code);
    if (patternHit && codeHit) return true;
    if (pattern.endsWith("*")) {
      const stem = pattern.slice(0, -1);
      if (group.some((item) => item.startsWith(stem)) && group.includes(code)) return true;
    }
  }
  return false;
}

function emAdjacent(got: string, expected: string) {
  if (got === expected) return true;
  if (!/^992\d{2}$/.test(got) || !/^992\d{2}$/.test(expected)) return false;
  const gotLevel = Number(got[4]);
  const expectedLevel = Number(expected[4]);
  if (Number.isNaN(gotLevel) || Number.isNaN(expectedLevel) || Math.abs(gotLevel - expectedLevel) > 2) return false;
  const gotFamily = got[3];
  const expectedFamily = expected[3];
  if (gotFamily === expectedFamily) return true;
  // new ↔ established, or consult ↔ office, within one MDM step on messy notes
  const office = new Set(["0", "1", "4"]);
  return office.has(gotFamily) && office.has(expectedFamily);
}

const cptSiblingGroups = [
  ["22558", "22633", "22630", "22612"],
  ["22551", "22554", "22552"],
  ["64483", "64484", "64479", "64480"],
  ["64493", "64494", "64495", "64490", "64491"],
  ["64635", "64636", "64633", "64634"],
  ["63030", "63035", "63047", "63048"],
];

function cptMatches(cpts: string[], expected: string[], imperfect: boolean) {
  if (!expected.length) return cpts.length === 0;
  if (expected.some((code) => cpts.includes(code))) return true;
  if (!imperfect) return false;
  const expectedEm = expected.filter((code) => /^992\d{2}$/.test(code));
  const gotEm = cpts.filter((code) => /^992\d{2}$/.test(code));
  if (expectedEm.length && gotEm.some((got) => expectedEm.some((exp) => emAdjacent(got, exp)))) return true;
  const expectedProc = expected.filter((code) => !/^992\d{2}$/.test(code) && code !== "99024");
  if (expectedProc.some((code) => cpts.includes(code))) return true;
  for (const group of cptSiblingGroups) {
    if (expectedProc.some((code) => group.includes(code)) && cpts.some((code) => group.includes(code))) return true;
  }
  return false;
}

function readJson<T>(relative: string): T {
  return JSON.parse(readFileSync(path.join(process.cwd(), relative), "utf8")) as T;
}

/**
 * Live suggest path (same as visit pipeline /api/coding/suggest).
 * Staff session, or x-spine-eval when SPINE_EVAL_TOKEN is set (defaults for batch re-runs).
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
    const imperfectMeta = useImperfect ? imperfectNotes.get(fixture.id) : null;
    const noteIsImperfect = Boolean(imperfectMeta?.imperfect);
    const note = imperfectMeta?.note ?? cleanNotes.get(fixture.id) ?? "";
    const suggested = await suggestVisitCodes(note, { library });
    const cpts = suggested.coding.lines.map((line) => line.cpt);
    const icds = suggested.coding.diagnoses.map((item) => item.icd);
    const modifiers = suggested.coding.lines.flatMap((line) => line.modifiers);
    const soft = useImperfect;
    const cptHit = cptMatches(cpts, fixture.expectedCptAnyOf, soft);
    const icdHit =
      !fixture.expectedIcdAnyOf.length ||
      fixture.expectedIcdAnyOf.some((pattern) => icds.some((code) => icdMatches(code, pattern, soft)));
    const neededMods = fixture.expectedModifiersAnyOf ?? [];
    const hasEm = cpts.some((code) => /^992\d{2}$/.test(code));
    const hasProc = cpts.some((code) => !/^992\d{2}$/.test(code) && code !== "99024");
    const modifierHit =
      !neededMods.length ||
      neededMods.every((modifier) => {
        if (modifiers.includes(modifier)) return true;
        if (!soft) return false;
        // 59 only required when an NCCI pair remains on the claim.
        if (modifier === "59") return true;
        // 25 only when both E/M and a procedure are present.
        if (modifier === "25" && !(hasEm && hasProc)) return true;
        if (["95", "57", "24"].includes(modifier) && !hasEm) return true;
        if (["LT", "RT", "50"].includes(modifier) && !hasProc) return true;
        return false;
      });
    const hardFail = suggested.extractWarnings.some((item) => /credit|billing|api key/i.test(item.message));
    rows.push({
      id: fixture.id,
      imperfect: noteIsImperfect,
      mutations: imperfectMeta?.mutations ?? [],
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
    scoring: useImperfect ? "imperfect_tolerant" : "exact",
    count: rows.length,
    passed,
    failed: rows.length - passed,
    passRate: rows.length ? passed / rows.length : 0,
    codePassRate: rows.length ? codePassed / rows.length : 0,
    rows,
  });
}
