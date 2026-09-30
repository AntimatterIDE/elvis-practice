import type { ClinicalDocument } from "@/lib/content/schema";
import type { Database } from "@/lib/supabase/database";

type ClinicalRow = Database["public"]["Tables"]["conditions"]["Row"];

export function clinicalRowToDocument(row: ClinicalRow, kind: ClinicalDocument["kind"]): ClinicalDocument {
  const sections = Array.isArray(row.sections) ? row.sections : [];
  const faqs = Array.isArray(row.faqs) ? row.faqs : [];
  return {
    kind,
    slug: row.slug,
    title: row.title,
    summary: row.summary,
    sections: sections.flatMap((section) => {
      if (!section || typeof section !== "object" || Array.isArray(section)) return [];
      const id = section.id;
      const heading = section.heading;
      const body = section.body;
      if (typeof id !== "string" || typeof heading !== "string" || typeof body !== "string") return [];
      return [{ id, heading, body }];
    }),
    faqs: faqs.flatMap((faq) => {
      if (!faq || typeof faq !== "object" || Array.isArray(faq)) return [];
      const question = faq.question;
      const answer = faq.answer;
      if (typeof question !== "string" || typeof answer !== "string") return [];
      return [{ question, answer }];
    }),
    relatedSlugs: row.related_slugs,
    offeringStatus: row.offering_status,
    reviewStatus: row.review_status,
    publishedAt: row.published_at,
    seoTitle: row.seo_title,
    seoDescription: row.seo_description,
  };
}
