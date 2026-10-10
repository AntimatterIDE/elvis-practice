import { z } from "zod";

const draftSchema = z.object({
  title: z.string().trim().min(8).max(140),
  summary: z.string().trim().min(40).max(400),
  seoTitle: z.string().trim().min(8).max(70),
  seoDescription: z.string().trim().min(40).max(180),
  body: z.string().trim().min(400).max(12000),
});

export type JournalDraftCopy = z.infer<typeof draftSchema>;

export function parseJournalDraft(text: string): JournalDraftCopy {
  const trimmed = text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "");
  const parsed = draftSchema.safeParse(JSON.parse(trimmed));
  if (!parsed.success) {
    throw new Error("The draft did not come back in the expected shape.");
  }
  return parsed.data;
}
