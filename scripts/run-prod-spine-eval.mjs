#!/usr/bin/env node
/**
 * Hits production /api/dev/spine-eval in batches (uses Vercel OPENAI_API_KEY).
 * Requires a staff session cookie: SPINE_EVAL_COOKIE="sb-...=..."
 * Usage: SPINE_EVAL_COOKIE='...' node scripts/run-prod-spine-eval.mjs
 */
const origin = process.env.SPINE_EVAL_ORIGIN || "https://thealignmentclinic.com";
const cookie = process.env.SPINE_EVAL_COOKIE || "";
const batchSize = Number(process.env.SPINE_EVAL_BATCH || 8);
if (!cookie) {
  console.error("Set SPINE_EVAL_COOKIE to a staff session cookie from thealignmentclinic.com");
  process.exit(1);
}

const allIds = [
  "E01","E02","E03","E04","E05","E06","E07","E08","E09","E10",
  "E11","E12","E13","E14","E15","E16","E17","E18","E19","E20",
  "E21","E22","E23","E24","E25",
  "T01","T02","T03","T04","T05","T06",
  "X01","X02","X03","X05","X07","X08","X04","X06",
  "P01","P02","P03","P04","P05","P06","P07","P08",
  "S01","S02","S03","S04","S05","S06","S07","S08","S09","S10","S11","S12","S13",
];

const rows = [];
for (let i = 0; i < allIds.length; i += batchSize) {
  const ids = allIds.slice(i, i + batchSize);
  console.log(`Batch ${i / batchSize + 1}: ${ids.join(", ")}`);
  const response = await fetch(`${origin}/api/dev/spine-eval`, {
    method: "POST",
    headers: {
      "content-type": "application/json",
      cookie,
    },
    body: JSON.stringify({ ids }),
  });
  const text = await response.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    console.error("Non-JSON response", response.status, text.slice(0, 400));
    process.exit(1);
  }
  if (!response.ok) {
    console.error("Eval failed", response.status, payload);
    process.exit(1);
  }
  rows.push(...(payload.rows || []));
  console.log(`  → ${payload.passed}/${payload.count} in batch`);
}

const passed = rows.filter((row) => row.ok).length;
const failed = rows.filter((row) => !row.ok);
const out = {
  generatedAt: new Date().toISOString(),
  origin,
  count: rows.length,
  passed,
  failed: failed.length,
  passRate: rows.length ? passed / rows.length : 0,
  failures: failed.map((row) => ({
    id: row.id,
    cpts: row.cpts,
    icds: row.icds,
    extractWarnings: row.extractWarnings,
    validatorProblems: row.validatorProblems,
  })),
  rows,
};

const fs = await import("node:fs");
const path = await import("node:path");
const outPath = path.join("docs/spine-coding/baseline-2026-10-22", "production-extraction-eval.json");
fs.writeFileSync(outPath, `${JSON.stringify(out, null, 2)}\n`);
console.log(`\nProduction extraction eval: ${passed}/${rows.length} (${Math.round(out.passRate * 100)}%)`);
if (failed.length) {
  console.log("Failures:");
  for (const row of failed.slice(0, 20)) {
    console.log(
      `  ${row.id}: cpt=[${(row.cpts || []).join(",")}] icd=[${(row.icds || []).join(",")}] warn=${(row.extractWarnings || [])[0] || ""} val=${(row.validatorProblems || [])[0] || ""}`,
    );
  }
}
console.log(`Wrote ${outPath}`);
process.exitCode = failed.length ? 1 : 0;
