"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { chartGaps, focusClinicDay, visitTypeLabel } from "@/lib/rcm/chart";
import { formatClinicDay, formatTime, patientName } from "@/lib/rcm/format";
import { LoadingDesk, PageHeader, Stat, StatusPill, useClinicToday, visitLabel } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

export function Workbench() {
  const { ready, patients, appointments, tasks } = useRcm();
  const today = useClinicToday();
  if (!ready) return <LoadingDesk />;

  const names = new Map(patients.map((patient) => [patient.id, patientName(patient)]));
  const focus = focusClinicDay(
    appointments.map((appointment) => appointment.start.slice(0, 10)),
    today,
  );
  const dayVisits = appointments
    .filter((appointment) => appointment.start.startsWith(focus))
    .sort((a, b) => a.start.localeCompare(b.start));
  const openTasks = tasks.filter((task) => task.status === "open" && task.due <= focus);
  const toConfirm = dayVisits.filter((appointment) => appointment.confirmation !== "confirmed" && appointment.status === "scheduled");
  const inOffice = dayVisits.filter((appointment) => appointment.status === "arrived" || appointment.status === "in_progress");
  const gaps = patients
    .map((patient) => ({ patient, gaps: chartGaps(patient) }))
    .filter((item) => item.gaps.length > 0)
    .slice(0, 4);

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title={focus === today ? "Today" : "Clinic day"}
        lede={`${formatClinicDay(focus)}. New patients come in through an intake link, or as a walk-in chart.`}
        action={
          <div className="flex flex-wrap gap-3">
            <Button asChild variant="secondary">
              <Link href="/admin/operations/intake">Send an intake link</Link>
            </Button>
            <Button asChild>
              <Link href="/admin/operations/scheduling">Schedule a visit</Link>
            </Button>
          </div>
        }
      />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Stat label="On the schedule" value={String(dayVisits.length)} detail={formatClinicDay(focus)} />
        <Stat label="Still to confirm" value={String(toConfirm.length)} detail="Calls the front desk still owes" />
        <Stat label="In the office" value={String(inOffice.length)} detail="Arrived or in a room" />
        <Stat label="Open tasks" value={String(openTasks.length)} detail="Due today or overdue" />
      </div>
      <div className="mt-8 grid items-start gap-6 xl:grid-cols-12">
        <section className="xl:col-span-7">
          <div className="flex items-end justify-between gap-3">
            <h2 className="font-display text-2xl">Schedule</h2>
            <Link href="/admin/operations/scheduling" className="text-sm underline">
              Full schedule
            </Link>
          </div>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {dayVisits.length === 0 ? (
              <li className="rounded-2xl border border-line bg-card px-4 py-5 text-sm text-muted sm:col-span-2">No visits on this day. The schedule is clear.</li>
            ) : null}
            {dayVisits.map((appointment) => (
              <li key={appointment.id} className="rounded-2xl border border-line bg-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold tabular-nums">{formatTime(appointment.start)}</p>
                    <p className="text-xs text-muted">{appointment.durationMinutes} min · {appointment.room}</p>
                  </div>
                  <StatusPill status={appointment.status} label={visitLabel(appointment.status)} />
                </div>
                <Link href={`/admin/operations/patients/${appointment.patientId}`} className="mt-3 block font-semibold hover:text-oxide">
                  {names.get(appointment.patientId) ?? "Unknown patient"}
                </Link>
                <p className="mt-1 text-sm text-muted">
                  {visitTypeLabel[appointment.visitType] ?? appointment.visitType} · {appointment.reason}
                </p>
                <div className="mt-3">
                  <StatusPill status={appointment.confirmation} label={visitLabel(appointment.confirmation)} />
                </div>
              </li>
            ))}
          </ul>
        </section>
        <div className="grid content-start gap-6 xl:col-span-5">
          <section>
            <div className="flex items-end justify-between gap-3">
              <h2 className="font-display text-2xl">Tasks</h2>
              <Link href="/admin/operations/tasks" className="text-sm underline">
                All tasks
              </Link>
            </div>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {openTasks.length === 0 ? <li className="rounded-2xl border border-dashed border-line px-4 py-4 text-sm text-muted">Nothing due.</li> : null}
              {openTasks.map((task) => (
                <li key={task.id}>
                  <Link href={`/admin/operations/patients/${task.patientId}`} className="block rounded-2xl border border-line bg-card p-3 text-sm">
                    <span className="block font-semibold">{task.title}</span>
                    <span className="text-muted">{task.detail}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
          <section>
            <h2 className="font-display text-2xl">Charts to finish</h2>
            <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
              {patients.length === 0 ? <li className="rounded-2xl border border-dashed border-line px-4 py-4 text-sm text-muted">No charts yet.</li> : null}
              {patients.length > 0 && gaps.length === 0 ? (
                <li className="rounded-2xl border border-dashed border-line px-4 py-4 text-sm text-muted">Intake, coverage, and allergies are on file.</li>
              ) : null}
              {gaps.map(({ patient, gaps: items }) => (
                <li key={patient.id}>
                  <Link href={`/admin/operations/patients/${patient.id}`} className="block rounded-2xl border border-line bg-card p-3 text-sm">
                    <span className="block font-semibold">{patientName(patient)}</span>
                    <span className="text-muted">{items.slice(0, 2).join(" · ")}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </main>
  );
}
