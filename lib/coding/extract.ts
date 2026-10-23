import {
  keepQuotedFacts,
  parseCodingFacts,
  type CodingFacts,
  type FactWarning,
} from "@/lib/coding/facts";
import { readServerEnv } from "@/lib/env";

const extractModel = "gpt-5-mini-2025-08-07";

const extractInstructions = `You extract clinical facts from a spine clinic note for medical coding.
Return JSON only. Never invent CPT or ICD-10 codes. Never put a code number in any field.
Every fact must include a short quote copied verbatim from the note (a contiguous substring). Prefer 3–12 words from SUBJECTIVE/OBJECTIVE/ASSESSMENT/PLAN. Do not paraphrase.

visit: set to null for operative reports and procedure-only notes (injection/block/RFA/kyphoplasty/blood patch) where OBJECTIVE documents a Procedure performed today and there is no separate billed office visit. Do NOT invent an E/M visit for those notes.
visit.kind rules when visit is present:
- office_new: first visit / new patient language.
- office_established: return / follow-up patient (not routine surgical global).
- consult: ONLY when another clinician requested a formal consultation (e.g. “consulted at request of”). “Recommend surgical consultation” in PLAN is NOT consult — use office_new/office_established.
- post_op_global: ONLY routine postoperative follow-up inside a surgical global with no unrelated problem. NEVER use for the operative note itself. NEVER for fracture/injury management or new complaints.
- telehealth_*: only when the note documents telehealth/video/phone visit.
visit.complexity: straightforward | low | moderate | high from MDM that day.

procedures[].name MUST be one of: transforaminal_esi, interlaminar_esi, medial_branch_block, facet_rfa, si_joint_injection, trigger_point, epidural_blood_patch, microdiscectomy, acdf, tlif, plif, llif, laminectomy_facetectomy, kyphoplasty, cervical_disc_arthroplasty, posterior_cervical_fusion, posterior_instrumentation, anterior_instrumentation, interbody_cage, scs_percutaneous, hardware_removal_posterior, fusion_exploration, deep_wound_i_and_d, si_joint_fusion, scoliosis_radiographs.
procedures[].performed is true only when done today (Procedure: / performed / injected / implanted). False for planned/recommended/scheduled.
levels use hyphen forms like L5-S1, C5-C6, T12. side is left|right|bilateral|none.

diagnoses[].condition MUST be snake_case from: disc_herniation, stenosis, radiculopathy, spondylolisthesis, spondylosis, spondylotic_myelopathy, myelopathy, low_back_pain, cervicalgia, thoracic_pain, muscle_spasm, scoliosis, adolescent_idiopathic_scoliosis, postlaminectomy_syndrome, aftercare, fusion_status, burst_fracture, dens_fracture, osteoporotic_fracture, pathologic_fracture_neoplasm, cauda_equina_syndrome, central_cord_syndrome, discitis, epidural_abscess, surgical_site_infection, implant_infection, hardware_breakdown, hardware_pain, pseudarthrosis, sacroiliitis, si_joint_dysfunction, sciatica, ankylosing_spondylitis, degenerative_disc_disease, opll, myofascial_pain, coccydynia, cervical_sprain, lumbar_strain, post_dural_puncture_headache, bone_metastasis, dural_tear, aftercare_explant.
region: cervical|thoracic|lumbar|lumbosacral|sacroiliac when known.
with[] may include radiculopathy, myelopathy, neurogenic_claudication, initial, subsequent.
diagnoses[].status: current|history|ruled_out|negated|suspected.`

