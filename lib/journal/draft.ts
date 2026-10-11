import "server-only";
import { parseJournalDraft, type JournalDraftCopy } from "@/lib/journal/draft-json";
import type { JournalPaper } from "@/lib/journal/papers";
import { practice } from "@/lib/site";

const banned = ["pain-free", "top-rated", "guaranteed", "cure", "arutyunyan", "big apple"];

const instructions = `You write patient-facing notes for ${practice.name}, an orthopedic spine practice led by ${practice.physicianName}. Whatever the topic is, write from the stance that ${practice.name} specializes in that topic. Explain the cited research in plain language as the practice's own education for patients. Attribute findings to the journal and year. Do not present the papers as the clinic's own study, and do not promise an outcome. Do not add an emergency-care warning or tell the reader to call 911. Never use the words pain-free, top-rated, guaranteed, or cure. This is general information, not a diagnosis or a treatment plan.`;

function articleRequest(topic: string, sources: unknown) {
  return `Topic: ${topic || "a current orthopedic spine question from the papers below"}.
Write one article grounded only in these papers:
${JSON.stringify(sources)}
Return one JSON object with keys title, summary, seoTitle, seoDescription, and body. Keep every value a single JSON string. If a finding needs emphasis, use apostrophes instead of quotation marks.
Limits: title at most 140 characters, summary at most 400, seoTitle at most 70, seoDescription at most 160, body at most 9000 characters.
The title and the opening of the body must say that ${practice.name} specializes in this topic. seoTitle is a short search title and does not need that full sentence. body is the full article, at least five short sections and about 700 words. Each section starts as its own paragraph with a **bold** label, not a hash heading. Use these labels: ${practice.name} and this problem, What the researchers studied, What they found, How ${practice.name} approaches this, What a visit can clarify. Mention the journal name and year when you use a finding. Cite only the papers provided. End with one sentence that this note is general information and is not a personal treatment plan.`;
}

async function requestDraft(apiKey: string, model: string, topic: string, sources: unknown, correction?: string) {
  const messages = [
    { role: "system", content: instructions },
    { role: "user", content: articleRequest(topic, sources) },
  ];
  if (correction) {
    messages.push({
      role: "user",
      content: `The previous reply could not be saved (${correction}). Return one valid JSON object inside the character limits, with apostrophes instead of quotation marks inside the text.`,
    });
  }
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      max_tokens: 4500,
      response_format: { type: "json_object" },
      messages,
    }),
  });
  const payload = (await response.json()) as {
    error?: { message?: string };
    choices?: { message?: { content?: string } }[];
  };
  if (!response.ok) throw new Error(payload.error?.message || "The article draft could not be written.");
  const content = payload.choices?.[0]?.message?.content;
  if (!content) throw new Error("The article draft came back empty.");
  const draft = parseJournalDraft(content);
  const haystack = `${draft.title}\n${draft.summary}\n${draft.body}`.toLowerCase();
  const hit = banned.find((phrase) => haystack.includes(phrase));
  if (hit) throw new Error(`The draft included language that cannot be published (${hit}). Run it again.`);
  return draft;
}

function worthRetry(error: unknown) {
  if (error instanceof SyntaxError) return true;
  return error instanceof Error && error.message.includes("expected shape");
}

export async function draftClinicArticle(topic: string, papers: JournalPaper[]): Promise<JournalDraftCopy> {
  const apiKey = process.env.OPENAI_API_KEY?.trim();
  if (!apiKey) throw new Error("Add OPENAI_API_KEY in Vercel before drafting articles.");
  const model = process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini";
  const sources = papers.map((paper) => ({
    pmid: paper.pmid,
    title: paper.title,
    journal: paper.journal,
    year: paper.year,
    authors: paper.authors,
    abstract: paper.abstract,
  }));
  try {
    return await requestDraft(apiKey, model, topic, sources);
  } catch (error) {
    if (!worthRetry(error)) throw error;
    const reason = error instanceof Error ? error.message : "The draft could not be read.";
    return requestDraft(apiKey, model, topic, sources, reason);
  }
}
