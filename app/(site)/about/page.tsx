import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";
import { PhotoPlaceholder } from "@/components/site/photo-placeholder";
import { StatsGrid } from "@/components/site/stats-grid";
import { FeatureCards } from "@/components/site/feature-cards";
import { CTASection } from "@/components/site/cta-section";
import { publicPageMetadata } from "@/lib/share-metadata";
import { practice, physicianTraining } from "@/lib/site";

export const metadata: Metadata = publicPageMetadata({
  title: "About",
  description: "The Alignment Clinic is an orthopedic spine practice led by Elvis Francois, MD.",
  canonical: "/about",
});

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
      <PageIntro
        kicker="Practice"
        title="A clinic built around a clear conversation."
        lede="The Alignment Clinic takes its name from two kinds of alignment: the structure of the spine, and a plan that fits the person who has to live with it."
      />

      {/* Stats grid */}
      <section className="mt-16">
        <StatsGrid
          stats={[
            { value: "99%", label: "Non-operative first consultations" },
            { value: "4", label: "Fellowship & residency institutions" },
            { value: "100%", label: "Plain-language explanations" },
            { value: "1", label: "Physician — you see the same person every visit" },
          ]}
        />
      </section>

      {/* Philosophy cards */}
      <section className="mt-20">
        <h2 className="kicker mx-auto max-w-6xl px-5 text-oxide-deep md:px-8">Philosophy</h2>
        <FeatureCards
          cards={[
            {
              icon: "🗣",
              title: "Start with the problem",
              description: "You describe what has changed, what you have already tried, and what you need to get back to. No assumption that surgery is the answer.",
            },
            {
              icon: "🔬",
              title: "Explain the findings",
              description: "Dr. Francois explains which findings matter and which tests, if any, would change the plan. Everything in ordinary language.",
            },
            {
              icon: "🤝",
              title: "Decide together",
              description: "Options are named clearly, including care that does not involve an operation. Surgery is one path among others.",
            },
            {
              icon: "📋",
              title: "A plan you can follow",
              description: "You leave with the next step written down: time, therapy, a test, or a procedure. No uncertainty about what happens next.",
            },
          ]}
          columns={2}
        />
      </section>

      {/* About the practice */}
      <section className="mt-20 mx-auto max-w-6xl px-5 md:px-8">
        <div className="grid gap-12 md:grid-cols-[1fr_16rem]">
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
              This practice does not publish another clinic's phone
              number or directions. To find a spine surgeon near you, contact your insurance plan or
              your primary care physician. This practice does not arrange telehealth visits.
            </p>
          </div>
          <PhotoPlaceholder className="hidden md:block md:sticky md:top-24" lockup="mark" />
        </div>
      </section>

      {/* Training milestones */}
      <section className="mt-20">
        <h2 className="kicker mx-auto max-w-6xl px-5 text-oxide-deep md:px-8">Training</h2>
        <div className="mx-auto mt-6 grid max-w-5xl gap-4 px-5 md:grid-cols-2 md:px-8">
          {physicianTraining.map((item) => (
            <div
              key={item.label}
              className="rise-in group rounded-2xl border border-line bg-card p-5 card-shadow motion-safe:transition-all motion-safe:duration-300 motion-safe:hover:-translate-y-0.5 motion-safe:hover:shadow-[0_16px_40px_-16px_rgb(7_30_54_/_0.3)]"
            >
              <span className="kicker text-oxide-deep">{item.label}</span>
              <p className="mt-2 text-base leading-relaxed text-ink">{item.value}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mt-20">
        <CTASection
          title="Have a question about the practice?"
          description="New patients are welcome. Send your name and a way to reach you."
          href="/contact"
          label="Request a call"
        />
      </section>
    </article>
  );
}
