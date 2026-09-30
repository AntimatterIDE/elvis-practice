"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { claimTotal, formatDay, money, patientName } from "@/lib/rcm/format";
import { summarizeClaims } from "@/lib/rcm/metrics";
import { LoadingDesk, PageHeader, Stat, StatusPill } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

const actions = [
  ["/admin/operations/claims/drafts", "Agent drafts", "Review claims prepared in the demo"],
  ["/admin/operations/eligibility", "Eligibility", "Check coverage with sample benefits"],
  ["/admin/operations/claims/new", "New claim", "Create a draft claim for a patient"],
  ["/admin/operations/upload", "Upload", "Import a CSV of demo encounters"],
  ["/admin/operations/denials", "Denials", "Draft an appeal or mark a resubmit"],
  ["/admin/operations/analytics", "Analytics", "See billed dollars and first-pass rate"],
] as const;

export function Workbench() {
  const { ready, patients, claims, appointments, resetDemo } = useRcm();
  if (!ready) return <LoadingDesk />;

  const summary = summarizeClaims(claims);
  const names = new Map(patients.map((patient) => [patient.id, patientName(patient)]));
  const recent = [...claims].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)).slice(0, 6);
  const attention = claims.filter((claim) => claim.status === "denied" || claim.status === "rejected");
  const upcoming = [...appointments]
    .filter((appointment) => appointment.status === "scheduled")
    .sort((a, b) => a.start.localeCompare(b.start))
    .slice(0, 4);

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Claims desk"
        lede="Demo patients, claims, visits, and denials for The Alignment Clinic. Records stay in this browser."
        action={
          <div className="flex flex-wrap gap-3">
            <Button variant="secondary" type="button" onClick={resetDemo}>
              Reset demo
            </Button>
            <Button asChild>
              <Link href="/admin/operations/claims/new">New claim</Link>
            </Button>
          </div>
        }
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="Billed" value={money(summary.billed)} detail="All demo claims" />
        <Stat label="Accepted" value={money(summary.accepted)} detail="Accepted and paid" />
        <Stat label="In process" value={String(summary.processing)} detail="Submitted or processing" />
        <Stat
          label="First-pass"
          value={`${Math.round(summary.firstPass * 100)}%`}
          detail="Clean claims among decided ones"
        />
      </div>
      <div className="mt-10 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {actions.map(([href, title, detail]) => (
          <Link key={href} href={href} className="border border-line bg-card p-4 hover:border-oxide">
            <span className="block font-semibold">{title}</span>
            <span className="mt-1 block text-sm text-muted">{detail}</span>
          </Link>
        ))}
      </div>
      <div className="mt-10 grid gap-8 lg:grid-cols-[1.4fr_0.8fr]">
        <section>
          <h2 className="font-display text-2xl">Recent claims</h2>
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {recent.map((claim) => (
              <li key={claim.id}>
                <Link href={`/admin/operations/claims/${claim.id}`} className="flex items-center justify-between gap-4 py-4">
                  <span>
                    <span className="block">{names.get(claim.patientId) ?? "Unknown patient"}</span>
                    <span className="text-sm text-muted">
                      {claim.payerName} · {formatDay(claim.dateOfService)} · {claim.controlNumber}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <StatusPill status={claim.status} />
                    <span className="text-sm">{money(claimTotal(claim))}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
        <section className="grid gap-8">
          <div>
            <h2 className="font-display text-2xl">Needs attention</h2>
            <ul className="mt-4 grid gap-3">
              {attention.length === 0 ? <li className="text-sm text-muted">No denied or rejected claims.</li> : null}
              {attention.map((claim) => (
                <li key={claim.id}>
                  <Link href={`/admin/operations/denials`} className="block border border-line bg-card p-3 text-sm">
                    <span className="block font-semibold">{names.get(claim.patientId)}</span>
                    <span className="text-muted">{claim.denialReason}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
          <div>
            <h2 className="font-display text-2xl">Upcoming visits</h2>
            <ul className="mt-4 grid gap-3">
              {upcoming.map((appointment) => (
                <li key={appointment.id} className="border border-line bg-card p-3 text-sm">
                  <span className="block font-semibold">{names.get(appointment.patientId)}</span>
                  <span className="text-muted">
                    {formatDay(appointment.start)} · {appointment.reason}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>
    </main>
  );
}
