import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageIntro } from "@/components/site/page-intro";
import { faqs } from "@/lib/content/faqs";

export const metadata: Metadata = {
  title: "Questions",
  description: "Practical questions about The Alignment Clinic, emergencies, and what this website will not collect.",
  alternates: { canonical: "/questions" },
};

export default function QuestionsPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <PageIntro
        kicker="Questions"
        title="Answers we can stand behind."
        lede="Practical answers about appointments, emergencies, and what to bring. They are not a diagnosis and they are not an insurance quote."
      />
      <Accordion type="single" collapsible className="mt-10 max-w-3xl">
        {faqs.map((faq) => (
          <AccordionItem key={faq.question} value={faq.question}>
            <AccordionTrigger>{faq.question}</AccordionTrigger>
            <AccordionContent>{faq.answer}</AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </article>
  );
}
