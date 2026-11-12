"use client";

import { useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { visitTypeLabel } from "@/lib/rcm/chart";
import { patientName } from "@/lib/rcm/format";
import type { ConfirmationStatus, VisitType } from "@/lib/rcm/types";
import { DaySheet } from "@/components/admin/rcm/day-sheet";
import { ScheduleDayNav } from "@/components/admin/rcm/schedule-day-nav";
import { VisitCardActions } from "@/components/admin/rcm/visit-card-actions";
import { recordVisitHref } from "@/lib/rcm/record-visit";
import {
  Field,
  LoadingDesk,
  PageHeader,
  fieldClass,
  resolveClinicDayParam,
  useClinicDayReady,
  useClinicToday,
} from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

const visitTypes: VisitType[] = ["new", "follow_up", "procedure", "imaging_review", "post_op"];
const rooms = ["Room 1", "Room 2", "Procedure"];
const visitTimes = Array.from({ length: 12 * 4 + 1 }, (_, index) => {
  const total = 7 * 60 + index * 15;
  const hour = Math.floor(total / 60);
  const minute = String(total % 60).padStart(2, "0");
  const value = `${String(hour).padStart(2, "0")}:${minute}`;
  const hour12 = hour % 12 || 12;
  return { value, label: `${hour12}:${minute} ${hour < 12 ? "AM" : "PM"}` };
});

export function ScheduleDesk() {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const today = useClinicToday();
  const dayReady = useClinicDayReady();
  const { ready, appointments, patients, practice, addAppointment, updateAppointment, removeAppointment } = useRcm();
  const [patientId, setPatientId] = useState(params.get("patient") ?? "");
  const [bookingDateOverride, setBookingDateOverride] = useState("");
  const [time, setTime] = useState("09:00");
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState("30");
  const [visitType, setVisitType] = useState<VisitType>("follow_up");
  const [room, setRoom] = useState("Room 1");

  const names = useMemo(() => new Map(patients.map((patient) => [patient.id, patientName(patient)])), [patients]);
  const days = useMemo(
    () => [...new Set(appointments.map((appointment) => appointment.start.slice(0, 10)))].sort(),
    [appointments],
  );

  function setDay(next: string) {
    const query = new URLSearchParams(params.toString());
    if (next === today) query.delete("day");
    else query.set("day", next);
    const patient = query.get("patient");
    if (!patient) query.delete("patient");
    const suffix = query.toString();
    router.replace(suffix ? `${pathname}?${suffix}` : pathname, { scroll: false });
    setBookingDateOverride(next);
  }

  if (!ready || !dayReady) return <LoadingDesk />;

  const focus = resolveClinicDayParam(params.get("day"), today);
  const bookingDate = bookingDateOverride || focus;
  const resolvedPatient = patientId || patients[0]?.id || "";
  const rows = appointments.filter((appointment) => appointment.start.startsWith(focus)).sort((a, b) => a.start.localeCompare(b.start));

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Schedule"
        lede={`${practice.physicianName}. Confirm, check in, and room patients from the day sheet.`}
      />
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <DaySheet
          visits={rows}
          names={names}
          title={focus}
          empty="No visits on this day."
          recordHref={recordVisitHref}
          header={
            <ScheduleDayNav
              day={focus}
              today={today}
              markedDays={days}
              visitCount={rows.length}
              onChange={setDay}
            />
          }
          renderCorner={(appointment) => (
            <VisitCardActions
              visit={appointment}
              patientName={names.get(appointment.patientId) ?? "patient"}
              onStatus={(status) => updateAppointment(appointment.id, { status })}
              onConfirm={() =>
                updateAppointment(appointment.id, { confirmation: "confirmed" satisfies ConfirmationStatus })
              }
              onRemove={() => removeAppointment(appointment.id)}
            />
          )}
        />
        <form
          className="grid h-fit gap-4 rounded-2xl border border-line bg-card p-5 shadow-[0_16px_36px_-28px_rgb(7_30_54_/_0.45)] xl:sticky xl:top-6"
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
            setDay(bookingDate);
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
            <input
              className={fieldClass}
              type="date"
              value={bookingDate}
              onChange={(event) => setBookingDateOverride(event.target.value)}
              required
            />
          </Field>
          <Field label="Time">
            <select className={fieldClass} value={time} onChange={(event) => setTime(event.target.value)} required>
              {visitTimes.map((slot) => (
                <option key={slot.value} value={slot.value}>
                  {slot.label}
                </option>
              ))}
            </select>
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
