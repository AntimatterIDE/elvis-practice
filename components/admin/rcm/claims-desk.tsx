"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { claimTotal, formatDay, money, patientName } from "@/lib/rcm/format";
import type { Appointment, Claim, ClaimStatus } from "@/lib/rcm/types";
import { DemoBilling } from "@/components/admin/rcm/demo-billing";
import { LoadingDesk, PageHeader, StatusPill, fieldClass, panelClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

const filters: Array<ClaimStatus | "all"> = ["all", "draft", "held", "ready", "submitted", "processing", "accepted", "paid", "denied", "rejected"];

function sameDay(claim: Claim, visit: Appointment) {
  return claim.appointmentId === visit.id || (claim.patientId === visit.patientId && claim.dateOfService === visit.start.slice(0, 10));
}

export function ClaimsDesk() {
  const { ready, claims, patients, appointments, updateClaim } = useRcm();
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<ClaimStatus | "all">("all");
  const [openReview, setOpenReview] = useState<string | null>(null);
  const names = useMemo(() => new Map(patients.map((patient) => [patient.id, patientName(patient)])), [patients]);
  const byId = useMemo(() => new Map(patients.map((patient) => [patient.id, patient])), [patients]);

  if (!ready) return <LoadingDesk />;

  const codingVisits = appointments.filter((visit) => {
    if (visit.status !== "completed") return false;
    const related = claims.filter((claim) => sameDay(claim, visit));
    return !related.some((claim) => claim.status !== "draft" && claim.status !== "held");
  });

  const review = claims.filter((claim) => claim.status === "ready");
  const rows = claims.filter((claim) => {
    if (status !== "all" && claim.status !== status) return false;
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return [names.get(claim.patientId), claim.payerName, claim.controlNumber, claim.lines.map((line) => line.cpt).join(" ")].join(" ").toLowerCase().includes(term);
  });

  return (
    <main>
      <PageHeader
        kicker="Billing"
        title="Coding"
        lede="Treated visits wait here until the charges are reviewed. Ready for Bill moves a case to the review list. It does not send it."
        action={<DemoBilling />}
      />

      <section className="mt-8">
        <h2 className="font-display text-2xl">Worklist</h2>
        <ul className="mt-4 grid gap-3">
          {codingVisits.length === 0 ? <li className="text-sm text-muted">No visits are waiting to be coded. Load a demo day to practice the path.</li> : null}
          {codingVisits.map((visit) => {
            const patient = byId.get(visit.patientId);
            const related = claims.find((claim) => sameDay(claim, visit) && (claim.status === "draft" || claim.status === "held"));
            return (
              <li key={visit.id} className={panelClass}>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold">{patient ? patientName(patient) : "Unknown patient"}</p>
                    <p className="mt-1 text-sm text-muted">
                      {formatDay(visit.start)} · {patient?.payerName || "No insurance"} · {visit.providerName} · {visit.scheduledProcedures.map((item) => item.cpt).join(", ") || visit.reason}
                    </p>
                  </div>
                  {related ? <StatusPill status={related.status} /> : <StatusPill status="draft" label="Not coded" />}
                </div>
                <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
                  <div>
                    <dt className="text-muted">Performed</dt>
                    <dd>{related ? "Lines started" : "Scheduled only"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Op note</dt>
                    <dd>{visit.opNoteStatus === "missing" ? "Missing" : visit.opNoteStatus === "present" ? "Present" : "Not required"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Unable to code</dt>
                    <dd>{visit.unableToCode || related?.status === "held" ? related?.holdReason || "Held" : "No"}</dd>
                  </div>
                  <div>
                    <dt className="text-muted">Flag</dt>
                    <dd>{visit.codingFlag || "—"}</dd>
                  </div>
                </dl>
                <Button asChild className="mt-4">
                  <Link href={`/admin/operations/claims/new?patient=${visit.patientId}&visit=${visit.id}${related ? `&claim=${related.id}` : ""}`}>Open case</Link>
                </Button>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">Ready for review</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted">Expand a case to see the codes behind the amount. Sending it back keeps it off the clearinghouse.</p>
        <ul className="mt-4 grid gap-3">
          {review.length === 0 ? <li className="text-sm text-muted">Nothing is waiting for review.</li> : null}
          {review.map((claim) => (
            <li key={claim.id} className={panelClass}>
              <button type="button" className="flex w-full items-baseline justify-between gap-3 text-left" onClick={() => setOpenReview((current) => (current === claim.id ? null : claim.id))} aria-expanded={openReview === claim.id}>
                <span>
                  <span className="block font-semibold">{names.get(claim.patientId) ?? "Unknown patient"}</span>
                  <span className="text-sm text-muted">{claim.payerName} · {formatDay(claim.dateOfService)} · {money(claimTotal(claim))}</span>
                </span>
                <StatusPill status={claim.status} label="Ready for bill" />
              </button>
              {openReview === claim.id ? (
                <div className="mt-4 grid gap-3">
                  <ul className="divide-y divide-line border-y border-line">
                    {claim.lines.filter((line) => line.includeOnBill).map((line) => (
                      <li key={line.id} className="flex items-baseline justify-between gap-4 py-3 text-sm">
                        <span>
                          <span className="block font-semibold">{line.cpt}{line.modifiers.length ? `-${line.modifiers.join("-")}` : ""} · {line.description}</span>
                          <span className="text-muted">{line.diagnoses.join(", ") || "No diagnosis"} · {line.units} unit{line.units === 1 ? "" : "s"}</span>
                        </span>
                        <span>{money(line.charge * line.units)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex flex-wrap gap-2">
                    <Button asChild>
                      <Link href={`/admin/operations/claims/${claim.id}`}>Open claim</Link>
                    </Button>
                    <Button type="button" variant="secondary" onClick={() => updateClaim(claim.id, { status: "draft", returnReason: "Sent back from review." })}>
                      Send back to coding
                    </Button>
                  </div>
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-10">
        <h2 className="font-display text-2xl">All claims</h2>
        <div className="mt-4 flex flex-wrap gap-3">
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search patient, payer, control number, or CPT" className={`${fieldClass} max-w-md`} aria-label="Search claims" />
          <select className={`${fieldClass} max-w-48`} value={status} onChange={(event) => setStatus(event.target.value as ClaimStatus | "all")} aria-label="Filter by status">
            {filters.map((item) => (
              <option key={item} value={item}>{item}</option>
            ))}
          </select>
        </div>
        <ul className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.length === 0 ? <li className="text-sm text-muted md:col-span-2 xl:col-span-3">No claims match.</li> : null}
          {rows.map((claim) => (
            <li key={claim.id}>
              <Link href={`/admin/operations/claims/${claim.id}`} className="flex h-full flex-col justify-between gap-4 rounded-2xl border border-line bg-card p-4 hover:border-oxide/40">
                <span>
                  <span className="block">{names.get(claim.patientId) ?? "Unknown patient"}</span>
                  <span className="text-sm text-muted">{claim.payerName} · {formatDay(claim.dateOfService)} · {claim.controlNumber}</span>
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
    </main>
  );
}
