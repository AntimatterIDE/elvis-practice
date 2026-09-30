import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";
import { PhotoPlaceholder } from "@/components/site/photo-placeholder";
import { practice } from "@/lib/site";

export const metadata: Metadata = {
  title: practice.physicianName,
  description:
    "Elvis Francois, MD, is the physician at The Alignment Clinic. Credentials will be published only after they are confirmed.",
  alternates: { canonical: "/dr-elvis-francois" },
};

export default function PhysicianPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <PageIntro
        kicker="Physician"
        title={practice.physicianName}
        lede="The physician at The Alignment Clinic. This profile will grow as biography, training, and philosophy are approved for this site."
      />
      <div className="mt-12 grid gap-8 md:grid-cols-[16rem_1fr_16rem] md:items-start">
        <PhotoPlaceholder label="Portrait pending" className="min-h-80" />
        <div className="max-w-xl space-y-6 text-lg leading-relaxed text-muted">
          <p>
            Dr. Francois leads {practice.name}. Patients should expect a visit that starts with the
            story of the problem, continues with an examination, and ends with options explained in
            plain language.
          </p>
          <p>
            Surgery is discussed when it is one of the reasonable paths, not as a default. Care that
            does not involve an operation is part of the same conversation.
          </p>
          <p>
            A longer biography, including training and any public work outside the clinic, will be
            added only with wording the practice approves. This page does not repeat claims from
            other websites.
          </p>
        </div>
        <aside className="rounded-2xl border border-line bg-mist p-5">
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-oxide">Credentials</p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            Training, certification, and hospital appointments are hidden until the practice confirms
            the exact wording. Empty lines are not filled with guesses.
          </p>
        </aside>
      </div>
    </article>
  );
}
