"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { claimTotal, formatDay, formatWhen, money, patientName } from "@/lib/rcm/format";
import type { Patient, PatientInput, Sex } from "@/lib/rcm/types";
import { Field, LoadingDesk, PageHeader, StatusPill, fieldClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

function toInput(patient: Patient): PatientInput {
  return {
    firstName: patient.firstName,
    lastName: patient.lastName,
    dateOfBirth: patient.dateOfBirth,
    sex: patient.sex,
    memberId: patient.memberId,
    payerName: patient.payerName,
    phone: patient.phone,
    email: patient.email,
    address: patient.address,
    city: patient.city,
    state: patient.state,
    postalCode: patient.postalCode,
  };
}

export function PatientDetail({ id }: { id: string }) {
  const { ready, patients, claims, appointments, updatePatient, removePatient } = useRcm();
  const patient = patients.find((item) => item.id === id);
  if (!ready) return <LoadingDesk />;
  if (!patient) {
    return (
      <main>
        <h1 className="font-display text-4xl">Patient not found</h1>
        <Link href="/admin/operations/patients" className="mt-4 inline-block text-sm underline">
          Back to patients
        </Link>
      </main>
    );
  }

  const relatedClaims = claims.filter((claim) => claim.patientId === id);
  const relatedVisits = appointments
    .filter((appointment) => appointment.patientId === id)
    .sort((a, b) => b.start.localeCompare(a.start));

  return (
    <main>
      <PageHeader
        kicker="Patient"
        title={patientName(patient)}
        lede={`${patient.payerName} · Member ${patient.memberId || "not set"} · DOB ${formatDay(patient.dateOfBirth)}`}
        action={
          <Button asChild variant="secondary">
            <Link href={`/admin/operations/claims/new?patient=${patient.id}`}>New claim</Link>
          </Button>
        }
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <PatientEditor key={patient.id} patient={patient} onSave={updatePatient} onRemove={removePatient} />
        <div className="grid gap-8">
          <section>
            <h2 className="font-display text-2xl">Claims</h2>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {relatedClaims.length === 0 ? <li className="py-3 text-sm text-muted">No claims yet.</li> : null}
              {relatedClaims.map((claim) => (
                <li key={claim.id}>
                  <Link href={`/admin/operations/claims/${claim.id}`} className="flex items-center justify-between gap-3 py-3 text-sm">
                    <span>
                      {formatDay(claim.dateOfService)} · {money(claimTotal(claim))}
                    </span>
                    <StatusPill status={claim.status} />
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="font-display text-2xl">Visits</h2>
            <ul className="mt-3 divide-y divide-line border-y border-line">
              {relatedVisits.length === 0 ? <li className="py-3 text-sm text-muted">No visits yet.</li> : null}
              {relatedVisits.map((appointment) => (
                <li key={appointment.id} className="py-3 text-sm">
                  <span className="block">{formatWhen(appointment.start)}</span>
                  <span className="text-muted">
                    {appointment.reason} · {appointment.status.replaceAll("_", " ")}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}

function PatientEditor({
  patient,
  onSave,
  onRemove,
}: {
  patient: Patient;
  onSave: (id: string, input: PatientInput) => void;
  onRemove: (id: string) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState<PatientInput>(() => toInput(patient));
  const [saved, setSaved] = useState(false);

  function update<K extends keyof PatientInput>(key: K, value: PatientInput[K]) {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="grid gap-4 border border-line bg-card p-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(patient.id, form);
        setSaved(true);
      }}
    >
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
        <input className={fieldClass} value={form.payerName} onChange={(event) => update("payerName", event.target.value)} />
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
      <Field label="Address" className="sm:col-span-2">
        <input className={fieldClass} value={form.address} onChange={(event) => update("address", event.target.value)} />
      </Field>
      <Field label="City">
        <input className={fieldClass} value={form.city} onChange={(event) => update("city", event.target.value)} />
      </Field>
      <Field label="State">
        <input className={fieldClass} value={form.state} onChange={(event) => update("state", event.target.value)} />
      </Field>
      <Field label="Postal code">
        <input className={fieldClass} value={form.postalCode} onChange={(event) => update("postalCode", event.target.value)} />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit">Save changes</Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (!window.confirm("Remove this demo patient and their claims?")) return;
            onRemove(patient.id);
            router.push("/admin/operations/patients");
          }}
        >
          Remove
        </Button>
        {saved ? <span className="text-sm text-oxide">Saved in this browser.</span> : null}
      </div>
    </form>
  );
}
