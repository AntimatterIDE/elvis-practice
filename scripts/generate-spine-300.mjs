/**
 * Build 300 golden spine fixtures + notes with expected modifiers.
 * Keeps the original 60 IDs, annotates modifiers, adds M001–M240.
 * Usage: node scripts/generate-spine-300.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";

const root = process.cwd();
const require = createRequire(import.meta.url);

// Use dynamic import of compiled path via tsx when run as: npx tsx scripts/generate-spine-300.mjs
const { codeVisit, resetSpineRulesCache } = await import("../lib/coding/spine.ts");
const { buildCodeLibrary } = await import("../lib/coding/codes.ts");

resetSpineRulesCache();
const library = buildCodeLibrary(
  JSON.parse(readFileSync(path.join(root, "data/coding/icd10cm.json"), "utf8")),
  JSON.parse(readFileSync(path.join(root, "data/coding/procedures.json"), "utf8")),
  {
    ptp: JSON.parse(readFileSync(path.join(root, "data/coding/ncci-ptp.json"), "utf8")),
    mue: JSON.parse(readFileSync(path.join(root, "data/coding/mue.json"), "utf8")),
    addon: JSON.parse(readFileSync(path.join(root, "data/coding/addon-primaries.json"), "utf8")),
  },
);

const existing = JSON.parse(readFileSync(path.join(root, "tests/fixtures/spine-office-facts.json"), "utf8"));
const existingNotes = JSON.parse(
  readFileSync(path.join(root, "docs/spine-coding/baseline-2026-10-22/cases.json"), "utf8"),
);
const noteById = new Map(existingNotes.map((item) => [item.id, item]));

function noteFromFacts(id, title, facts) {
  const chunks = [`CASE ${id}: ${title}`, "SUBJECTIVE:"];
  if (facts.visit?.quote) chunks.push(facts.visit.quote);
  for (const d of facts.diagnoses ?? []) if (d.quote) chunks.push(d.quote);
  if (facts.injury?.quote) chunks.push(facts.injury.quote);
  chunks.push("OBJECTIVE:");
  for (const p of facts.procedures ?? []) if (p.quote) chunks.push(p.quote);
  chunks.push("ASSESSMENT:");
  for (const d of facts.diagnoses ?? []) if (d.quote) chunks.push(`Assessment: ${d.quote}`);
  chunks.push("PLAN:");
  if (facts.visit?.quote) chunks.push(`Plan: ${facts.visit.quote}`);
  for (const p of facts.procedures ?? []) {
    if (p.quote) chunks.push(p.performed ? `Procedure performed: ${p.quote}` : `Plan procedure: ${p.quote}`);
  }
  return chunks.join("\n");
}

function annotate(fixture) {
  const coded = codeVisit(fixture.facts, library);
  const mods = [...new Set(coded.lines.flatMap((line) => line.modifiers))];
  const onCpt = {};
  for (const line of coded.lines) {
    if (!line.modifiers.length) continue;
    onCpt[line.cpt] = [...new Set([...(onCpt[line.cpt] ?? []), ...line.modifiers])];
  }
  return {
    ...fixture,
    expectedModifiersAnyOf: mods,
    expectedModifiersOnCpt: onCpt,
  };
}

function visit(kind, complexity, flags, quote) {
  return {
    kind,
    complexity,
    totalMinutes: null,
    decisionForSurgery: Boolean(flags.decisionForSurgery),
    unrelatedToGlobalSurgery: Boolean(flags.unrelatedToGlobalSurgery),
    significantSeparateProblem: Boolean(flags.significantSeparateProblem),
    quote,
  };
}

function dx(condition, region, quote, extra = {}) {
  return {
    condition,
    region: region ?? null,
    levels: extra.levels ?? [],
    side: extra.side ?? null,
    with: extra.with ?? [],
    status: extra.status ?? "current",
    quote,
  };
}

function proc(name, levels, side, performed, quote, globalModifier = null) {
  return { name, levels, side, performed, globalModifier, quote };
}

const generated = [];
const generatedNotes = [];

function add(id, title, expectedCptAnyOf, expectedIcdAnyOf, facts, extra = {}) {
  const fixture = {
    id,
    title,
    expectedCptAnyOf,
    expectedIcdAnyOf,
    forbiddenCptPrefixes: extra.forbiddenCptPrefixes ?? [],
    forbiddenIcdPrefixes: extra.forbiddenIcdPrefixes ?? [],
    facts,
  };
  const annotated = annotate(fixture);
  // Prefer hand-declared expected modifiers when provided (must be subset of engine output).
  if (extra.expectedModifiersAnyOf) {
    annotated.expectedModifiersAnyOf = extra.expectedModifiersAnyOf;
  }
  if (extra.expectedModifiersOnCpt) {
    annotated.expectedModifiersOnCpt = extra.expectedModifiersOnCpt;
  }
  generated.push(annotated);
  generatedNotes.push({ id, title, note: noteFromFacts(id, title, facts) });
}

const sides = ["left", "right", "bilateral"];
const complexities = ["low", "moderate", "high"];
const regions = [
  ["lumbar", "L4-L5", "disc_herniation", ["radiculopathy"], "M51.16"],
  ["cervical", "C5-C6", "disc_herniation", ["radiculopathy"], "M50.122"],
  ["lumbar", "L4-L5", "stenosis", ["neurogenic_claudication"], "M48.062"],
  ["cervical", "C5-C6", "spondylosis", [], "M47.812"],
  ["lumbar", "L4-L5", "spondylosis", [], "M47.816"],
];

let n = 1;
const mid = () => `M${String(n++).padStart(3, "0")}`;

// --- Visit modifiers: 57, 24, 95 ---
for (const complexity of complexities) {
  for (const kind of ["office_new", "office_established"]) {
    const id = mid();
    const q = `High-stakes ${complexity} MDM with decision for surgery documented.`;
    add(
      id,
      `${kind} ${complexity} decision for surgery → 57`,
      kind === "office_new"
        ? [complexity === "high" ? "99205" : complexity === "moderate" ? "99204" : "99203"]
        : [complexity === "high" ? "99215" : complexity === "moderate" ? "99214" : "99213"],
      ["M48.062"],
      {
        visit: visit(kind, complexity, { decisionForSurgery: true }, q),
        procedures: [],
        diagnoses: [dx("stenosis", "lumbar", "Lumbar stenosis with neurogenic claudication", { levels: ["L4-L5"], with: ["neurogenic_claudication"] })],
        injury: null,
      },
      { expectedModifiersAnyOf: ["57"] },
    );
  }
}

for (const complexity of ["low", "moderate"]) {
  const id = mid();
  const q = `Unrelated problem inside global period, ${complexity} MDM.`;
  add(
    id,
    `office_established ${complexity} unrelated in global → 24`,
    [complexity === "moderate" ? "99214" : "99213"],
    ["M54.50"],
    {
      visit: visit("office_established", complexity, { unrelatedToGlobalSurgery: true }, q),
      procedures: [],
      diagnoses: [dx("low_back_pain", "lumbar", "Mechanical low back pain unrelated to recent fusion")],
      injury: null,
    },
    { expectedModifiersAnyOf: ["24"] },
  );
}

for (const kind of ["telehealth_established", "telehealth_new"]) {
  for (const complexity of complexities) {
    const id = mid();
    const q = `Video telehealth visit with ${complexity} MDM.`;
    const cpt =
      kind === "telehealth_new"
        ? complexity === "high"
          ? "99205"
          : complexity === "moderate"
            ? "99204"
            : "99203"
        : complexity === "high"
          ? "99215"
          : complexity === "moderate"
            ? "99214"
            : "99213";
    add(
      id,
      `${kind} ${complexity} → 95`,
      [cpt],
      ["M54.16"],
      {
        visit: visit(kind, complexity, {}, q),
        procedures: [],
        diagnoses: [dx("radiculopathy", "lumbar", "Lumbar radiculopathy follow-up on video")],
        injury: null,
      },
      { expectedModifiersAnyOf: ["95"] },
    );
  }
}

// --- Same-day E/M + injection → 25 + laterality ---
for (const side of sides) {
  for (const [region, level, condition, withArr] of regions.slice(0, 3)) {
    const id = mid();
    const sideLabel = side === "bilateral" ? "bilateral" : side;
    const qVisit = `Separately significant office visit before ${sideLabel} injection.`;
    const qProc = `Performed ${sideLabel} ${region} transforaminal epidural steroid injection at ${level}.`;
    const qDx = `${condition.replace(/_/g, " ")} at ${level}`;
    add(
      id,
      `E/M + TFESI ${side} ${region} → 25 + laterality`,
      ["99214", "64483", "64479"],
      region === "cervical" ? ["M50.122"] : condition === "stenosis" ? ["M48.062"] : ["M51.16", "M51.17"],
      {
        visit: visit("office_established", "moderate", { significantSeparateProblem: true }, qVisit),
        procedures: [
          proc("transforaminal_esi", [level], side === "bilateral" ? "bilateral" : side, true, qProc),
        ],
        diagnoses: [
          dx(condition, region, qDx, {
            levels: [level],
            with: withArr,
            side: side === "bilateral" ? "bilateral" : side,
          }),
        ],
        injury: null,
      },
      {
        expectedModifiersAnyOf: side === "bilateral" ? ["25", "50"] : ["25", side === "left" ? "LT" : "RT"],
      },
    );
  }
}

// --- Injection-only laterality matrix ---
const injSpecs = [
  { name: "transforaminal_esi", levels: ["L5-S1"], region: "lumbar", cpts: ["64483"], icd: ["M51.17"], dx: () => dx("disc_herniation", "lumbar", "L5-S1 disc herniation with radiculopathy", { levels: ["L5-S1"], with: ["radiculopathy"] }) },
  { name: "transforaminal_esi", levels: ["L4-L5", "L5-S1"], region: "lumbar", cpts: ["64483", "64484"], icd: ["M51.16", "M51.17"], dx: () => dx("disc_herniation", "lumbar", "Two-level lumbar disc herniation with radiculopathy", { levels: ["L4-L5", "L5-S1"], with: ["radiculopathy"] }) },
  { name: "transforaminal_esi", levels: ["C6-C7"], region: "cervical", cpts: ["64479"], icd: ["M50.122"], dx: () => dx("disc_herniation", "cervical", "C6-C7 disc herniation with radiculopathy", { levels: ["C6-C7"], with: ["radiculopathy"] }) },
  { name: "medial_branch_block", levels: ["L4-L5", "L5-S1"], region: "lumbar", cpts: ["64493", "64494"], icd: ["M47.816"], dx: () => dx("spondylosis", "lumbar", "Lumbar facet arthropathy", { levels: ["L4-L5"] }), bilateral: true },
  { name: "medial_branch_block", levels: ["C4-C5", "C5-C6"], region: "cervical", cpts: ["64490", "64491"], icd: ["M47.812"], dx: () => dx("spondylosis", "cervical", "Cervical facet arthropathy", { levels: ["C4-C5"] }), bilateral: true },
  { name: "facet_rfa", levels: ["L4-L5", "L5-S1"], region: "lumbar", cpts: ["64635", "64636"], icd: ["M47.816"], dx: () => dx("spondylosis", "lumbar", "Lumbar facet RFA indication", { levels: ["L4-L5"] }) },
  { name: "facet_rfa", levels: ["C5-C6"], region: "cervical", cpts: ["64633"], icd: ["M47.812"], dx: () => dx("spondylosis", "cervical", "Cervical facet RFA indication", { levels: ["C5-C6"] }) },
  { name: "si_joint_injection", levels: [], region: "sacroiliac", cpts: ["27096"], icd: ["M46.1"], dx: () => dx("sacroiliitis", "sacroiliac", "Sacroiliitis with SI joint pain") },
  { name: "interlaminar_esi", levels: ["L4-L5"], region: "lumbar", cpts: ["62323"], icd: ["M48.061"], dx: () => dx("stenosis", "lumbar", "Lumbar stenosis for interlaminar ESI", { levels: ["L4-L5"] }), noLaterality: true },
  { name: "trigger_point", levels: ["trapezius", "levator", "paraspinal"], region: null, cpts: ["20553"], icd: ["M79.18"], dx: () => dx("myofascial_pain", null, "Myofascial pain with trigger points"), noLaterality: true },
  { name: "epidural_blood_patch", levels: [], region: null, cpts: ["62273"], icd: ["G97.1"], dx: () => dx("post_dural_puncture_headache", null, "Post-dural puncture headache"), noLaterality: true },
];

for (const spec of injSpecs) {
  const sideList = spec.noLaterality ? ["none"] : spec.bilateral ? ["bilateral", "left", "right"] : ["left", "right", "bilateral"];
  for (const side of sideList) {
    const id = mid();
    const q = `Procedure: ${side} ${spec.name.replace(/_/g, " ")} ${spec.levels.join(" ")} performed today.`.trim();
    const expectMods = [];
    if (spec.bilateral && side === "bilateral") expectMods.push("50");
    else if (!spec.noLaterality && side === "left") expectMods.push("LT");
    else if (!spec.noLaterality && side === "right") expectMods.push("RT");
    else if (!spec.noLaterality && side === "bilateral") expectMods.push("50");
    add(
      id,
      `Injection ${spec.name} ${side} ${spec.levels.join("+") || "n/a"}`,
      spec.cpts,
      spec.icd,
      {
        visit: null,
        procedures: [proc(spec.name, spec.levels, side === "none" ? "none" : side, true, q)],
        diagnoses: [spec.dx()],
        injury: null,
      },
      { expectedModifiersAnyOf: expectMods },
    );
  }
}

// --- Surgery with laterality / global modifiers / NCCI 59 ---
const surgSpecs = [
  { name: "microdiscectomy", levels: ["L5-S1"], side: "left", cpts: ["63030"], icd: ["M51.17"], dxq: "Left L5-S1 disc herniation with radiculopathy", condition: "disc_herniation", region: "lumbar", with: ["radiculopathy"], expect: ["LT"] },
  { name: "microdiscectomy", levels: ["L4-L5"], side: "right", cpts: ["63030"], icd: ["M51.16"], dxq: "Right L4-L5 disc herniation with radiculopathy", condition: "disc_herniation", region: "lumbar", with: ["radiculopathy"], expect: ["RT"] },
  { name: "si_joint_fusion", levels: [], side: "left", cpts: ["27279"], icd: ["M46.1"], dxq: "Left sacroiliitis for fusion", condition: "sacroiliitis", region: "sacroiliac", with: [], expect: ["LT"] },
  { name: "si_joint_fusion", levels: [], side: "right", cpts: ["27279"], icd: ["M46.1"], dxq: "Right sacroiliitis for fusion", condition: "sacroiliitis", region: "sacroiliac", with: [], expect: ["RT"] },
  { name: "kyphoplasty", levels: ["T12"], side: "none", cpts: ["22513"], icd: ["M80.08XA"], dxq: "Osteoporotic T12 compression fracture initial", condition: "osteoporotic_fracture", region: "thoracic", with: ["initial"], expect: [] },
  { name: "kyphoplasty", levels: ["L1"], side: "none", cpts: ["22514"], icd: ["M80.08XA"], dxq: "Osteoporotic L1 compression fracture initial", condition: "osteoporotic_fracture", region: "lumbar", with: ["initial"], expect: [] },
];

for (const spec of surgSpecs) {
  const id = mid();
  const q = `Procedure: ${spec.name.replace(/_/g, " ")} ${spec.levels.join(" ")} ${spec.side} performed.`.trim();
  add(
    id,
    `Surgery ${spec.name} ${spec.side}`,
    spec.cpts,
    spec.icd,
    {
      visit: null,
      procedures: [proc(spec.name, spec.levels, spec.side, true, q)],
      diagnoses: [
        dx(spec.condition, spec.region, spec.dxq, { levels: spec.levels, with: spec.with, side: spec.side === "none" ? null : spec.side }),
      ],
      injury: null,
    },
    { expectedModifiersAnyOf: spec.expect },
  );
}

// ACDF multi-line (expect 59 on instrumentation when NCCI requires)
for (let i = 0; i < 8; i += 1) {
  const id = mid();
  const levels = i % 2 === 0 ? ["C5-C6", "C6-C7"] : ["C4-C5", "C5-C6", "C6-C7"];
  const qAcdf = `Anterior cervical discectomy and fusion ${levels.join(" and ")} performed.`;
  const qCage = `Interbody cages placed at ${levels.join(" and ")}.`;
  const qPlate = `Anterior plate instrumentation across ${levels.join(" to ")}.`;
  add(
    id,
    `ACDF ${levels.length}-level with cages/plate (NCCI 59)`,
    ["22551", "22552", "22853"],
    ["M47.12", "M50.022"],
    {
      visit: null,
      procedures: [
        proc("acdf", levels, "none", true, qAcdf),
        proc("interbody_cage", levels, "none", true, qCage),
        proc("anterior_instrumentation", levels.map((l) => l.split("-")[0]).concat(levels.at(-1).split("-")[1]), "none", true, qPlate),
      ],
      diagnoses: [dx("spondylotic_myelopathy", "cervical", "Cervical spondylotic myelopathy", { with: ["myelopathy"], levels })],
      injury: null,
    },
    { expectedModifiersAnyOf: ["59"] },
  );
}

// Global return modifiers 58/78/79 on microdiscectomy
for (const g of ["58", "78", "79"]) {
  for (const side of ["left", "right"]) {
    const id = mid();
    const q = `Return procedure ${g}: ${side} L5-S1 microdiscectomy performed in global period.`;
    add(
      id,
      `Microdiscectomy ${side} with global modifier ${g}`,
      ["63030"],
      ["M51.17"],
      {
        visit: null,
        procedures: [proc("microdiscectomy", ["L5-S1"], side, true, q, g)],
        diagnoses: [
          dx("disc_herniation", "lumbar", "Recurrent L5-S1 disc herniation with radiculopathy", {
            levels: ["L5-S1"],
            with: ["radiculopathy"],
            side,
          }),
        ],
        injury: null,
      },
      { expectedModifiersAnyOf: [g, side === "left" ? "LT" : "RT"] },
    );
  }
}

// --- Office variety (no required modifiers) ---
const officeDx = [
  ["low_back_pain", "lumbar", "M54.50", "Mechanical low back pain"],
  ["cervicalgia", "cervical", "M54.2", "Cervicalgia without radiculopathy"],
  ["muscle_spasm", "lumbar", "M62.830", "Muscle spasm of back"],
  ["coccydynia", null, "M53.3", "Coccydynia after fall"],
  ["sciatica", "lumbar", "M54.41", "Right-sided sciatica", { side: "right" }],
  ["spondylolisthesis", "lumbar", "M43.16", "L4-L5 spondylolisthesis", { levels: ["L4-L5"] }],
  ["postlaminectomy_syndrome", "lumbar", "M96.1", "Postlaminectomy syndrome"],
  ["ankylosing_spondylitis", "lumbar", "M45.6", "Ankylosing spondylitis lumbar"],
  ["si_joint_dysfunction", "sacroiliac", "M53.3", "SI joint dysfunction"],
  ["scoliosis", "thoracic", "M41.84", "Thoracic scoliosis"],
];

while (n <= 240) {
  const id = mid();
  const [condition, region, icd, quote, extra = {}] = officeDx[(n - 1) % officeDx.length];
  const kind = n % 2 === 0 ? "office_established" : "office_new";
  const complexity = complexities[n % 3];
  const cptTable = {
    office_new: { low: "99203", moderate: "99204", high: "99205" },
    office_established: { low: "99213", moderate: "99214", high: "99215" },
  };
  const q = `${complexity} complexity ${kind.replace("_", " ")} for ${quote}.`;
  // scoliosis ICD may vary — use pattern if needed
  const icdAny = condition === "scoliosis" ? ["M41.84", "M41.86", "M41.9", "M41.125"] : [icd];
  const cpt = cptTable[kind][complexity];
  add(
    id,
    `Office ${kind} ${complexity} ${condition}`,
    [cpt],
    icdAny,
    {
      visit: visit(kind, complexity, {}, q),
      procedures: [],
      diagnoses: [dx(condition, region, quote, extra)],
      injury: null,
    },
    { expectedModifiersAnyOf: [] },
  );
}

// Annotate original 60
const baseAnnotated = existing.map((fixture) => annotate(fixture));

// Merge: keep original 60 first, then generated (trim/pad to exactly 240 new)
const newOnes = generated.slice(0, 240);
while (newOnes.length < 240) {
  // should not happen
  const id = mid();
  add(id, "Pad office", ["99213"], ["M54.50"], {
    visit: visit("office_established", "low", {}, `Pad visit ${id}`),
    procedures: [],
    diagnoses: [dx("low_back_pain", "lumbar", `Pad diagnosis ${id}`)],
    injury: null,
  });
  newOnes.push(generated[generated.length - 1]);
  generatedNotes.push({ id, title: "Pad office", note: noteFromFacts(id, "Pad", newOnes.at(-1).facts) });
}

const allFixtures = [...baseAnnotated, ...newOnes.slice(0, 240)];
const allNotes = [
  ...existingNotes.map((item) => {
    // keep original notes for original IDs
    return noteById.get(item.id) ?? item;
  }),
  ...generatedNotes.slice(0, 240),
];

// Deduplicate notes by id (prefer generated for M*, original for E/P/S/T/X)
const noteMap = new Map();
for (const item of allNotes) noteMap.set(item.id, item);
const finalNotes = allFixtures.map((f) => {
  if (noteMap.has(f.id)) return noteMap.get(f.id);
  return { id: f.id, title: f.title, note: noteFromFacts(f.id, f.title, f.facts) };
});

if (allFixtures.length !== 300) {
  console.error(`Expected 300 fixtures, got ${allFixtures.length}`);
  process.exit(1);
}

// Validate all pass before write
let failed = 0;
const failures = [];
for (const fixture of allFixtures) {
  const note = finalNotes.find((item) => item.id === fixture.id)?.note ?? "";
  // quote check
  const { keepQuotedFacts } = await import("../lib/coding/facts.ts");
  const checked = keepQuotedFacts(note, fixture.facts);
  const coded = codeVisit(checked.facts, library);
  const cpts = coded.lines.map((l) => l.cpt);
  const icds = coded.diagnoses.map((d) => d.icd);
  const mods = coded.lines.flatMap((l) => l.modifiers);
  const errors = [];
  if (checked.warnings.length) errors.push(...checked.warnings.map((w) => w.message));
  if (fixture.expectedCptAnyOf.length && !fixture.expectedCptAnyOf.some((c) => cpts.includes(c))) {
    errors.push(`CPT ${cpts} vs ${fixture.expectedCptAnyOf}`);
  }
  if (fixture.expectedIcdAnyOf.length) {
    const hit = fixture.expectedIcdAnyOf.some((pattern) =>
      icds.some((code) => (pattern.endsWith("*") ? code.startsWith(pattern.slice(0, -1)) : code === pattern)),
    );
    if (!hit) errors.push(`ICD ${icds} vs ${fixture.expectedIcdAnyOf}`);
  }
  for (const m of fixture.expectedModifiersAnyOf ?? []) {
    if (!mods.includes(m)) errors.push(`missing modifier ${m} in [${mods}]`);
  }
  for (const [cpt, need] of Object.entries(fixture.expectedModifiersOnCpt ?? {})) {
    const line = coded.lines.find((l) => l.cpt === cpt);
    for (const m of need) {
      if (!line?.modifiers.includes(m)) errors.push(`missing ${m} on ${cpt}`);
    }
  }
  if (errors.length) {
    failed += 1;
    failures.push({ id: fixture.id, errors, cpts, icds, mods });
  }
}

writeFileSync(path.join(root, "tests/fixtures/spine-office-facts.json"), `${JSON.stringify(allFixtures, null, 2)}\n`);
writeFileSync(
  path.join(root, "docs/spine-coding/baseline-2026-10-22/cases.json"),
  `${JSON.stringify(finalNotes, null, 2)}\n`,
);
writeFileSync(
  path.join(root, "docs/spine-coding/baseline-2026-10-22/generate-300-report.json"),
  `${JSON.stringify({ count: allFixtures.length, failed, failures: failures.slice(0, 50) }, null, 2)}\n`,
);

console.log(`Wrote ${allFixtures.length} fixtures; preflight failed ${failed}`);
if (failed) {
  for (const f of failures.slice(0, 30)) console.log(f.id, f.errors.join(" | "));
  process.exitCode = 1;
}
