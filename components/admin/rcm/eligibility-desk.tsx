"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatWhen, money, patientName } from "@/lib/rcm/format";
import { Field, LoadingDesk, PageHeader, fieldClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

export function EligibilityDesk() {
  const { ready, patients, eligibility, addEligibility } = useRcm();
  const [patientId, setPatientId] = useState("");
  const [inactive, setInactive] = useState(false);
  const names = new Map(patients.map((patient) => [patient.id, patientName(patient)]));
  const resolved = patientId || patients[0]?.id || "";

  if (!ready) return <LoadingDesk />;

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Eligibility"
        lede="Sample benefit estimates. These numbers are not a live 270/271 response."
      />
      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
      <form
        className="grid gap-4 rounded-2xl border border-line bg-card p-5 shadow-[0_16px_36px_-28px_rgb(7_30_54_/_0.45)]"
        onSubmit={(event) => {
          event.preventDefault();
          const patient = patients.find((item) => item.id === resolved);
          if (!patient) return;
          const priorAuth = /aetna|united/i.test(patient.payerName);
          addEligibility({
            patientId: patient.id,
            payerName: patient.payerName,
            active: !inactive,
            copay: inactive ? 0 : 40,
            coinsurance: inactive ? 0 : 20,
            deductibleRemaining: inactive ? 0 : 350,
            priorAuthRequired: !inactive && priorAuth,
            summary: inactive
              ? `${patient.payerName} did not return active coverage for member ${patient.memberId || "id on file"}.`
              : `${patient.payerName} shows active coverage for ${patientName(patient)}. Office copay $40. Deductible remaining $350.${priorAuth ? " Imaging may need prior authorization." : ""}`,
          });
        }}
      >
        <Field label="Patient">
          <select className={fieldClass} value={resolved} onChange={(event) => setPatientId(event.target.value)}>
            {patients.map((patient) => (
              <option key={patient.id} value={patient.id}>
                {patientName(patient)} · {patient.payerName}
              </option>
            ))}
          </select>
        </Field>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={inactive} onChange={(event) => setInactive(event.target.checked)} />
          Simulate inactive coverage
        </label>
        <Button type="submit" className="justify-self-start">
          Run estimate
        </Button>
      </form>
      <ul className="grid gap-4 md:grid-cols-2 xl:grid-cols-1">
        {eligibility.map((check) => (
          <li key={check.id} className="rounded-2xl border border-line bg-card p-4">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <h2 className="font-display text-2xl">{names.get(check.patientId) ?? "Patient"}</h2>
              <span className="text-sm text-muted">{formatWhen(check.createdAt)}</span>
            </div>
            <p className="mt-2 text-sm">{check.summary}</p>
            <dl className="mt-4 grid gap-3 text-sm sm:grid-cols-4">
              <div>
                <dt className="text-muted">Status</dt>
                <dd>{check.active ? "Active" : "Inactive"}</dd>
              </div>
              <div>
                <dt className="text-muted">Copay</dt>
                <dd>{money(check.copay)}</dd>
              </div>
              <div>
                <dt className="text-muted">Coinsurance</dt>
                <dd>{check.coinsurance}%</dd>
              </div>
              <div>
                <dt className="text-muted">Deductible left</dt>
                <dd>{money(check.deductibleRemaining)}</dd>
              </div>
            </dl>
            {check.priorAuthRequired ? <p className="mt-3 text-sm text-royal">Prior authorization may be required.</p> : null}
            <Link href={`/admin/operations/patients/${check.patientId}`} className="mt-3 inline-block text-sm underline">
              Open patient
            </Link>
          </li>
        ))}
      </ul>
      </div>
    </main>
  );
}
