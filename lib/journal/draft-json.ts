import { z } from "zod";

const draftSchema = z.object({
  title: z.string().trim().min(8).max(140),
  summary: z.string().trim().min(40).max(400),
  seoTitle: z.string().trim().min(8).max(70),
  seoDescription: z.string().trim().min(40).max(180),
  body: z.string().trim().min(400).max(12000),
});

export type JournalDraftCopy = z.infer<typeof draftSchema>;

function clipLine(value: string, max: number) {
  const clean = value.trim().replace(/\s+/g, " ");
  if (clean.length <= max) return clean;
  const cut = clean.slice(0, max);
  const space = cut.lastIndexOf(" ");
  return (space >= Math.floor(max * 0.6) ? cut.slice(0, space) : cut).trim();
}

function clipBody(value: string) {
  const clean = value.trim();
  if (clean.length <= 12000) return clean;
  const cut = clean.slice(0, 12000);
  const paragraph = cut.lastIndexOf("\n\n");
  return (paragraph >= 400 ? cut.slice(0, paragraph) : cut).trim();
}

function loosen(raw: unknown) {
  if (!raw || typeof raw !== "object") return raw;
  const record = raw as Record<string, unknown>;
  return {
    title: typeof record.title === "string" ? clipLine(record.title, 140) : record.title,
    summary: typeof record.summary === "string" ? clipLine(record.summary, 400) : record.summary,
    seoTitle: typeof record.seoTitle === "string" ? clipLine(record.seoTitle, 70) : record.seoTitle,
    seoDescription: typeof record.seoDescription === "string" ? clipLine(record.seoDescription, 180) : record.seoDescription,
    body: typeof record.body === "string" ? clipBody(record.body) : record.body,
  };
}

function extractJson(text: string) {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const start = trimmed.indexOf("{");
  const end = trimmed.lastIndexOf("}");
  const slice = start >= 0 && end > start ? trimmed.slice(start, end + 1) : trimmed;
  return slice.replace(/[\u201c\u201d]/g, '"').replace(/[\u2018\u2019]/g, "'");
}

function repairJson(input: string) {
  let out = "";
  let inString = false;
  let escaped = false;
  for (let index = 0; index < input.length; index += 1) {
    const character = input[index];
    if (!inString) {
      out += character;
      if (character === '"') inString = true;
      continue;
    }
    if (escaped) {
      out += character;
      escaped = false;
      continue;
    }
    if (character === "\\") {
      out += character;
      escaped = true;
      continue;
    }
    if (character === '"') {
      const rest = input.slice(index + 1).trimStart();
      if (rest.length === 0 || /^[,}\]:]/.test(rest)) {
        out += character;
        inString = false;
      } else {
        out += '\\"';
      }
      continue;
    }
    if (character === "\n" || character === "\r") {
      out += "\\n";
      continue;
    }
    out += character;
  }
  return out;
}

function readJson(text: string) {
  const extracted = extractJson(text);
  try {
    return JSON.parse(extracted) as unknown;
  } catch {
    return JSON.parse(repairJson(extracted)) as unknown;
  }
}

export function parseJournalDraft(text: string): JournalDraftCopy {
  const parsed = draftSchema.safeParse(loosen(readJson(text)));
  if (!parsed.success) {
    throw new Error("The draft did not come back in the expected shape.");
  }
  return parsed.data;
}
