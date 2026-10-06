import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageIntro } from "@/components/site/page-intro";
import { faqs } from "@/lib/content/faqs";
import { publicPageMetadata } from "@/lib/share-metadata";

export const metadata: Metadata = publicPageMetadata({
  title: "Questions",
  description: "Practical questions about The Alignment Clinic, emergencies, and what this website will not collect.",
  canonical: "/questions",
});

const categories = [
  {
    label: "Emergencies",
    slug: "emergencies",
    faqs: faqs.filter((f) => f.category === "emergency"),
  },
  {
    label: "Practice",
    slug: "practice",
    faqs: faqs.filter((f) => f.category === "practice"),
  },
  {
    label: "Website",
    slug: "website",
    faqs: faqs.filter((f) => f.category === "website"),
  },
];

export default function QuestionsPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
      <PageIntro
        kicker="Questions"
        title="Practical answers about the practice."
        lede="Emergencies, appointments, and what this website will and will not do."
      />
      <div className="mt-14 grid gap-8">
        {categories.map((category) =>
          category.faqs.length > 0 ? (
            <section key={category.slug}>
              <h2 className="kicker text-oxide-deep">{category.label}</h2>
              <Accordion className="mt-4 grid gap-3" type="multiple">
                {category.faqs.map((faq, index) => (
                  <AccordionItem
                    key={faq.question}
                    value={`${category.slug}-${index}`}
                    className="rounded-2xl border border-line bg-card shadow-[0_2px_8px_-4px_rgb(7_30_54_/_0.12)]"
                  >
                    <AccordionTrigger>{faq.question}</AccordionTrigger>
                    <AccordionContent className="px-6 py-4 text-muted">
                      {faq.answer}
                    </AccordionContent>
                  </AccordionItem>
                ))}
              </Accordion>
            </section>
          ) : null,
        )}
      </div>
    </article>
  );
}