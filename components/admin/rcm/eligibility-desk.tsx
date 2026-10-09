"use client";

import { useState } from "react";
import Link from "next/link";
import { checkCoordination, checkEligibility, discoverCoverage } from "@/app/admin/stedi/actions";
import { Button } from "@/components/ui/button";
import { formatWhen, money, patientName } from "@/lib/rcm/format";
import { Field, LoadingDesk, PageHeader, fieldClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

function benefit(value: number | null) {
  return value == null ? "Unknown" : money(value);
}

export function EligibilityDesk() {
  const { ready, patients, eligibility, practice, addEligibility } = useRcm();
  const [patientId, setPatientId] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const names = new Map(patients.map((patient) => [patient.id, patientName(patient)]));
  const resolved = patientId || patients[0]?.id || "";

  if (!ready) return <LoadingDesk />;

  const patient = patients.find((item) => item.id === resolved);

  async function runEligibility() {
    if (!patient) return;
    setPending(true);
    const coverage = patient.coverages.find((item) => item.rank === "primary");
    const result = await checkEligibility({
      payerId: coverage?.tradingPartnerId || "",
      payerName: patient.payerName,
      memberId: patient.memberId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      npi: practice.npi,
    });
    if (!result.ok && result.active == null && result.copay == null) {
      setMessage(result.message);
      setPending(false);
      return;
    }
    addEligibility({
      patientId: patient.id,
      payerName: patient.payerName,
      active: result.active === true,
      copay: result.copay,
      coinsurance: result.coinsurance,
      deductibleRemaining: result.deductibleRemaining,
      priorAuthRequired: false,
      summary: result.summary,
      source: "stedi",
    });
    setMessage(result.message);
    setPending(false);
  }

  async function runDiscovery() {
    if (!patient) return;
    setPending(true);
    const result = await discoverCoverage({
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      address: patient.address,
      city: patient.city,
      state: patient.state,
      postalCode: patient.postalCode,
      npi: practice.npi,
      beginningDateOfService: "2026-09-23",
      endDateOfService: "2026-09-30",
    });
    addEligibility({
      patientId: patient.id,
      payerName: result.payers[0] || "Discovery",
      active: result.payers.length > 0,
      copay: null,
      coinsurance: null,
      deductibleRemaining: null,
      priorAuthRequired: false,
      summary: result.payers.length ? `${result.message} ${result.payers.join(", ")}.` : result.message,
      source: "discovery",
    });
    setMessage(result.message);
    setPending(false);
  }

  async function runCoordination() {
    if (!patient) return;
    setPending(true);
    const coverage = patient.coverages.find((item) => item.rank === "primary");
    const result = await checkCoordination({
      payerId: coverage?.tradingPartnerId || "",
      memberId: patient.memberId,
      firstName: patient.firstName,
      lastName: patient.lastName,
      dateOfBirth: patient.dateOfBirth,
      npi: practice.npi,
      dateOfService: "2026-09-30",
    });
    setMessage(result.message);
    setPending(false);
  }

  return (
    <main>
      <PageHeader
        kicker="Billing"
        title="Eligibility"
        lede="A live 270/271 check with the Stedi test key. A missing benefit stays unknown. This is not prior authorization."
      />
      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        <form
          className="grid gap-4 rounded-2xl border border-line bg-card p-5 shadow-[0_16px_36px_-28px_rgb(7_30_54_/_0.45)]"
          onSubmit={(event) => {
            event.preventDefault();
            void runEligibility();
          }}
        >
          <Field label="Patient">
            <select className={fieldClass} value={resolved} onChange={(event) => setPatientId(event.target.value)}>
              {patients.map((item) => (
                <option key={item.id} value={item.id}>
                  {patientName(item)} · {item.payerName}
                </option>
              ))}
            </select>
          </Field>
          <p className="text-sm text-muted">This check uses the practice NPI and the member id on the chart. A missing benefit stays unknown.</p>
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={pending || !patient}>Check eligibility</Button>
            <Button type="button" variant="secondary" disabled={pending || !patient} onClick={() => void runDiscovery()}>
              Look up coverage
            </Button>
            <Button type="button" variant="secondary" disabled={pending || !patient} onClick={() => void runCoordination()}>
              Check coordination
            </Button>
          </div>
          {message ? <p className="text-sm text-muted">{message}</p> : null}
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
                  <dd>{check.summary.includes("unknown") && check.copay == null && check.coinsurance == null ? "Unknown" : check.active ? "Active" : "Inactive"}</dd>
                </div>
                <div>
                  <dt className="text-muted">Copay</dt>
                  <dd>{benefit(check.copay)}</dd>
                </div>
                <div>
                  <dt className="text-muted">Coinsurance</dt>
                  <dd>{check.coinsurance == null ? "Unknown" : `${check.coinsurance}%`}</dd>
                </div>
                <div>
                  <dt className="text-muted">Deductible left</dt>
                  <dd>{benefit(check.deductibleRemaining)}</dd>
                </div>
              </dl>
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
