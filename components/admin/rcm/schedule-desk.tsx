"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { focusClinicDay, visitTypeLabel } from "@/lib/rcm/chart";
import { formatClinicDay, formatTime, patientName } from "@/lib/rcm/format";
import type { AppointmentStatus, ConfirmationStatus, VisitType } from "@/lib/rcm/types";
import { Field, LoadingDesk, PageHeader, StatusPill, fieldClass, useClinicToday, visitLabel } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

const statuses: AppointmentStatus[] = ["scheduled", "arrived", "in_progress", "completed", "cancelled", "no_show"];
const visitTypes: VisitType[] = ["new", "follow_up", "procedure", "imaging_review", "post_op"];
const rooms = ["Room 1", "Room 2", "Procedure"];

export function ScheduleDesk() {
  const params = useSearchParams();
  const today = useClinicToday();
  const { ready, appointments, patients, practice, addAppointment, updateAppointment, removeAppointment } = useRcm();
  const [patientId, setPatientId] = useState(params.get("patient") ?? "");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("09:00");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("30");
  const [visitType, setVisitType] = useState<VisitType>("follow_up");
  const [room, setRoom] = useState("Room 1");
  const [pickedDay, setPickedDay] = useState("");

  const names = useMemo(() => new Map(patients.map((patient) => [patient.id, patientName(patient)])), [patients]);
  const days = useMemo(
    () => [...new Set(appointments.map((appointment) => appointment.start.slice(0, 10)))].sort(),
    [appointments],
  );

  if (!ready) return <LoadingDesk />;

  const focus = pickedDay || focusClinicDay(days, today);
  const bookingDate = date || focus;
  const resolvedPatient = patientId || patients[0]?.id || "";
  const rows = appointments.filter((appointment) => appointment.start.startsWith(focus)).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Schedule"
        lede={`${practice.physicianName}. Confirm, check in, and room patients from the day sheet.`}
      />
      <div className="mt-8 flex gap-2 overflow-x-auto pb-2">
        {days.map((day) => (
          <button
            key={day}
            type="button"
            onClick={() => setPickedDay(day)}
            className={`shrink-0 rounded-2xl border px-4 py-2.5 text-left text-sm ${day === focus ? "border-oxide bg-mint" : "border-line bg-card"}`}
          >
            <span className="block font-semibold">{formatClinicDay(day).split(",")[0]}</span>
            <span className="text-muted">{day.slice(5)}</span>
          </button>
        ))}
      </div>
      <div className="mt-6 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <section>
          <h2 className="font-display text-2xl">{formatClinicDay(focus)}</h2>
          <ul className="mt-4 overflow-hidden rounded-2xl border border-line bg-card">
            {rows.length === 0 ? <li className="px-4 py-5 text-sm text-muted">No visits on this day.</li> : null}
            {rows.map((appointment) => (
              <li key={appointment.id} className="grid gap-3 border-b border-line px-4 py-4 last:border-b-0">
                <div className="grid gap-3 sm:grid-cols-[5.5rem_1fr] sm:items-start">
                  <div>
                    <p className="font-semibold tabular-nums">{formatTime(appointment.start)}</p>
                    <p className="text-xs text-muted">{appointment.durationMinutes} min</p>
                  </div>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <Link href={`/admin/operations/patients/${appointment.patientId}`} className="font-semibold hover:text-oxide">
                        {names.get(appointment.patientId) ?? "Unknown patient"}
                      </Link>
                      <p className="text-sm text-muted">
                        {visitTypeLabel[appointment.visitType] ?? appointment.visitType} · {appointment.reason} · {appointment.room}
                      </p>
                      {appointment.notes ? <p className="mt-1 text-sm">{appointment.notes}</p> : null}
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusPill status={appointment.confirmation} label={visitLabel(appointment.confirmation)} />
                      <StatusPill status={appointment.status} label={visitLabel(appointment.status)} />
                    </div>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2 sm:pl-[5.5rem]">
                  {appointment.confirmation !== "confirmed" ? (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => updateAppointment(appointment.id, { confirmation: "confirmed" satisfies ConfirmationStatus })}
                    >
                      Confirm
                    </Button>
                  ) : null}
                  <select
                    className={`${fieldClass} max-w-40`}
                    value={appointment.status}
                    aria-label={`Status for ${names.get(appointment.patientId)}`}
                    onChange={(event) => updateAppointment(appointment.id, { status: event.target.value as AppointmentStatus })}
                  >
                    {statuses.map((status) => (
                      <option key={status} value={status}>
                        {visitLabel(status)}
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
            const start = `${bookingDate}T${time}:00`;
            addAppointment({
              patientId: resolvedPatient,
              providerName: practice.physicianName,
              start,
              durationMinutes: Number(duration) || 30,
              reason: reason.trim(),
              status: "scheduled",
              notes: "",
              visitType,
              room,
              confirmation: "unconfirmed",
            });
            setPickedDay(bookingDate);
            setReason("");
          }}
        >
          <h2 className="font-display text-2xl">Book a visit</h2>
          <Field label="Patient">
            <select className={fieldClass} value={resolvedPatient} onChange={(event) => setPatientId(event.target.value)}>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patientName(patient)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Visit type">
            <select className={fieldClass} value={visitType} onChange={(event) => setVisitType(event.target.value as VisitType)}>
              {visitTypes.map((type) => (
                <option key={type} value={type}>
                  {visitTypeLabel[type]}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Date">
            <input className={fieldClass} type="date" value={bookingDate} onChange={(event) => setDate(event.target.value)} required />
          </Field>
          <Field label="Time">
            <input className={fieldClass} type="time" value={time} onChange={(event) => setTime(event.target.value)} required />
          </Field>
          <Field label="Duration (minutes)">
            <input className={fieldClass} value={duration} onChange={(event) => setDuration(event.target.value)} />
          </Field>
          <Field label="Room">
            <select className={fieldClass} value={room} onChange={(event) => setRoom(event.target.value)}>
              {rooms.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
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
