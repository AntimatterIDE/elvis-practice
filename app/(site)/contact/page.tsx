import type { Metadata } from "next";
import { ContactForm } from "@/components/site/contact-form";
import { PageIntro } from "@/components/site/page-intro";

export const metadata: Metadata = {
  title: "Contact",
  description:
    "Contact The Alignment Clinic. Address, phone, and hours are unpublished until the practice confirms them.",
  alternates: { canonical: "/contact" },
};

const facts = [
  { label: "Address", value: "Pending confirmation" },
  { label: "Phone", value: "Pending confirmation" },
  { label: "Hours", value: "Pending confirmation" },
  { label: "Booking", value: "No online scheduler is connected" },
];

export default function ContactPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <PageIntro
        kicker="Contact"
        title="Call or write when the practice publishes a channel."
        lede="Until then, this page is honest about what is missing. Messages are not a way to send medical information."
      />
      <dl className="mt-10 grid gap-6 border-y border-line py-8 sm:grid-cols-2 lg:grid-cols-4">
        {facts.map((fact) => (
          <div key={fact.label}>
            <dt className="text-xs uppercase tracking-[0.18em] text-oxide">{fact.label}</dt>
            <dd className="mt-2 text-lg">{fact.value}</dd>
          </div>
        ))}
      </dl>
      <div className="mt-12 max-w-3xl">
        <h2 className="font-display text-3xl">Administrative inquiry</h2>
        <div className="mt-6">
          <ContactForm />
        </div>
      </div>
    </article>
  );
}
