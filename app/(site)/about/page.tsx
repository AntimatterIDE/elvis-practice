import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";
import { PhotoPlaceholder } from "@/components/site/photo-placeholder";
import { publicPageMetadata } from "@/lib/share-metadata";
import { practice } from "@/lib/site";

export const metadata: Metadata = publicPageMetadata({
  title: "About",
  description: "The Alignment Clinic is an orthopedic spine practice led by Elvis Francois, MD.",
  canonical: "/about",
});

const credentials = [
  { school: "Meharry Medical College", degree: "Doctor of Medicine" },
  { school: "Mayo Clinic", degree: "Orthopedic Surgery Residency" },
  { school: "Harvard", degree: "Spine Surgery Fellowship" },
] as const;

const principles = [
  {
    title: "Physician-led care",
    body: "Elvis Francois, MD sees the problem with you, not through a script. Every visit is his: a history, an examination, and a plan explained in ordinary language.",
  },
  {
    title: "Plain-language medicine",
    body: "Findings and options are explained so you can understand them and actually use them. No jargon for its own sake.",
  },
  {
    title: "Surgery is not the default",
    body: "Many spine problems improve without an operation. An operation is one option among others, chosen when the symptoms and the imaging agree.",
  },
  {
    title: "Education, not diagnosis",
    body: "The condition and treatment notes on this site are general education. They prepare you for a conversation. They do not diagnose you, and they do not promise a result.",
  },
];

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
      <PageIntro
        kicker="Practice"
        title="A clinic built around a clear conversation."
        lede="The Alignment Clinic takes its name from two kinds of alignment: the structure of the spine, and a plan that fits the person who has to live with it."
      />

      {/* Physician photo + intro */}
      <div className="mt-14 grid gap-12 md:grid-cols-[1fr_16rem]">
        <div className="max-w-2xl space-y-6 text-lg leading-relaxed text-ink/80">
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
        </div>
        <PhotoPlaceholder className="row-span-2" />
      </div>

      {/* Training credentials */}
      <div className="mt-16">
        <h2 className="kicker text-oxide-deep">Training</h2>
        <div className="mt-4 grid gap-5 sm:grid-cols-3">
          {credentials.map((c, i) => (
            <div
              key={c.school}
              className="relative rounded-2xl border border-line bg-card p-6 shadow-[0_8px_24px_-16px_rgb(7_30_54_/_0.4)]"
            >
              <span className="absolute -top-3 -left-3 flex size-8 items-center justify-center rounded-full bg-oxide-deep text-xs font-bold text-paper">
                {i + 1}
              </span>
              <p className="font-display text-lg font-semibold text-ink">{c.school}</p>
              <p className="mt-2 text-sm text-muted">{c.degree}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Principles */}
      <div className="mt-16">
        <h2 className="kicker text-oxide-deep">How this practice works</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-2">
          {principles.map((p) => (
            <div
              key={p.title}
              className="rounded-2xl border border-line bg-card p-6 shadow-[0_8px_24px_-16px_rgb(7_30_54_/_0.4)]"
            >
              <h3 className="font-display text-lg font-semibold text-ink">{p.title}</h3>
              <p className="mt-2 leading-relaxed text-sm text-muted">{p.body}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="mt-16 rounded-2xl border border-line bg-mist px-8 py-8">
        <p className="text-sm leading-relaxed text-muted">
          This practice does not publish another clinic&rsquo;s phone number, hours, or address.
          The National Provider Identifier record for Dr. Francois, last updated August 31, 2021,
          shows 156 Foster Drive, Suite B, McDonough, Georgia. This website is not that office and
          does not answer its line. Contact through this site is for scheduling and other
          non-medical questions only.
        </p>
      </div>
    </article>
  );
}