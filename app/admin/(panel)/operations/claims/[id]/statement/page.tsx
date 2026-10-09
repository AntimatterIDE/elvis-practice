"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { claimTotal, formatDay, money, patientName } from "@/lib/rcm/format";
import { LoadingDesk } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

export default function StatementPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const { ready, claims, patients, practice } = useRcm();
  const claim = claims.find((item) => item.id === id);
  const patient = patients.find((item) => item.id === claim?.patientId);
  if (!ready) return <LoadingDesk />;
  if (!claim || !patient) return <p>Claim not found.</p>;
  const paid = claim.paymentAmount ?? 0;
  const responsibility = claim.patientResponsibility ?? Math.max(0, claimTotal(claim) - paid);

  return (
    <main className="mx-auto max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emergency">Not sent</p>
      <h1 className="mt-2 font-display text-4xl">Patient statement</h1>
      <p className="mt-2 text-sm text-muted">{practice.legalName}. This preview is generated here. It is not a bill that was mailed.</p>
      <p className="mt-6 text-sm">{patientName(patient)} · date of service {formatDay(claim.dateOfService)} · {claim.controlNumber}</p>
      <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-3">
        <div><dt className="text-muted">Billed</dt><dd>{money(claimTotal(claim))}</dd></div>
        <div><dt className="text-muted">Paid</dt><dd>{claim.paymentAmount == null ? "No remit yet" : money(paid)}</dd></div>
        <div><dt className="text-muted">Patient balance</dt><dd>{money(responsibility)}</dd></div>
      </dl>
      <div className="mt-6 flex gap-3 print:hidden">
        <button type="button" className="rounded-full bg-oxide px-4 py-2 text-sm text-white" onClick={() => window.print()}>Print</button>
        <Link href={`/admin/operations/claims/${claim.id}`} className="text-sm underline">Back</Link>
      </div>
    </main>
  );
}
