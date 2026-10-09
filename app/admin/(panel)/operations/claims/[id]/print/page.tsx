"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { claimTotal, formatDay, money, patientName } from "@/lib/rcm/format";
import { LoadingDesk } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

export default function ClaimPrintPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const { ready, claims, patients, practice } = useRcm();
  const claim = claims.find((item) => item.id === id);
  const patient = patients.find((item) => item.id === claim?.patientId);
  if (!ready) return <LoadingDesk />;
  if (!claim || !patient) return <p>Claim not found.</p>;

  return (
    <main className="mx-auto max-w-3xl">
      <p className="text-sm font-semibold uppercase tracking-[0.16em] text-emergency">Not mailed</p>
      <h1 className="mt-2 font-display text-4xl">Claim preview</h1>
      <p className="mt-2 text-sm text-muted">A local CMS-1500-style preview. Stedi test mode does not mail this.</p>
      <dl className="mt-6 grid gap-3 text-sm sm:grid-cols-2">
        <div><dt className="text-muted">Practice</dt><dd>{practice.legalName}</dd></div>
        <div><dt className="text-muted">NPI</dt><dd>{practice.npi || "Not on file"}</dd></div>
        <div><dt className="text-muted">Patient</dt><dd>{patientName(patient)}</dd></div>
        <div><dt className="text-muted">Payer</dt><dd>{claim.payerName}</dd></div>
        <div><dt className="text-muted">Control number</dt><dd>{claim.controlNumber}</dd></div>
        <div><dt className="text-muted">Date of service</dt><dd>{formatDay(claim.dateOfService)}</dd></div>
      </dl>
      <ul className="mt-6 divide-y divide-line border-y border-line">
        {claim.lines.filter((line) => line.includeOnBill).map((line) => (
          <li key={line.id} className="flex justify-between py-3 text-sm">
            <span>{line.cpt}{line.modifiers.length ? ` ${line.modifiers.join(" ")}` : ""} · {line.diagnoses.join(", ")}</span>
            <span>{money(line.charge * line.units)}</span>
          </li>
        ))}
      </ul>
      <p className="mt-4 text-sm">Total {money(claimTotal(claim))}</p>
      <div className="mt-6 flex gap-3 print:hidden">
        <button type="button" className="rounded-full bg-oxide px-4 py-2 text-sm text-white" onClick={() => window.print()}>Print</button>
        <Link href={`/admin/operations/claims/${claim.id}`} className="text-sm underline">Back</Link>
      </div>
    </main>
  );
}
