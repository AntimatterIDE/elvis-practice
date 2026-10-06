import type { Metadata } from "next";
import { ContactForm } from "@/components/site/contact-form";
import { PageIntro } from "@/components/site/page-intro";
import { FeatureCards } from "@/components/site/feature-cards";
import { publicPageMetadata } from "@/lib/share-metadata";
import { practice } from "@/lib/site";

export const metadata: Metadata = publicPageMetadata({
  title: "Contact",
  description:
    "Request a call from The Alignment Clinic. The form is for scheduling questions only and does not accept medical information.",
  canonical: "/contact",
});

const facts = [
  { label: "Physician", value: practice.physicianName },
  { label: "Specialty", value: practice.specialty },
  { label: "New patients", value: "Welcome" },
  { label: "Appointments", value: "Request a call below" },
];

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
      <PageIntro
        kicker="Contact"
        title="Request a call."
        lede="New patients are welcome. Send your name and a way to reach you. This form is for scheduling and other non-medical questions."
      />

      {/* Practice info cards */}
      <section className="mt-10">
        <FeatureCards
          cards={[
            {
              icon: "\uD83E\uDEC0",
              title: practice.physicianName,
              description: practice.specialty,
            },
            {
              icon: "\uD83D\uDC4B",
              title: "New patients",
              description: "Always welcome. No referral needed.",
            },
            {
              icon: "\uD83D\uDCF1",
              title: "Appointments",
              description: "Request a call below. The office will reach out to schedule.",
            },
          ]}
          columns={3}
        />
      </section>

      {/* Form + details grid */}
      <section className="mt-16 mx-auto max-w-6xl px-5 md:px-8">
        <div className="grid gap-10 md:grid-cols-[1.2fr_1fr]">
          <div>
            <h2 className="kicker text-oxide-deep">Send a message</h2>
            <ContactForm />
          </div>
          <div>
            <h2 className="kicker text-oxide-deep">Practice information</h2>
            <dl className="mt-4 grid gap-4">
              {facts.map((fact) => (
                <div key={fact.label} className="rounded-2xl border border-line bg-card p-4">
                  <dt className="kicker text-oxide-deep text-xs">{fact.label}</dt>
                  <dd className="mt-1 text-base font-medium text-ink">{fact.value}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>
      </section>
    </article>
  );
}