import type { Metadata } from "next";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { PageIntro } from "@/components/site/page-intro";
import { FeatureCards } from "@/components/site/feature-cards";
import { publicPageMetadata } from "@/lib/share-metadata";
import { faqs } from "@/lib/content/faqs";

export const metadata: Metadata = publicPageMetadata({
  title: "Questions",
  description: "Practical questions about The Alignment Clinic, emergencies, and what this website will not collect.",
  canonical: "/questions",
});

export default function QuestionsPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
      <PageIntro
        kicker="Questions"
        title="Practical questions answered."
        lede="Common questions about visits, emergencies, and what this website does and does not do."
      />

      {/* FAQ accordion */}
      <section className="mt-16 mx-auto max-w-4xl px-5 md:px-8">
        <h2 className="kicker text-oxide-deep">Frequently asked questions</h2>
        <Accordion className="mt-6" type="multiple">
          {faqs.map((faq, i) => (
            <AccordionItem key={faq.question} value={`faq-${i}`}>
              <AccordionTrigger>{faq.question}</AccordionTrigger>
              <AccordionContent>
                <div className="prose-clinical max-w-3xl text-base leading-relaxed text-muted">
                  {faq.answer}
                </div>
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </section>

      {/* Quick info cards */}
      <section className="mt-20">
        <h2 className="kicker mx-auto max-w-6xl px-5 text-oxide-deep md:px-8">Quick answers</h2>
        <FeatureCards
          cards={[
            {
              icon: "\uD83D\uDE91",
              title: "This is not for emergencies",
              description: "If you have sudden weakness, trouble walking, loss of bowel or bladder control, fever with severe back or neck pain, or a recent serious injury, call 911 or go to the nearest emergency department.",
            },
            {
              icon: "\uD83D\uDD12",
              title: "Your information stays private",
              description: "This website does not collect medical information. The contact form is for scheduling questions only and refuses symptoms, imaging, and insurance numbers.",
            },
            {
              icon: "\uD83D\uDCDE",
              title: "New patients are welcome",
              description: "You do not need a referral. Request a call from the contact page and the office will reach out to schedule a visit.",
            },
            {
              icon: "\uD83D\uDCB5",
              title: "Insurance & payment",
              description: "Contact the office about accepted insurance plans and payment options. The practice does not provide cost estimates through this website.",
            },
          ]}
          columns={2}
        />
      </section>
    </article>
  );
}