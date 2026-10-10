import "server-only";
import { parseJournalDraft, type JournalDraftCopy } from "@/lib/journal/draft-json";
import type { JournalPaper } from "@/lib/journal/papers";
import { practice } from "@/lib/site";

const banned = ["pain-free", "top-rated", "guaranteed", "cure", "arutyunyan", "big apple"];

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
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      authorization: `Bearer ${apiKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.4,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: `You write patient-facing notes for ${practice.name}, an orthopedic spine practice led by ${practice.physicianName}. Explain published research in plain language. Attribute findings to the cited papers. Do not present the papers as the clinic's own study, do not promise an outcome, and do not say a procedure is offered here. Never use the words pain-free, top-rated, guaranteed, or cure. This is general information, not a diagnosis or a treatment plan.`,
        },
        {
          role: "user",
          content: `Topic: ${topic || "a current orthopedic spine question from the papers below"}.
Write one article grounded only in these papers:
${JSON.stringify(sources)}
Return JSON with keys title, summary, seoTitle, seoDescription, and body.
body is markdown. Start each section with a **bold** label, not a hash heading. Mention the journal name and year when you use a finding. End the body with one sentence that this note is general information and is not a personal treatment plan.`,
        },
      ],
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
