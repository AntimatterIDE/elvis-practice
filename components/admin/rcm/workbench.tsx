"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { DaySheet } from "@/components/admin/rcm/day-sheet";
import { chartGaps, focusClinicDay } from "@/lib/rcm/chart";
import { formatClinicDay, formatTime, patientName } from "@/lib/rcm/format";
import { LoadingDesk, PageHeader, useClinicToday } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";
import { cn } from "@/lib/utils";

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
    .filter((appointment) => appointment.start.startsWith(focus) && appointment.status !== "cancelled")
    .sort((a, b) => a.start.localeCompare(b.start));
  const openTasks = tasks.filter((task) => task.status === "open" && task.due <= focus);
  const toConfirm = dayVisits.filter((appointment) => appointment.confirmation !== "confirmed" && appointment.status === "scheduled");
  const inOffice = dayVisits.filter((appointment) => appointment.status === "arrived" || appointment.status === "in_progress");
  const nextVisit = dayVisits.find((appointment) => appointment.status === "scheduled" || appointment.status === "arrived" || appointment.status === "in_progress");
  const unfinished = patients
    .map((patient) => ({ patient, gaps: chartGaps(patient) }))
    .filter((item) => item.gaps.length > 0);
  const gaps = unfinished.slice(0, 4);

  const queue = [
    ...toConfirm.map((appointment) => ({
      key: `call-${appointment.id}`,
      href: `/admin/operations/patients/${appointment.patientId}`,
      kicker: "Call",
      title: names.get(appointment.patientId) ?? "Unknown patient",
      detail: `Confirm ${formatTime(appointment.start)} · ${appointment.reason}`,
    })),
    ...openTasks.map((task) => ({
      key: task.id,
      href: `/admin/operations/patients/${task.patientId}`,
      kicker: "Task",
      title: task.title,
      detail: task.detail || names.get(task.patientId) || "Front desk",
    })),
    ...gaps.map(({ patient, gaps: items }) => ({
      key: patient.id,
      href: `/admin/operations/patients/${patient.id}`,
      kicker: "Chart",
      title: patientName(patient),
      detail: items.slice(0, 2).join(" · "),
    })),
  ];

  const pulse = [
    {
      href: "/admin/operations/scheduling",
      label: "Next",
      value: nextVisit ? formatTime(nextVisit.start) : "Clear",
      detail: nextVisit ? (names.get(nextVisit.patientId) ?? "Unknown patient") : "Nothing else on the board",
    },
    {
      href: "/admin/operations/scheduling",
      label: "In the office",
      value: String(inOffice.length),
      detail: inOffice.length ? inOffice.map((visit) => names.get(visit.patientId)).filter(Boolean).slice(0, 2).join(", ") : "No one has arrived",
    },
    {
      href: "/admin/operations/scheduling",
      label: "Still to confirm",
      value: String(toConfirm.length),
      detail: toConfirm.length ? "Waiting on a confirmation call" : "Nothing left to confirm",
    },
    {
      href: "/admin/operations/patients",
      label: "Charts open",
      value: String(unfinished.length),
      detail: unfinished[0] ? unfinished[0].gaps.slice(0, 2).join(" · ") : "Nothing missing on the charts",
    },
  ];

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title={focus === today ? "Today" : "Clinic day"}
        lede={`${formatClinicDay(focus)}. The rooms are across the day. Calls and unfinished charts sit beside them.`}
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
      <section className="mt-6 grid overflow-hidden rounded-3xl border border-line bg-card shadow-[0_16px_36px_-28px_rgb(7_30_54_/_0.45)] sm:grid-cols-2 xl:grid-cols-4">
        {pulse.map((item, index) => (
          <Link
            key={item.label}
            href={item.href}
            className={cn("px-5 py-4 transition hover:bg-mist/50", index > 0 && "border-line sm:border-l", index > 1 && "border-t xl:border-t-0")}
          >
            <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">{item.label}</p>
            <p className="mt-2 font-display text-3xl tracking-tight">{item.value}</p>
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-muted">{item.detail}</p>
          </Link>
        ))}
      </section>
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <DaySheet visits={dayVisits} names={names} empty="The schedule is clear." />
        <aside className="overflow-hidden rounded-3xl border border-line bg-card shadow-[0_16px_36px_-28px_rgb(7_30_54_/_0.45)]">
          <div className="flex items-end justify-between gap-3 border-b border-line px-5 py-4">
            <div>
              <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">Front desk</p>
              <h2 className="mt-1 font-display text-2xl tracking-tight">Needs you</h2>
            </div>
            <Link href="/admin/operations/tasks" className="text-sm underline">
              All tasks
            </Link>
          </div>
          <ul className="grid">
            {queue.length === 0 ? <li className="px-5 py-6 text-sm text-muted">Calls, tasks, and charts are caught up.</li> : null}
            {queue.map((item) => (
              <li key={item.key} className="border-t border-line first:border-t-0">
                <Link href={item.href} className="grid grid-cols-[4.5rem_1fr] gap-3 px-5 py-4 hover:bg-mist/40">
                  <span className="pt-0.5 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-oxide">{item.kicker}</span>
                  <span>
                    <span className="block font-semibold">{item.title}</span>
                    <span className="mt-0.5 block text-sm text-muted">{item.detail}</span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </aside>
      </div>
    </main>
  );
}
