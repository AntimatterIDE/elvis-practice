import type { Metadata } from "next";
import { AboutValues } from "@/components/site/about-values";
import { SiteVault } from "@/components/site/hexagonal-vault";
import { PhotoPlaceholder } from "@/components/site/photo-placeholder";
import { Card } from "@/components/ui/card";
import { publicPageMetadata } from "@/lib/share-metadata";
import { practice } from "@/lib/site";

export const metadata: Metadata = publicPageMetadata({
  title: "About",
  description: "The Alignment Clinic is an orthopedic spine practice led by Elvis Francois, MD.",
  canonical: "/about",
});

const notes = [
  `${practice.physicianName} is the physician. He is an orthopedic spine surgeon who trained at Meharry Medical College, the Mayo Clinic, and Harvard. The visit is his: a history, an examination, and a plan explained in ordinary language.`,
  "People come for neck pain, low back pain, pain that travels into an arm or a leg, and pain that remains after an earlier spine operation. Many of those problems improve without surgery. An operation is one option among others, chosen when the symptoms and the imaging agree.",
  "The condition and treatment notes on this site are general education. They prepare you for a conversation. They do not diagnose you, and they do not promise a result. Reading them does not create a physician-patient relationship.",
];

export default function AboutPage() {
  return (
    <SiteVault>
      <AboutValues />
      <article className="mx-auto grid max-w-6xl gap-4 px-5 py-14 md:px-8 md:py-20 lg:grid-cols-[minmax(0,1fr)_18rem]">
        <div className="grid gap-4">
          {notes.map((note) => (
            <Card key={note.slice(0, 32)}>
              <p className="text-lg leading-relaxed text-muted">{note}</p>
            </Card>
          ))}
        </div>
        <div className="grid content-start gap-4">
          <PhotoPlaceholder />
          <Card>
            <p className="kicker text-oxide-deep">Office</p>
            <p className="mt-3 font-display text-2xl font-medium leading-tight">{practice.addressLine}</p>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Call {practice.phone} or write {practice.email}. To ask for a visit, use the contact page, and leave
              medical details off the form.
            </p>
          </Card>
        </div>
      </article>
    </SiteVault>
  );
}