const factsSchema = {
  type: "object",
  additionalProperties: false,
  properties: {
    visit: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            kind: {
              type: "string",
              enum: [
                "office_new",
                "office_established",
                "consult",
                "post_op_global",
                "telehealth_new",
                "telehealth_established",
              ],
            },
            complexity: { type: "string", enum: ["straightforward", "low", "moderate", "high"] },
            totalMinutes: { anyOf: [{ type: "number" }, { type: "null" }] },
            decisionForSurgery: { type: "boolean" },
            unrelatedToGlobalSurgery: { type: "boolean" },
            significantSeparateProblem: { type: "boolean" },
            quote: { type: "string" },
          },
          required: [
            "kind",
            "complexity",
            "totalMinutes",
            "decisionForSurgery",
            "unrelatedToGlobalSurgery",
            "significantSeparateProblem",
            "quote",
          ],
        },
      ],
    },
    procedures: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          name: { type: "string" },
          levels: { type: "array", items: { type: "string" } },
          side: { anyOf: [{ type: "string", enum: ["left", "right", "bilateral", "none"] }, { type: "null" }] },
          performed: { type: "boolean" },
          quote: { type: "string" },
        },
        required: ["name", "levels", "side", "performed", "quote"],
      },
    },
    diagnoses: {
      type: "array",
      items: {
        type: "object",
        additionalProperties: false,
        properties: {
          condition: { type: "string" },
          region: { anyOf: [{ type: "string" }, { type: "null" }] },
          levels: { type: "array", items: { type: "string" } },
          side: { anyOf: [{ type: "string", enum: ["left", "right", "bilateral", "none"] }, { type: "null" }] },
          with: { type: "array", items: { type: "string" } },
          status: { type: "string", enum: ["current", "history", "ruled_out", "negated", "suspected"] },
          quote: { type: "string" },
        },
        required: ["condition", "region", "levels", "side", "with", "status", "quote"],
      },
    },
    injury: {
      anyOf: [
        { type: "null" },
        {
          type: "object",
          additionalProperties: false,
          properties: {
            workRelated: { type: "boolean" },
            autoAccident: { type: "boolean" },
            date: { anyOf: [{ type: "string" }, { type: "null" }] },
            cause: { anyOf: [{ type: "string" }, { type: "null" }] },
            quote: { anyOf: [{ type: "string" }, { type: "null" }] },
          },
          required: ["workRelated", "autoAccident", "date", "cause", "quote"],
        },
      ],
    },
  },
  required: ["visit", "procedures", "diagnoses", "injury"],
} as const;

type ResponsePayload = {
  output_text?: string;
  output?: { content?: { text?: string; type?: string }[] }[];
  error?: { message?: string };
};

function apiKey() {
  const key = readServerEnv().OPENAI_API_KEY;
  if (!key) throw new Error("OpenAI is not configured.");
  return key;
}

function responseText(payload: ResponsePayload) {
  if (payload.output_text?.trim()) return payload.output_text;
  const parts: string[] = [];
  for (const item of payload.output ?? []) {
    for (const block of item.content ?? []) {
      if (block.text) parts.push(block.text);
    }
  }
  return parts.join("\n");
}

async function callExtract(note: string) {
  const response = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey()}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: extractModel,
      store: false,
      max_output_tokens: 2500,
      reasoning: { effort: "low" },
      text: {
        format: {
          type: "json_schema",
          name: "spine_coding_facts",
          strict: true,
          schema: factsSchema,
        },
      },
      input: [
        { role: "system", content: extractInstructions },
        { role: "user", content: note },
      ],
    }),
    signal: AbortSignal.timeout(120_000),
  });
  const payload = (await response.json()) as ResponsePayload;
  if (!response.ok) {
    throw new Error(payload.error?.message?.slice(0, 500) || "Fact extraction failed.");
  }
  const text = responseText(payload).trim();
  if (!text) throw new Error("Fact extraction returned empty output.");
  return parseCodingFacts(JSON.parse(text) as unknown);
}

export type ExtractResult = {
  facts: CodingFacts;
  warnings: FactWarning[];
};

/** Extract facts + quotes from a note. Retries once. Drops facts whose quote is not in the note. */
export async function extractCodingFacts(note: string): Promise<ExtractResult> {
  if (!note.trim()) {
    return {
      facts: { visit: null, procedures: [], diagnoses: [], injury: null },
      warnings: [{ kind: "note", message: "The note is empty — nothing to extract." }],
    };
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      const raw = await callExtract(note);
      return keepQuotedFacts(note, raw);
    } catch (error) {
      lastError = error instanceof Error ? error : new Error("Fact extraction failed.");
    }
  }
  return {
    facts: { visit: null, procedures: [], diagnoses: [], injury: null },
    warnings: [{ kind: "extract", message: lastError?.message ?? "Fact extraction failed." }],
  };
}
