import { redirect } from "next/navigation";
import { portalSignOutAction } from "@/app/portal/actions";
import { visitTypeLabel } from "@/lib/rcm/chart";
import { formatWhen } from "@/lib/rcm/format";
import { readPortalCookie } from "@/lib/portal/cookie";
import { getPortalStore } from "@/lib/portal/repository";
import type { PortalVisitView } from "@/lib/portal/types";
import { splitPortalVisits } from "@/lib/portal/view";

export const dynamic = "force-dynamic";

const documentLabel: Record<string, string> = {
  missing: "Still needed",
  received: "Received",
  signed: "Signed",
};

const visitStatus: Record<string, string> = {
  scheduled: "Scheduled",
  arrived: "Checked in",
  in_progress: "In a room",
  completed: "Completed",
  cancelled: "Cancelled",
  no_show: "Missed",
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
  const next = upcoming[0];

  return (
    <div className="mx-auto grid max-w-3xl gap-5 px-5 py-10 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker text-oxide-deep">Your record</p>
          <h1 className="mt-2 font-display text-4xl font-medium leading-tight sm:text-5xl">Hello, {greeting}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            This is what the practice has on file for you. Call them if a phone number, pharmacy, or insurance card should change.
          </p>
        </div>
        <form action={portalSignOutAction}>
          <button className="inline-flex min-h-11 items-center text-sm font-medium text-oxide-deep underline decoration-oxide-deep/30 underline-offset-4">
            Sign out
          </button>
        </form>
      </div>

      <section className="rounded-3xl bg-pine p-6 text-paper sm:p-7">
        <p className="kicker text-foam">{next ? "Next visit" : "Visits"}</p>
        {next ? (
          <>
            <p className="mt-2 font-display text-3xl font-medium leading-tight">{formatWhen(next.start)}</p>
            <p className="mt-2 text-sm leading-relaxed text-foam">
              {[visitTypeLabel[next.visitType] ?? next.visitType, next.reason, next.providerName, next.room].filter(Boolean).join(" · ")}
            </p>
            <p className="mt-3 text-sm text-paper">{visitStatus[next.status] ?? next.status}</p>
          </>
        ) : (
          <p className="mt-2 font-display text-3xl font-medium leading-tight">Nothing is on the books.</p>
        )}
        {upcoming.length > 1 ? <VisitList visits={upcoming.slice(1)} tone="dark" /> : null}
      </section>

      <section className="rounded-3xl border border-line bg-card p-6">
        <h2 className="font-display text-2xl font-medium leading-tight">On your chart</h2>
        <dl className="mt-5 grid gap-4 text-sm sm:grid-cols-2">
          <Info label="Legal name" value={`${home.firstName} ${home.lastName}`.trim()} />
          <Info label="Date of birth" value={home.dateOfBirth} />
          <Info label="Phone" value={home.phone} />
          <Info label="Email" value={home.email} />
          <Info label="Address" value={home.addressLine} />
          <Info label="Medical record number" value={home.mrn} />
          <Info label="Insurance" value={[home.payerName, home.memberId].filter(Boolean).join(" · ")} />
          <Info label="Emergency contact" value={home.emergency} />
          <Info label="Pharmacy" value={home.pharmacy} />
        </dl>
      </section>

      {home.allergies.length || home.medications.length ? (
        <section className="rounded-3xl border border-line bg-card p-6">
          <h2 className="font-display text-2xl font-medium leading-tight">Allergies and medicines</h2>
          <p className="mt-2 text-sm text-muted">Tell the practice if this list is missing something.</p>
          {home.allergies.length ? <p className="mt-4 text-sm"><span className="font-semibold">Allergies. </span>{home.allergies.join(" · ")}</p> : null}
          {home.medications.length ? <p className="mt-2 text-sm"><span className="font-semibold">Medicines. </span>{home.medications.join(" · ")}</p> : null}
        </section>
      ) : null}

      {home.answers.length ? (
        <section className="rounded-3xl border border-line bg-card p-6">
          <h2 className="font-display text-2xl font-medium leading-tight">What you sent</h2>
          <dl className="mt-4 grid gap-4">
            {home.answers.map((answer) => (
              <div key={answer.label}>
                <dt className="kicker text-muted">{answer.label}</dt>
                <dd className="mt-1 text-sm leading-relaxed">{answer.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}

      <section className="rounded-3xl border border-line bg-card p-6">
        <h2 className="font-display text-2xl font-medium leading-tight">Papers</h2>
        {needed.length ? (
          <p className="mt-3 text-sm">Still needed before the visit: {needed.map((document) => document.name).join(", ")}.</p>
        ) : (
          <p className="mt-3 text-sm text-muted">Nothing is marked missing.</p>
        )}
        {onFile.length ? (
          <ul className="mt-3 grid gap-1 text-sm text-muted">
            {onFile.map((document) => (
              <li key={document.name}>
                {document.name} · {documentLabel[document.status] ?? document.status}
              </li>
            ))}
          </ul>
        ) : null}
      </section>

      {earlier.length ? (
        <section className="rounded-3xl border border-line bg-card p-6">
          <h2 className="font-display text-2xl font-medium leading-tight">Earlier visits</h2>
          <VisitList visits={earlier} />
        </section>
      ) : null}

    </div>
  );
}

function VisitList({ visits, tone = "light" }: { visits: PortalVisitView[]; tone?: "light" | "dark" }) {
  if (!visits.length) return null;
  return (
    <ul className={tone === "dark" ? "mt-4 divide-y divide-white/15" : "mt-4 divide-y divide-line"}>
      {visits.map((visit) => (
        <li key={visit.id} className="py-3 text-sm">
          <span className="block font-semibold">{formatWhen(visit.start)}</span>
          <span className={tone === "dark" ? "text-foam/80" : "text-muted"}>
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
      <dt className="kicker text-muted">{label}</dt>
      <dd className="mt-1 leading-relaxed">{value}</dd>
    </div>
  );
}
