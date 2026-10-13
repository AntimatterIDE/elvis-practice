import type { VisitCode } from "@/lib/encounters/types";

export type CatalogCode = {
  code: string;
  description: string;
};

type PreparedCode = CatalogCode & {
  codeLower: string;
  descriptionLower: string;
  words: string[];
};

const synonyms: Record<string, string[]> = {
  hurt: ["pain", "injury", "trauma", "ache", "contusion", "strain", "sprain"],
  broke: ["fracture", "break", "broken", "fx", "fractured"],
  left: ["left", "sinister"],
  right: ["right", "dexter"],
  hip: ["hip", "femur", "pelvis", "pelvic", "femoral", "acetabulum"],
  elbow: ["elbow", "humerus", "radius", "ulna", "olecranon", "humeral", "radial"],
  chest: ["chest", "thoracic", "cardiac", "lung", "thorax", "rib", "sternum"],
  headache: ["headache", "cephalgia", "migraine", "head", "cranial"],
  diabetes: ["diabetes", "diabetic", "mellitus", "glucose", "insulin"],
  exam: ["examination", "visit", "evaluation", "assessment", "checkup", "followup"],
  emergency: ["emergency", "urgent", "acute", "er", "trauma"],
  nausea: ["nausea", "vomiting", "emesis", "sick"],
  pain: ["pain", "ache", "discomfort", "soreness", "tender"],
};

const bodyParts = ["left", "right", "hip", "elbow", "chest", "head"];

export function levelForScore(score: number): 1 | 2 | 3 | null {
  // Same comparisons as the coding service. Keyword scores are usually above 1,
  // and a score of 2 still satisfies >= 0.95, so it is level 1.
  if (score >= 10 || score >= 0.95) return 1;
  if (score >= 5 || score >= 0.85) return 2;
  if (score >= 2 || score >= 0.7) return 3;
  return null;
}

function prepare(codes: CatalogCode[]): PreparedCode[] {
  const prepared: PreparedCode[] = [];
  for (const code of codes) {
    if (!code.code?.trim() || !code.description?.trim()) continue;
    const descriptionLower = code.description.toLowerCase();
    prepared.push({
      code: code.code,
      description: code.description,
      codeLower: code.code.toLowerCase(),
      descriptionLower,
      words: descriptionLower.split(/\s+/).filter(Boolean),
    });
  }
  return prepared;
}

function wordCounts(query: string) {
  const counts = new Map<string, number>();
  for (const word of query.toLowerCase().split(/\s+/)) {
    if (!word) continue;
    counts.set(word, (counts.get(word) ?? 0) + 1);
  }
  return counts;
}

function scoreCode(counts: Map<string, number>, queryText: string, code: PreparedCode) {
  let score = 0;
  for (const word of counts.keys()) {
    if (code.codeLower.includes(word)) {
      score += 10;
      break;
    }
  }

  for (const [word, count] of counts) {
    if (word.length <= 2) continue;
    if (code.descriptionLower.includes(word)) score += 2 * count;
    const related = synonyms[word];
    if (related) {
      let hits = 0;
      for (const synonym of related) {
        if (code.descriptionLower.includes(synonym)) hits += 1;
      }
      score += 1.5 * hits * count;
    }
    if (word.length > 3) {
      let partial = 0;
      for (const descWord of code.words) {
        if (descWord.includes(word)) partial += 1;
      }
      score += 0.5 * partial * count;
    }
  }

  for (const part of bodyParts) {
    if (queryText.includes(part) && code.descriptionLower.includes(part)) score += 3;
  }
  return score;
}

export function scoreCodes(query: string, codes: CatalogCode[], topK = 10) {
  const counts = wordCounts(query);
  const queryText = query.toLowerCase();
  const scored: { code: string; description: string; score: number }[] = [];
  for (const code of prepare(codes)) {
    const score = scoreCode(counts, queryText, code);
    if (score > 0) scored.push({ code: code.code, description: code.description, score });
  }
  scored.sort((left, right) => right.score - left.score);
  return scored.slice(0, topK);
}

export function suggestCodes(query: string, codes: CatalogCode[], topK = 10): VisitCode[] {
  const suggestions: VisitCode[] = [];
  for (const result of scoreCodes(query, codes, topK)) {
    const level = levelForScore(result.score);
    if (!level) continue;
    suggestions.push({
      code: result.code,
      description: result.description,
      level,
      approved: false,
    });
  }
  return suggestions;
}
