#!/usr/bin/env node
/**
 * Live suggestVisitCodes eval on production (same path as visit UI).
 * Usage: node scripts/run-prod-suggest-eval.mjs
 */
const origin = process.env.SPINE_EVAL_ORIGIN || "https://thealignmentclinic.com";
const token = process.env.SPINE_EVAL_TOKEN || "clinix-spine-eval-2026-10-23";
const batchSize = Number(process.env.SPINE_EVAL_BATCH || 3);
const imperfect = process.env.SPINE_EVAL_IMPERFECT !== "0";
const maxAttempts = Number(process.env.SPINE_EVAL_RETRIES || 4);

const fixtures = JSON.parse(
  await import("node:fs").then((fs) =>
    fs.readFileSync("tests/fixtures/spine-office-facts.json", "utf8"),
  ),
);
const allIds = fixtures.map((item) => item.id);

async function fetchBatch(ids) {
  let lastError = null;
  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    try {
      const response = await fetch(`${origin}/api/dev/spine-eval`, {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-spine-eval": token,
        },
        body: JSON.stringify({ ids, imperfect }),
        signal: AbortSignal.timeout(280_000),
      });
      const text = await response.text();
      let payload;
      try {
        payload = JSON.parse(text);
      } catch {
        throw new Error(`Non-JSON ${response.status}: ${text.slice(0, 200)}`);
      }
      if (!response.ok) throw new Error(`HTTP ${response.status}: ${JSON.stringify(payload).slice(0, 200)}`);
      return payload;
    } catch (error) {
      lastError = error;
      console.error(`  retry ${attempt}/${maxAttempts}: ${error instanceof Error ? error.message : error}`);
      await new Promise((resolve) => setTimeout(resolve, 2000 * attempt));
    }
  }
  throw lastError ?? new Error("batch failed");
}

const rows = [];
for (let i = 0; i < allIds.length; i += batchSize) {
  const ids = allIds.slice(i, i + batchSize);
  console.log(`Batch ${i / batchSize + 1}/${Math.ceil(allIds.length / batchSize)}: ${ids.join(", ")}`);
  const payload = await fetchBatch(ids);
  rows.push(...(payload.rows || []));
  console.log(`  → ${payload.passed}/${payload.count} in batch (running ${rows.filter((r) => r.ok).length}/${rows.length})`);
}

const passed = rows.filter((row) => row.ok).length;
const imperfectRows = rows.filter((row) => row.imperfect);
const cleanRows = rows.filter((row) => !row.imperfect);
const out = {
  generatedAt: new Date().toISOString(),
  origin,
  path: "suggestVisitCodes",
  imperfect,
  count: rows.length,
  passed,
  failed: rows.length - passed,
  passRate: rows.length ? passed / rows.length : 0,
  imperfectPassRate: imperfectRows.length
    ? imperfectRows.filter((row) => row.ok).length / imperfectRows.length
    : null,
  cleanPassRate: cleanRows.length ? cleanRows.filter((row) => row.ok).length / cleanRows.length : null,
  cptHitRate: rows.filter((row) => row.cptHit).length / (rows.length || 1),
  icdHitRate: rows.filter((row) => row.icdHit).length / (rows.length || 1),
  modifierHitRate: rows.filter((row) => row.modifierHit).length / (rows.length || 1),
  failures: rows
    .filter((row) => !row.ok)
    .map((row) => ({
      id: row.id,
      imperfect: row.imperfect,
      mutations: row.mutations,
      cpts: row.cpts,
      icds: row.icds,
      modifiers: row.modifiers,
      cptHit: row.cptHit,
      icdHit: row.icdHit,
      modifierHit: row.modifierHit,
      blocked: row.blocked,
      extractWarnings: (row.extractWarnings || []).slice(0, 2),
    })),
  rows,
};

const fs = await import("node:fs");
const outPath = "docs/spine-coding/baseline-2026-10-22/live-suggest-imperfect-eval.json";
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(
  `\nLive suggest (imperfect=${imperfect}): ${passed}/${rows.length} (${Math.round(out.passRate * 100)}%)`,
);
console.log(
  `  clean ${cleanRows.filter((r) => r.ok).length}/${cleanRows.length} · imperfect ${imperfectRows.filter((r) => r.ok).length}/${imperfectRows.length}`,
);
console.log(
  `  cptHit ${Math.round(out.cptHitRate * 100)}% · icdHit ${Math.round(out.icdHitRate * 100)}% · modHit ${Math.round(out.modifierHitRate * 100)}%`,
);
console.log(`Wrote ${outPath}`);
process.exitCode = 0;
