"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { formatWhen, patientName } from "@/lib/rcm/format";
import type { AppointmentStatus } from "@/lib/rcm/types";
import { Field, LoadingDesk, PageHeader, StatusPill, fieldClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

const statuses: AppointmentStatus[] = ["scheduled", "in_progress", "completed", "cancelled", "no_show"];

export function ScheduleDesk() {
  const { ready, appointments, patients, practice, addAppointment, updateAppointment, removeAppointment } = useRcm();
  const [patientId, setPatientId] = useState("");
  const [date, setDate] = useState("2026-10-06");
  const [time, setTime] = useState("09:00");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("30");
  const [filter, setFilter] = useState<AppointmentStatus | "all">("all");

  const names = useMemo(() => new Map(patients.map((patient) => [patient.id, patientName(patient)])), [patients]);
  const rows = [...appointments]
    .filter((appointment) => filter === "all" || appointment.status === filter)
    .sort((a, b) => a.start.localeCompare(b.start));

  if (!ready) return <LoadingDesk />;

  const resolvedPatient = patientId || patients[0]?.id || "";

  return (
    <main>
      <PageHeader kicker="Practice" title="Scheduling" lede={`Visits with ${practice.physicianName}. Times are demo records only.`} />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <section>
          <select
            className={`${fieldClass} mb-4 max-w-48`}
            value={filter}
            onChange={(event) => setFilter(event.target.value as AppointmentStatus | "all")}
            aria-label="Filter visits"
          >
            <option value="all">All statuses</option>
            {statuses.map((status) => (
              <option key={status} value={status}>
                {status.replaceAll("_", " ")}
              </option>
            ))}
          </select>
          <ul className="divide-y divide-line border-y border-line">
            {rows.length === 0 ? <li className="py-4 text-sm text-muted">No visits in this filter.</li> : null}
            {rows.map((appointment) => (
              <li key={appointment.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className="font-semibold">{names.get(appointment.patientId) ?? "Unknown patient"}</p>
                  <p className="text-sm text-muted">
                    {formatWhen(appointment.start)} · {appointment.durationMinutes} min · {appointment.reason}
                  </p>
                  {appointment.notes ? <p className="mt-1 text-sm">{appointment.notes}</p> : null}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <StatusPill status={appointment.status} />
                  <select
                    className={fieldClass}
                    value={appointment.status}
                    aria-label={`Status for ${names.get(appointment.patientId)}`}
                    onChange={(event) =>
                      updateAppointment(appointment.id, { status: event.target.value as AppointmentStatus })
                    }
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {status.replaceAll("_", " ")}
                      </option>
                    ))}
                  </select>
                  <button type="button" className="text-sm underline" onClick={() => removeAppointment(appointment.id)}>
                    Remove
                  </button>
                </div>
              </li>
            ))}
          </ul>
        </section>
        <form
          className="grid h-fit gap-4 border border-line bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!resolvedPatient || !reason.trim()) return;
            addAppointment({
              patientId: resolvedPatient,
              providerName: practice.physicianName,
              start: `${date}T${time}:00`,
              durationMinutes: Number(duration) || 30,
              reason: reason.trim(),
              status: "scheduled",
              notes: "",
            });
            setReason("");
          }}
        >
          <h2 className="font-display text-2xl">Add visit</h2>
          <Field label="Patient">
            <select className={fieldClass} value={resolvedPatient} onChange={(event) => setPatientId(event.target.value)}>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patientName(patient)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input className={fieldClass} type="date" value={date} onChange={(event) => setDate(event.target.value)} required />
          </Field>
          <Field label="Time">
            <input className={fieldClass} type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
          </Field>
          <Field label="Duration (minutes)">
            <input className={fieldClass} value={duration} onChange={(event) => setDuration(event.target.value)} />
          </Field>
          <Field label="Reason">
            <input className={fieldClass} value={reason} onChange={(event) => setReason(event.target.value)} required />
          </Field>
          <Button type="submit">Save visit</Button>
        </form>
      </div>
    </main>
  );
}
