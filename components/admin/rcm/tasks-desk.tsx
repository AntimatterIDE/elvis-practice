"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatDay, patientName } from "@/lib/rcm/format";
import { Field, LoadingDesk, PageHeader, fieldClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

export function TasksDesk() {
  const { ready, tasks, patients, addTask, setTaskStatus } = useRcm();
  const [patientId, setPatientId] = useState("");
  const [title, setTitle] = useState("");
  const [detail, setDetail] = useState("");
  const [due, setDue] = useState("2026-09-30");
  const [showDone, setShowDone] = useState(false);

  if (!ready) return <LoadingDesk />;

  const names = new Map(patients.map((patient) => [patient.id, patientName(patient)]));
  const rows = tasks
    .filter((task) => (showDone ? true : task.status === "open"))
    .sort((a, b) => a.due.localeCompare(b.due) || a.title.localeCompare(b.title));
  const resolvedPatient = patientId || patients[0]?.id || "";

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Tasks"
        lede="Confirmations, missing intake, interpreters, and anything the front desk owes before the visit."
      />
      <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_18rem]">
        <section>
          <label className="mb-4 flex items-center gap-2 text-sm">
            <input type="checkbox" checked={showDone} onChange={(event) => setShowDone(event.target.checked)} />
            Show completed
          </label>
          <ul className="divide-y divide-line border-y border-line">
            {rows.length === 0 ? <li className="py-4 text-sm text-muted">No open tasks.</li> : null}
            {rows.map((task) => (
              <li key={task.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
                <div>
                  <p className={task.status === "done" ? "text-muted line-through" : "font-semibold"}>{task.title}</p>
                  <p className="text-sm text-muted">
                    <Link href={`/admin/operations/patients/${task.patientId}`} className="underline">
                      {names.get(task.patientId) ?? "Unknown patient"}
                    </Link>
                    {" · "}
                    Due {formatDay(task.due)}
                  </p>
                  {task.detail ? <p className="mt-1 text-sm">{task.detail}</p> : null}
                </div>
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => setTaskStatus(task.id, task.status === "open" ? "done" : "open")}
                >
                  {task.status === "open" ? "Mark done" : "Reopen"}
                </Button>
              </li>
            ))}
          </ul>
        </section>
        <form
          className="grid h-fit gap-4 border border-line bg-card p-4"
          onSubmit={(event) => {
            event.preventDefault();
            if (!resolvedPatient || !title.trim()) return;
            addTask({
              patientId: resolvedPatient,
              title: title.trim(),
              detail: detail.trim(),
              due,
            });
            setTitle("");
            setDetail("");
          }}
        >
          <h2 className="font-display text-2xl">Add task</h2>
          <Field label="Patient">
            <select className={fieldClass} value={resolvedPatient} onChange={(event) => setPatientId(event.target.value)}>
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patientName(patient)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Task">
            <input className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} required />
          </Field>
          <Field label="Detail">
            <input className={fieldClass} value={detail} onChange={(event) => setDetail(event.target.value)} />
          </Field>
          <Field label="Due">
            <input className={fieldClass} type="date" value={due} onChange={(event) => setDue(event.target.value)} required />
          </Field>
          <Button type="submit">Save task</Button>
        </form>
      </div>
    </main>
  );
}
