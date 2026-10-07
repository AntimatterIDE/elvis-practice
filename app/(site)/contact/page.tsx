import type { Metadata } from "next";
import { ContactForm } from "@/components/site/contact-form";
import { PageIntro } from "@/components/site/page-intro";
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
      <dl className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label} className="rounded-2xl border border-line bg-card p-5 card-shadow">
            <dt className="kicker text-royal">{fact.label}</dt>
            <dd className="mt-2 text-lg font-medium">{fact.value}</dd>
          </div>
        ))}
      </dl>
      <p className="mt-8 max-w-3xl text-base leading-relaxed text-muted">
        A street address and office hours are not listed, because the public listings under
        Dr. Francois’s name belong to other practices. His National Provider Identifier record,
        last updated August 31, 2021, shows 156 Foster Drive, Suite B, McDonough, Georgia. Later
        profiles place him in Tulsa and in New York. None of those offices is this website’s
        appointment line.
      </p>
      <div className="mt-12 max-w-3xl rounded-[1.5rem] border border-line bg-card p-6 card-shadow md:p-8">
        <h2 className="font-display text-3xl font-semibold tracking-tight">Ask the practice to call</h2>
        <div className="mt-6">
          <ContactForm />
        </div>
      </div>
    </article>
  );
}
