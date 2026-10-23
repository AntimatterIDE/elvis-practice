/**
 * Build messy real-world variants of the 300 baseline notes.
 * ~10% stay clean; the rest get OCR noise, truncation, typos, missing headers.
 * Usage: node scripts/generate-imperfect-notes.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import path from "node:path";

const root = process.cwd();
const cases = JSON.parse(
  readFileSync(path.join(root, "docs/spine-coding/baseline-2026-10-22/cases.json"), "utf8"),
);

function hash(id) {
  let h = 0;
  for (let i = 0; i < id.length; i += 1) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function typo(word, salt) {
  if (word.length < 5 || salt % 5 !== 0) return word;
  const i = 1 + (salt % (word.length - 2));
  return `${word.slice(0, i)}${word[i + 1] ?? ""}${word[i]}${word.slice(i + 2)}`;
}

function mess(note, id) {
  const salt = hash(id);
  // Every 10th case stays clean (control).
  if (salt % 10 === 0) {
    return { note, imperfect: false, mutations: ["clean_control"] };
  }

  let text = note;
  const mutations = [];

  // Drop SOAP headers
  if (salt % 3 !== 0) {
    text = text.replace(/\b(SUBJECTIVE|OBJECTIVE|ASSESSMENT|PLAN):\s*/gi, "");
    mutations.push("drop_headers");
  }

  // OCR / dash noise
  text = text.replace(/-/g, (salt % 2 === 0 ? "–" : "-"));
  if (salt % 4 === 0) {
    text = text.replace(/fusion/gi, "fuslon").replace(/radiculopathy/gi, "radiculopthy");
    mutations.push("ocr_typos");
  }

  // Abbreviate common words
  text = text
    .replace(/\bpatient\b/gi, "pt")
    .replace(/\bfollow[- ]?up\b/gi, "f/u")
    .replace(/\bstatus post\b/gi, "s/p")
    .replace(/\bhistory of\b/gi, "h/o");
  mutations.push("abbreviations");

  // Inject junk lines
  const junk = [
    "Dictated but not read.",
    "Page 2 of 3 — scanned from fax.",
    "*** CONFIDENTIAL ***",
    "Electronically signed.",
    "cc: referring PCP",
  ];
  if (salt % 2 === 1) {
    text = `${junk[salt % junk.length]}\n${text}\n${junk[(salt + 2) % junk.length]}`;
    mutations.push("fax_junk");
  }

  // Word-level typos on ~15% of long words
  text = text
    .split(/(\s+)/)
    .map((token, index) => (/^[A-Za-z]{5,}$/.test(token) ? typo(token, salt + index) : token))
    .join("");
  mutations.push("word_typos");

  // Mild truncation only — keep clinical keywords so coding remains testable.
  if (salt % 5 === 1) {
    const keep =
    /(procedure|stenosis|injection|fusion|blood patch|herniation|radiculopathy|spondyl|myelopathy|fracture|assessment|performed|transforaminal|epidural|medial branch|trigger point|kyphoplasty|neurogenic|claudication)/i;
    const lines = text.split("\n");
    const protectedLines = lines.filter((line) => keep.test(line));
    const cut = Math.floor(text.length * 0.75);
    text = `${text.slice(0, Math.max(120, cut))}\n${protectedLines.join("\n")}`;
    mutations.push("truncate_soft");
  }

  // Drop one middle sentence (~30%)
  if (salt % 7 === 3) {
    const sentences = text.split(/(?<=[.!?])\s+/);
    if (sentences.length > 3) {
      sentences.splice(1 + (salt % (sentences.length - 2)), 1);
      text = sentences.join(" ");
      mutations.push("drop_sentence");
    }
  }

  // Shuffle paragraph order lightly
  if (salt % 6 === 0) {
    const parts = text.split(/\n+/).filter(Boolean);
    if (parts.length > 2) {
      const [a, b] = [parts[0], parts[1]];
      parts[0] = b;
      parts[1] = a;
      text = parts.join("\n");
      mutations.push("shuffle_paras");
    }
  }

  // Ensure suggest API minimum length
  if (text.trim().length < 40) {
    text = `${note}\n(Scanned addendum incomplete.)`;
    mutations.push("pad_short");
  }

  return { note: text, imperfect: true, mutations };
}

const out = cases.map((item) => {
  const result = mess(item.note ?? "", item.id);
  return {
    id: item.id,
    title: item.title,
    imperfect: result.imperfect,
    mutations: result.mutations,
    note: result.note,
  };
});

const imperfectCount = out.filter((item) => item.imperfect).length;
const dest = path.join(root, "docs/spine-coding/baseline-2026-10-22/imperfect-cases.json");
writeFileSync(dest, `${JSON.stringify(out, null, 2)}\n`);
console.log(`Wrote ${out.length} notes (${imperfectCount} imperfect, ${out.length - imperfectCount} clean) → ${dest}`);
