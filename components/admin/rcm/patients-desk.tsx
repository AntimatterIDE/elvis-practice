"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ageFromDob, chartGaps } from "@/lib/rcm/chart";
import { formatDay, formatTime, patientName } from "@/lib/rcm/format";
import type { PatientInput, Sex } from "@/lib/rcm/types";
import { Field, LoadingDesk, PageHeader, fieldClass, useClinicToday } from "@/components/admin/rcm/ui";
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
  const { ready, patients, appointments, addPatient } = useRcm();
  const today = useClinicToday();
  const [query, setQuery] = useState("");
  const [form, setForm] = useState<PatientInput>(emptyForm);
  const [error, setError] = useState("");

  const rows = useMemo(() => {
    const term = query.trim().toLowerCase();
    return patients.filter((patient) => {
      if (!term) return true;
      return [patientName(patient), patient.preferredName, patient.mrn, patient.phone, patient.memberId, patient.payerName, patient.email]
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
        lede="Find a chart by name, date of birth, phone, or MRN. Send an intake link when you want the patient to fill out their own form."
        action={
          <Button asChild variant="secondary">
            <Link href="/admin/operations/intake">Intake form</Link>
          </Button>
        }
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_20rem]">
        <section>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search name, date of birth, phone, or MRN"
            className={fieldClass}
            aria-label="Search patients"
          />
          <ul className="mt-4 overflow-hidden rounded-2xl border border-line bg-card">
            {rows.length === 0 ? (
              <li className="px-4 py-5 text-sm text-muted">{query.trim() ? "No charts match that search." : "No charts yet. Send an intake link, or add a walk-in."}</li>
            ) : null}
            {rows.map((patient) => {
              const upcoming = appointments
                .filter(
                  (appointment) =>
                    appointment.patientId === patient.id &&
                    appointment.status !== "cancelled" &&
                    appointment.start.slice(0, 10) >= today,
                )
                .sort((a, b) => a.start.localeCompare(b.start))[0];
              const gaps = chartGaps(patient);
              const age = ageFromDob(patient.dateOfBirth, today);
              const initials = `${patient.firstName.slice(0, 1)}${patient.lastName.slice(0, 1)}`.toUpperCase();
              return (
                <li key={patient.id} className="border-b border-line last:border-b-0">
                  <Link href={`/admin/operations/patients/${patient.id}`} className="flex items-center gap-4 px-4 py-3.5 hover:bg-mist/60">
                    <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mist text-xs font-semibold tracking-wide text-pine" aria-hidden>
                      {initials}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block font-semibold">{patientName(patient)}</span>
                      <span className="text-sm text-muted">
                        DOB {formatDay(patient.dateOfBirth)}
                        {age !== null ? ` · ${age} yrs` : ""} · MRN {patient.mrn || "new"} · {patient.phone || "No phone"}
                      </span>
                    </span>
                    <span className="hidden text-right text-sm text-muted sm:block">
                      <span className="block text-ink">{upcoming ? `${formatDay(upcoming.start)} ${formatTime(upcoming.start)}` : "No visit booked"}</span>
                      <span className="block">{gaps.length ? `${gaps.length} items still open on the chart` : patient.payerName}</span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
        <form onSubmit={onSubmit} className="grid h-fit gap-4 rounded-2xl border border-line bg-card p-5">
          <div>
            <h2 className="font-display text-2xl tracking-tight">Walk-in chart</h2>
            <p className="mt-1 text-sm leading-relaxed text-muted">Use this when the patient is here. Send an intake link when they can fill it out first.</p>
          </div>
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
