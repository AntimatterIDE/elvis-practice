import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";
import { PhotoPlaceholder } from "@/components/site/photo-placeholder";
import { practice } from "@/lib/site";

export const metadata: Metadata = {
  title: "About",
  description:
    "The Alignment Clinic is an orthopedic spine practice led by Elvis Francois, MD.",
  alternates: { canonical: "/about" },
};

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8">
      <PageIntro
        kicker="Practice"
        title="A clinic built around a clear conversation."
        lede="The Alignment Clinic takes its name from two kinds of alignment: the structure of the spine, and a plan that fits the person who has to live with it."
      />
      <div className="mt-12 grid gap-12 md:grid-cols-[1fr_16rem]">
        <div className="max-w-2xl space-y-6 text-lg leading-relaxed text-muted">
          <p>
            {practice.physicianName} is the physician. He is an orthopedic spine surgeon who trained
            at Meharry Medical College, the Mayo Clinic, and Harvard. The visit is his: a history,
            an examination, and a plan explained in ordinary language.
          </p>
          <p>
            People come for neck pain, low back pain, pain that travels into an arm or a leg, and
            pain that remains after an earlier spine operation. Many of those problems improve
            without surgery. An operation is one option among others, chosen when the symptoms and
            the imaging agree.
          </p>
          <p>
            The condition and treatment notes on this site are general education. They prepare you
            for a conversation. They do not diagnose you, and they do not promise a result. Reading
            them does not create a physician-patient relationship.
          </p>
          <p>
            This practice does not publish another clinic’s phone number, street address, or office
            hours. To ask for a call, use the contact page, and leave medical details off the form.
          </p>
        </div>
        <PhotoPlaceholder label={practice.name} caption={practice.specialty} />
      </div>
    </article>
  );
}
