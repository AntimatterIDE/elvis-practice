import { redirect } from "next/navigation";
import { portalSignOutAction } from "@/app/portal/actions";
import { visitTypeLabel } from "@/lib/rcm/chart";
import { formatWhen } from "@/lib/rcm/format";
import { readPortalCookie } from "@/lib/portal/cookie";
import { getPortalStore } from "@/lib/portal/repository";
import type { PortalVisitView } from "@/lib/portal/types";
import { splitPortalVisits } from "@/lib/portal/view";
import { emergencyNote, practice } from "@/lib/site";

export const dynamic = "force-dynamic";

const documentLabel: Record<string, string> = {
  missing: "Still needed",
  received: "Received",
  signed: "Signed",
};

const visitStatus: Record<string, string> = {
  scheduled: "Scheduled",
  arrived: "Arrived",
  in_progress: "In room",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "No-show",
};

export default async function PortalHomePage() {
  const patientId = await getPortalStore().patientIdForToken(await readPortalCookie());
  if (!patientId) redirect("/portal/login");
  const home = await getPortalStore().home(patientId);
  if (!home) redirect("/portal/login");

  const { upcoming, earlier } = splitPortalVisits(home.visits);
  const needed = home.documents.filter((document) => document.status === "missing");
  const onFile = home.documents.filter((document) => document.status !== "missing");
  const greeting = home.preferredName || home.firstName;

  return (
    <main className="mx-auto grid max-w-3xl gap-6 px-5 py-10">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.18em] text-oxide">{practice.name}</p>
          <h1 className="mt-2 font-display text-5xl">Hello, {greeting}</h1>
          <p className="mt-3 text-sm text-muted">Your profile and visits. Call the practice if something here should change.</p>
        </div>
        <form action={portalSignOutAction}>
          <button className="text-sm underline">Sign out</button>
        </form>
      </div>

      <section className="border border-line bg-card p-5">
        <h2 className="font-display text-2xl">Visits</h2>
        {upcoming.length === 0 ? <p className="mt-3 text-sm text-muted">Nothing is coming up.</p> : null}
        <VisitList visits={upcoming} />
        {earlier.length ? (
          <>
            <h3 className="mt-6 text-xs uppercase tracking-[0.14em] text-muted">Earlier</h3>
            <VisitList visits={earlier} />
          </>
        ) : null}
      </section>

      <section className="border border-line bg-card p-5">
        <h2 className="font-display text-2xl">Your information</h2>
        <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
          <Info label="Name" value={`${home.firstName} ${home.lastName}`.trim()} />
          <Info label="Date of birth" value={home.dateOfBirth} />
          <Info label="Phone" value={home.phone} />
          <Info label="Email" value={home.email} />
          <Info label="Address" value={home.addressLine} />
          <Info label="MRN" value={home.mrn} />
          <Info label="Insurance" value={[home.payerName, home.memberId].filter(Boolean).join(" · ")} />
          <Info label="Emergency contact" value={home.emergency} />
          <Info label="Pharmacy" value={home.pharmacy} />
        </dl>
      </section>

      {home.answers.length ? (
        <section className="border border-line bg-card p-5">
          <h2 className="font-display text-2xl">What you sent</h2>
          <dl className="mt-4 grid gap-3">
            {home.answers.map((answer) => (
              <div key={answer.label}>
                <dt className="text-xs uppercase tracking-[0.14em] text-muted">{answer.label}</dt>
                <dd className="mt-1 text-sm">{answer.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      {home.allergies.length || home.medications.length ? (
        <section className="border border-line bg-card p-5">
          <h2 className="font-display text-2xl">Allergies and medicines</h2>
          {home.allergies.length ? <p className="mt-3 text-sm">Allergies: {home.allergies.join(" · ")}</p> : null}
          {home.medications.length ? <p className="mt-2 text-sm">Medicines: {home.medications.join(" · ")}</p> : null}
        </section>
      ) : null}

      <section className="border border-line bg-card p-5">
        <h2 className="font-display text-2xl">Papers</h2>
        {needed.length ? <p className="mt-3 text-sm">Still needed: {needed.map((document) => document.name).join(", ")}</p> : <p className="mt-3 text-sm">Nothing is marked missing.</p>}
        {onFile.length ? (
          <ul className="mt-3 grid gap-1 text-sm text-muted">
            {onFile.map((document) => (
              <li key={document.name}>
                {document.name}: {documentLabel[document.status] ?? document.status}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      <p className="text-sm leading-relaxed text-muted">{emergencyNote}</p>
    </main>
  );
}

function VisitList({ visits }: { visits: PortalVisitView[] }) {
  if (!visits.length) return null;
  return (
    <ul className="mt-3 divide-y divide-line">
      {visits.map((visit) => (
        <li key={visit.id} className="py-3 text-sm">
          <span className="block font-semibold">{formatWhen(visit.start)}</span>
          <span className="text-muted">
            {[visitTypeLabel[visit.visitType] ?? visit.visitType, visit.reason, visit.providerName, visit.room, visitStatus[visit.status] ?? visit.status]
              .filter(Boolean)
              .join(" · ")}
          </span>
        </li>
      ))}
    </ul>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  if (!value) return null;
  return (
    <div>
      <dt className="text-xs uppercase tracking-[0.14em] text-muted">{label}</dt>
      <dd className="mt-1">{value}</dd>
    </div>
  );
}
