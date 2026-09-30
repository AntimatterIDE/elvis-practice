import { clinicalDocumentSchema, type ClinicalDocument } from "@/lib/content/schema";

export const retiredSlugs = new Set([
  "lowe-back-pain",
  "failed-back-sugery-syndrome",
  "failed-back-surgery-syndrome",
  "herniated-disc-lower-back",
  "robotic-spine-surgery",
  "acute-illness-treatment",
  "general-consultation",
]);

const bannedPhrases = [
  "arutyunyan",
  "big apple",
  "medipark",
  "zocdoc",
  "14 wall",
  "646-216-6222",
  "6462166222",
  "emma johnson",
  "james peterson",
  "maria gonzalez",
  "dr. kim",
  "dr. clark",
  "pain-free",
  "top-rated",
  "guaranteed",
];

export function documentText(document: ClinicalDocument) {
  return [
    document.title,
    document.summary,
    document.seoTitle,
    document.seoDescription,
    ...document.sections.flatMap((section) => [section.heading, section.body]),
    ...document.faqs.flatMap((faq) => [faq.question, faq.answer]),
  ]
    .join("\n")
    .toLowerCase();
}

export function findBannedPhrases(document: ClinicalDocument) {
  const text = documentText(document).replace(/\b(?:not|never|no|cannot|can't)\s+guaranteed\b/g, "");
  return bannedPhrases.filter((phrase) => text.includes(phrase));
}

export function canPublish(document: ClinicalDocument) {
  const parsed = clinicalDocumentSchema.safeParse(document);
  const reasons: string[] = [];

  if (!parsed.success) {
    reasons.push("The page does not match the content schema.");
  }
  if (retiredSlugs.has(document.slug)) {
    reasons.push("This slug belongs to the old template and cannot be published.");
  }
  if (document.offeringStatus !== "offered") {
    reasons.push("The practice has not confirmed that this is offered.");
  }
  if (document.reviewStatus !== "approved") {
    reasons.push("Clinical review is not approved.");
  }
  if (!document.publishedAt) {
    reasons.push("A publication time is required.");
  }

  const banned = findBannedPhrases(document);
  if (banned.length > 0) {
    reasons.push(`Copy includes material that cannot be published: ${banned.join(", ")}.`);
  }

  return { ok: reasons.length === 0, reasons };
}

export function isPubliclyVisible(document: ClinicalDocument, now = new Date()) {
  if (!document.publishedAt) return false;
  const publishedAt = new Date(document.publishedAt);
  if (Number.isNaN(publishedAt.getTime()) || publishedAt > now) return false;
  return canPublish(document).ok;
}
