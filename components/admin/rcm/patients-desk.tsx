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
        lede="Find a chart by name, date of birth, phone, or MRN. New patients open straight into the chart."
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
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {rows.length === 0 ? <li className="py-4 text-sm text-muted">No patients match.</li> : null}
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
              return (
                <li key={patient.id}>
                  <Link href={`/admin/operations/patients/${patient.id}`} className="flex items-center justify-between gap-4 py-4">
                    <span>
                      <span className="block font-semibold">{patientName(patient)}</span>
                      <span className="text-sm text-muted">
                        DOB {formatDay(patient.dateOfBirth)}
                        {age !== null ? ` · ${age}` : ""} · MRN {patient.mrn || "new"} · {patient.phone || "No phone"}
                      </span>
                    </span>
                    <span className="text-right text-sm text-muted">
                      <span className="block">{upcoming ? `${formatDay(upcoming.start)} ${formatTime(upcoming.start)}` : "No upcoming visit"}</span>
                      <span className="block">{gaps.length ? `${gaps.length} chart items open` : patient.payerName}</span>
                    </span>
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
