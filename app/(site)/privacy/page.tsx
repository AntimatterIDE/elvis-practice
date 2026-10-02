import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";
import { ReviewBanner } from "@/components/site/review-banner";

export const metadata: Metadata = {
  title: "Privacy",
  description: "Draft privacy notice for The Alignment Clinic website. Awaiting attorney review.",
  alternates: { canonical: "/privacy" },
  robots: { index: false, follow: false },
};

export default function PrivacyPage() {
  return (
    <article className="mx-auto max-w-3xl px-5 py-16 md:px-8 md:py-20">
      <PageIntro
        kicker="Privacy"
        title="What this website handles."
        lede="This is a draft for attorney review. It is not a finished privacy policy."
      />
      <div className="mt-8">
        <ReviewBanner>
          Draft for attorney review. Do not treat this page as legal advice or as a final notice.
        </ReviewBanner>
      </div>
      <div className="mt-10 space-y-6 text-lg leading-relaxed text-muted">
        <p>
          The public site is informational. The contact form asks for a name, an email address or
          phone number, a reason for writing, and an optional short note. It tells you not to
          include medical information.
        </p>
        <p>
          Messages are not stored in the practice database. If an inbox has not been connected, the
          message is not delivered either. Do not use the form for symptoms, records, images, or
          insurance numbers.
        </p>
        <p>
          The site does not run analytics in this version. It does not sell personal information.
          Admin accounts are invitation-only and are separate from patient care. A patient intake
          link stores the answers in the practice records and opens a chart. A patient login shows
          only that patient's profile and visits.
        </p>
        <p>
          Questions about this notice go through the contact page. Send a name and a way to reach
          you, and leave medical information off the form.
        </p>
      </div>
    </article>
  );
}
