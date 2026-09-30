import { createClient } from "@supabase/supabase-js";
import { allClinicalDocuments } from "../lib/content/index.ts";
import { faqs } from "../lib/content/faqs.ts";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error("Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY before seeding.");
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

for (const document of allClinicalDocuments()) {
  const table = document.kind === "condition" ? "conditions" : "treatments";
  const { error } = await supabase.from(table).upsert(
    {
      slug: document.slug,
      title: document.title,
      summary: document.summary,
      sections: document.sections,
      faqs: document.faqs,
      related_slugs: document.relatedSlugs,
      offering_status: document.offeringStatus,
      review_status: document.reviewStatus,
      seo_title: document.seoTitle,
      seo_description: document.seoDescription,
      published_at: document.publishedAt,
    },
    { onConflict: "slug" },
  );
  if (error) throw error;
  console.log(`seeded ${table}/${document.slug}`);
}

for (const [index, faq] of faqs.entries()) {
  const { error } = await supabase.from("faqs").insert({
    question: faq.question,
    answer: faq.answer,
    sort_order: index,
    review_status: "draft",
    published_at: null,
  });
  if (error) throw error;
}

console.log("Seed finished. Rows are drafts and are not public.");
