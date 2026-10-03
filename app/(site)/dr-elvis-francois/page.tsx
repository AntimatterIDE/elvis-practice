import type { Metadata } from "next";
import { PageIntro } from "@/components/site/page-intro";
import { PhotoPlaceholder } from "@/components/site/photo-placeholder";
import { publicPageMetadata } from "@/lib/share-metadata";
import { clinicalFocus, physicianTraining, practice } from "@/lib/site";

export const metadata: Metadata = publicPageMetadata({
  title: practice.physicianName,
  description:
    "Elvis Francois, MD, is an orthopedic spine surgeon. He trained at Meharry Medical College, the Mayo Clinic, and Harvard.",
  canonical: "/dr-elvis-francois",
});

export default function PhysicianPage() {
  return (
    <article className="mx-auto max-w-6xl px-5 py-16 md:px-8 md:py-20">
      <PageIntro
        kicker="Physician"
        title={practice.physicianName}
        lede="Orthopedic spine surgeon. The physician of The Alignment Clinic."
      />
      <div className="mt-12 grid gap-8 lg:grid-cols-[16rem_1fr_18rem] lg:items-start">
        <PhotoPlaceholder lockup="physician" />
        <div className="max-w-xl space-y-6 text-lg leading-relaxed text-muted">
          <p>
            Dr. Francois is an orthopedic spine surgeon. He completed a spine surgery fellowship at
            Harvard Medical School’s Beth Israel Deaconess Medical Center after an orthopedic surgery
            residency at the Mayo Clinic in Rochester, Minnesota. He earned his medical degree at
            Meharry Medical College in Nashville and a bachelor’s degree in neuroscience and biology
            at Oberlin College.
          </p>
          <p>
            His clinical work follows the problems people bring to a spine visit: neck and low-back
            pain, cervical and lumbar disc disease, nerve compression, and spinal deformity. In
            published interviews he has described the same order of care this practice uses. Therapy
            and other nonoperative treatment come first when they fit. Surgery is discussed when
            those measures have not helped and the anatomy explains the symptoms.
          </p>
          <p>
            He has practiced spine surgery at Resurgens Orthopaedics in metro Atlanta and at Tulsa
            Bone and Joint in Oklahoma. Later public profiles list him with a spine practice in New
            York. Those offices are other practices. This website does not use their phone numbers,
            street addresses, or hours.
          </p>
          <p>
            Outside the clinic he founded Music is Medicine, a project that brings live music into
            hospitals. In 2020, during the pandemic, a recording of “Imagine” that he made with
            Dr. William Robinson was widely shared. He has appeared on Good Morning America, the
            Today show, and The Ellen DeGeneres Show, and in 2024 he released an original song,
            “Difference.” He is the son of Haitian immigrants.
          </p>
        </div>
        <aside className="rounded-2xl border border-line bg-mist p-5">
          <p className="kicker text-oxide-deep">Training</p>
          <dl className="mt-4 space-y-4">
            {physicianTraining.map((item) => (
              <div key={item.label}>
                <dt className="text-sm font-semibold text-ink">{item.label}</dt>
                <dd className="mt-1 text-sm leading-relaxed text-muted">{item.value}</dd>
              </div>
            ))}
          </dl>
          <p className="kicker mt-6 text-oxide-deep">Clinical focus</p>
          <ul className="mt-4 space-y-2 text-sm leading-relaxed text-muted">
            {clinicalFocus.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
          <p className="kicker mt-6 text-oxide-deep">Registry</p>
          <p className="mt-4 text-sm leading-relaxed text-muted">
            National Provider Identifier {practice.npi}, orthopedic surgery. The federal registry
            entry was last updated on August 31, 2021, and it records Georgia license number 89867.
            Hospital appointments are confirmed when surgery is scheduled.
          </p>
        </aside>
      </div>
    </article>
  );
}
