import Link from "next/link";
import { redirect } from "next/navigation";
import { portalSignOutAction } from "@/app/portal/actions";
import { packetsForPortal } from "@/lib/agreements/store";
import { visitTypeLabel } from "@/lib/rcm/chart";
import { formatWhen } from "@/lib/rcm/format";
import { readPortalCookie } from "@/lib/portal/cookie";
import { getPortalStore } from "@/lib/portal/repository";
import type { PortalVisitView } from "@/lib/portal/types";
import { splitPortalVisits } from "@/lib/portal/view";

export const dynamic = "force-dynamic";

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
  const packets = await packetsForPortal(patientId, home.email);
  const toSign = packets.filter((packet) => packet.signPath);
  const needed = home.documents.filter((document) => document.status === "missing");
  const intakeOpen = needed.some((document) => document.name === "New patient intake");
  const greeting = home.preferredName || home.firstName;
  const next = upcoming[0];

  return (
    <div className="mx-auto grid max-w-3xl gap-5 px-5 py-10 sm:py-12">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="kicker text-oxide-deep">Your record</p>
          <h1 className="mt-2 font-display text-4xl font-medium leading-tight sm:text-5xl">Hello, {greeting}</h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
            Your visits, messages, papers, and anything the practice needs from you.
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

      {toSign.length || intakeOpen || needed.length ? (
        <section className="rounded-3xl border border-line bg-card p-6">
          <h2 className="font-display text-2xl font-medium leading-tight">Needs you</h2>
          <ul className="mt-4 grid gap-3 text-sm">
            {toSign.map((packet) => (
              <li key={packet.id}>
                <Link className="font-medium text-oxide-deep underline decoration-oxide-deep/30 underline-offset-4" href={packet.signPath}>
                  Sign {packet.title}
                </Link>
              </li>
            ))}
            {intakeOpen ? (
              <li>
                <Link className="font-medium text-oxide-deep underline decoration-oxide-deep/30 underline-offset-4" href="/portal/intake">
                  Finish your information
                </Link>
              </li>
            ) : null}
            {needed.filter((document) => document.name !== "New patient intake").length ? (
              <li>
                <Link className="font-medium text-oxide-deep underline decoration-oxide-deep/30 underline-offset-4" href="/portal/documents">
                  Papers still needed: {needed.filter((document) => document.name !== "New patient intake").map((document) => document.name).join(", ")}
                </Link>
              </li>
            ) : null}
          </ul>
        </section>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <Link href="/portal/profile" className="rounded-3xl border border-line bg-card p-6">
          <p className="kicker text-oxide-deep">Profile</p>
          <p className="mt-2 font-display text-2xl font-medium leading-tight">What the practice has on file</p>
        </Link>
        <Link href="/portal/messages" className="rounded-3xl border border-line bg-card p-6">
          <p className="kicker text-oxide-deep">Messages</p>
          <p className="mt-2 font-display text-2xl font-medium leading-tight">Talk with the practice</p>
        </Link>
        <Link href="/portal/documents" className="rounded-3xl border border-line bg-card p-6">
          <p className="kicker text-oxide-deep">Documents</p>
          <p className="mt-2 font-display text-2xl font-medium leading-tight">Sign, upload, and review</p>
        </Link>
        <Link href="/portal/updates" className="rounded-3xl border border-line bg-card p-6">
          <p className="kicker text-oxide-deep">Updates</p>
          <p className="mt-2 font-display text-2xl font-medium leading-tight">Visits, charges, and results</p>
        </Link>
      </div>

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
