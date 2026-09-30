"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { formatDay, patientName } from "@/lib/rcm/format";
import type { PatientInput, Sex } from "@/lib/rcm/types";
import { Field, LoadingDesk, PageHeader, fieldClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

const emptyForm: PatientInput = {
  firstName: "",
  lastName: "",
  dateOfBirth: "",
  sex: "unknown",
  memberId: "",
  payerName: "",
  phone: "",
  email: "",
  address: "",
  city: "",
  state: "GA",
  postalCode: "",
};

export function PatientsDesk() {
  const router = useRouter();
  const { ready, patients, claims, addPatient } = useRcm();
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<PatientInput>(emptyForm);
  const [error, setError] = useState("");

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return patients.filter((patient) => {
      if (!term) return true;
      return [patientName(patient), patient.memberId, patient.payerName, patient.email]
        .join(" ")
        .toLowerCase()
        .includes(term);
    });
  }, [patients, query]);

  if (!ready) return <LoadingDesk />;

  function update<K extends keyof PatientInput>(key: K, value: PatientInput[K]) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!form.firstName.trim() || !form.lastName.trim()) {
      setError("Enter a first and last name.");
      return;
    }
    const patient = addPatient({
      ...form,
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      payerName: form.payerName.trim() || "Self-pay",
    });
    setForm(emptyForm);
    setError("");
    router.push(`/admin/operations/patients/${patient.id}`);
  }

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Patients"
        lede="Demo roster. Adding a patient keeps the record in this browser."
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, member id, or payer"
            className={fieldClass}
            aria-label="Search patients"
          />
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {rows.length === 0 ? <li className="py-4 text-sm text-muted">No patients match.</li> : null}
            {rows.map((patient) => {
              const count = claims.filter((claim) => claim.patientId === patient.id).length;
              return (
                <li key={patient.id}>
                  <Link href={`/admin/operations/patients/${patient.id}`} className="flex items-center justify-between gap-4 py-4">
                    <span>
                      <span className="block">{patientName(patient)}</span>
                      <span className="text-sm text-muted">
                        {patient.payerName}
                        {patient.memberId ? ` · ${patient.memberId}` : ""} · DOB {formatDay(patient.dateOfBirth)}
                      </span>
                    </span>
                    <span className="text-sm text-muted">{count} claims</span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        <form onSubmit={onSubmit} className="grid h-fit gap-4 border border-line bg-card p-4">
          <h2 className="font-display text-2xl">Add patient</h2>
          <Field label="First name">
            <input className={fieldClass} value={form.firstName} onChange={(event) => update("firstName", event.target.value)} required />
          </Field>
          <Field label="Last name">
            <input className={fieldClass} value={form.lastName} onChange={(event) => update("lastName", event.target.value)} required />
          </Field>
          <Field label="Date of birth">
            <input className={fieldClass} type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} required />
          </Field>
          <Field label="Sex">
            <select className={fieldClass} value={form.sex} onChange={(event) => update("sex", event.target.value as Sex)}>
              <option value="female">Female</option>
              <option value="male">Male</option>
              <option value="other">Other</option>
              <option value="unknown">Unknown</option>
            </select>
          </Field>
          <Field label="Payer">
            <input className={fieldClass} value={form.payerName} onChange={(event) => update("payerName", event.target.value)} placeholder="Aetna" />
          </Field>
          <Field label="Member id">
            <input className={fieldClass} value={form.memberId} onChange={(event) => update("memberId", event.target.value)} />
          </Field>
          <Field label="Phone">
            <input className={fieldClass} value={form.phone} onChange={(event) => update("phone", event.target.value)} />
          </Field>
          <Field label="Email">
            <input className={fieldClass} type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
          </Field>
          {error ? <p className="text-sm text-emergency">{error}</p> : null}
          <Button type="submit">Save patient</Button>
        </form>
      </div>
    </main>
  );
}
