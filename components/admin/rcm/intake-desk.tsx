"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createIntakeInviteAction, intakeSnapshotAction, issuePortalLoginAction, saveIntakeFormAction } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";
import { CHART_FIELDS, sexLabel } from "@/lib/portal/defaults";
import { intakeBlocks, intakeFieldSpan, intakeSections } from "@/lib/portal/form-layout";
import type { IntakeAdminSnapshot, IntakeField, IntakeFieldType, IntakeMap } from "@/lib/portal/types";
import { Field, PageHeader, fieldClass } from "@/components/admin/rcm/ui";
import { formatDay } from "@/lib/rcm/format";
import { cn } from "@/lib/utils";

const types: { id: IntakeFieldType; label: string }[] = [
  { id: "short_text", label: "Short text" },
  { id: "long_text", label: "Long text" },
  { id: "email", label: "Email" },
  { id: "phone", label: "Phone" },
  { id: "date", label: "Date" },
  { id: "select", label: "Choices" },
  { id: "yes_no", label: "Yes or no" },
  { id: "acknowledge", label: "Checkbox" },
];

export function IntakeDesk({ initial }: { initial: IntakeAdminSnapshot }) {
  const [snapshot, setSnapshot] = useState(initial);
  const [form, setForm] = useState(initial.form);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState("");
  const [pending, setPending] = useState(false);
  const [recipientEmail, setRecipientEmail] = useState("");
  const [recipientName, setRecipientName] = useState("");
  const [freshPath, setFreshPath] = useState("");
  const [issued, setIssued] = useState<Record<string, { email: string; password: string }>>({});
  const [openId, setOpenId] = useState<string | null>(null);
  const [origin, setOrigin] = useState("");

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void intakeSnapshotAction().then((result) => {
        if ("snapshot" in result && result.snapshot) setSnapshot(result.snapshot);
      });
    }, 15000);
    return () => window.clearInterval(timer);
  }, []);

  function updateField(id: string, patch: Partial<IntakeField>) {
    setSaved("");
    setForm((current) => ({
      ...current,
      fields: current.fields.map((field) => (field.id === id ? { ...field, ...patch } : field)),
    }));
  }

  function move(id: string, direction: -1 | 1) {
    setForm((current) => {
      const index = current.fields.findIndex((field) => field.id === id);
      const next = index + direction;
      if (index < 0 || next < 0 || next >= current.fields.length) return current;
      const fields = [...current.fields];
      const [item] = fields.splice(index, 1);
      if (!item) return current;
      fields.splice(next, 0, item);
      return { ...current, fields };
    });
  }

  async function onSave() {
    setPending(true);
    setError("");
    const result = await saveIntakeFormAction(form);
    setPending(false);
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("snapshot" in result && result.snapshot) {
      setSnapshot(result.snapshot);
      setForm(result.snapshot.form);
      setSaved("Form saved.");
    }
  }

  async function onInvite(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    const result = await createIntakeInviteAction({ email: recipientEmail, name: recipientName });
    if ("error" in result && result.error) {
      setError(result.error);
      return;
    }
    if ("snapshot" in result && result.snapshot && "path" in result) {
      setSnapshot(result.snapshot);
      setFreshPath(result.path);
      setRecipientEmail("");
      setRecipientName("");
    }
  }

  async function onLogin(patientId: string, email: string) {
    setError("");
    const result = await issuePortalLoginAction({ patientId, email });
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setIssued((current) => ({ ...current, [patientId]: { email: result.email, password: result.password } }));
    const refreshed = await intakeSnapshotAction();
    if ("snapshot" in refreshed && refreshed.snapshot) setSnapshot(refreshed.snapshot);
  }

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Patient intake"
        lede="Shape the questions, send a private link, and open a chart when the form comes back. A portal login is a separate step you can hand to the patient."
      />
      <p className="mt-4 text-sm leading-relaxed text-muted">
        {snapshot.storage === "database"
          ? "Submitted forms are stored in the practice database."
          : "Submitted forms are stored on this server. Connect Supabase and run the portal migration to keep them in the practice database."}
      </p>
      <div className="mt-6 grid items-start gap-6 xl:grid-cols-[minmax(0,1fr)_22rem]">
        <div className="grid min-w-0 gap-5">
          <section className="rounded-3xl border border-line bg-card p-5 sm:p-7">
            <p className="kicker text-royal">What the patient sees</p>
            <input
              aria-label="Form title"
              className="mt-2 w-full bg-transparent font-display text-4xl tracking-tight text-ink outline-none"
              value={form.title}
              onChange={(event) => setForm({ ...form, title: event.target.value })}
            />
            <textarea
              aria-label="Introduction"
              className="mt-3 w-full resize-none bg-transparent text-base leading-relaxed text-muted outline-none"
              rows={3}
              value={form.introduction}
              onChange={(event) => setForm({ ...form, introduction: event.target.value })}
            />
          </section>
          {intakeBlocks(form.fields).map((group, index) => (
            <section
              key={`${group.key}-${index}`}
              className={cn(
                "rounded-3xl border bg-card p-5 sm:p-7",
                group.key === "safety" ? "border-emergency/25 bg-red-50/40" : "border-line",
              )}
            >
              <h2 className="font-display text-3xl tracking-tight">{intakeSections[group.key].title}</h2>
              <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">{intakeSections[group.key].lede}</p>
              <div className="mt-6 grid grid-cols-1 gap-4 sm:grid-cols-6">
                {group.fields.map((field) => (
                  <QuestionCard
                    key={field.id}
                    field={field}
                    open={openId === field.id}
                    fields={form.fields}
                    className={openId === field.id ? "sm:col-span-6" : intakeFieldSpan(field)}
                    onOpen={() => setOpenId(openId === field.id ? null : field.id)}
                    onUpdate={(patch) => updateField(field.id, patch)}
                    onMove={(direction) => move(field.id, direction)}
                    onRemove={() => {
                      setOpenId(null);
                      setForm((current) => ({ ...current, fields: current.fields.filter((item) => item.id !== field.id) }));
                    }}
                  />
                ))}
              </div>
            </section>
          ))}
          <div className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-2xl border border-line bg-paper/95 px-4 py-3 shadow-[0_16px_36px_-28px_rgb(7_30_54_/_0.55)] backdrop-blur">
            <Button
              type="button"
              variant="secondary"
              onClick={() => {
                const id = `q_${crypto.randomUUID().slice(0, 8)}`;
                setOpenId(id);
                setForm((current) => ({
                  ...current,
                  fields: [
                    ...current.fields,
                    {
                      id,
                      label: "New question",
                      help: "",
                      type: "short_text",
                      required: false,
                      options: [],
                      mapsTo: null,
                      locked: false,
                    },
                  ],
                }));
              }}
            >
              Add question
            </Button>
            <Button type="button" onClick={() => void onSave()} disabled={pending}>
              {pending ? "Saving…" : "Save form"}
            </Button>
            {saved ? <p className="text-sm text-royal">{saved}</p> : null}
          </div>
        </div>
        <div className="grid content-start gap-4 xl:sticky xl:top-6">
          <form onSubmit={onInvite} className="grid gap-4 rounded-2xl border border-gold/30 bg-card p-5">
            <div>
              <h2 className="font-display text-2xl tracking-tight">Send a form</h2>
              <p className="mt-1 text-sm leading-relaxed text-muted">One private link. It expires in 14 days and can be submitted once.</p>
            </div>
            <Field label="Patient name">
              <input className={fieldClass} value={recipientName} onChange={(event) => setRecipientName(event.target.value)} />
            </Field>
            <Field label="Email for the note">
              <input className={fieldClass} type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} />
            </Field>
            <Button type="submit">Create link</Button>
            {freshPath ? <LinkCard path={freshPath} origin={origin} email={snapshot.invites[0]?.recipientEmail ?? ""} name={snapshot.invites[0]?.recipientName ?? ""} /> : null}
          </form>
          <section className="rounded-2xl border border-line bg-card p-5">
            <h2 className="font-display text-2xl tracking-tight">Links out</h2>
            <ul className="mt-3 grid gap-3">
              {snapshot.invites.length === 0 ? <li className="rounded-2xl bg-mist px-4 py-3 text-sm text-muted">No links yet.</li> : null}
              {snapshot.invites.map((invite) => (
                <li key={invite.id} className="rounded-2xl bg-mist px-4 py-3 text-sm">
                  <span className="block font-semibold">{invite.recipientName || "Unnamed link"}</span>
                  <span className="text-muted">
                    {invite.status === "open" ? "Waiting on the patient" : invite.status === "completed" ? "Submitted" : "Expired"} · {formatDay(invite.createdAt)}
                    {invite.recipientEmail ? ` · ${invite.recipientEmail}` : ""}
                  </span>
                  {invite.status === "open" ? <LinkCard path={invite.path} origin={origin} email={invite.recipientEmail} name={invite.recipientName} /> : null}
                  {invite.patientId ? (
                    <Link href={`/admin/operations/patients/${invite.patientId}`} className="mt-2 inline-block underline">
                      Open chart
                    </Link>
                  ) : null}
                </li>
              ))}
            </ul>
          </section>
          <section className="rounded-2xl border border-line bg-card p-5">
            <h2 className="font-display text-2xl tracking-tight">Charts opened</h2>
            <ul className="mt-3 grid gap-3">
              {snapshot.submissions.length === 0 ? <li className="rounded-2xl bg-mist px-4 py-3 text-sm text-muted">Nothing submitted yet.</li> : null}
              {snapshot.submissions.map((submission) => {
                const login = issued[submission.patientId];
                return (
                  <li key={submission.id} className="rounded-2xl bg-mist px-4 py-3 text-sm">
                    <Link href={`/admin/operations/patients/${submission.patientId}`} className="font-semibold underline">
                      {submission.patientName}
                    </Link>
                    <span className="mt-1 block text-muted">{formatDay(submission.createdAt)}</span>
                    <button type="button" className="mt-2 underline" onClick={() => void onLogin(submission.patientId, submission.email)}>
                      {submission.hasLogin ? "Reset portal password" : "Create portal login"}
                    </button>
                    {login ? <CredentialCard email={login.email} password={login.password} origin={origin} /> : null}
                  </li>
                );
              })}
            </ul>
          </section>
        </div>
      </div>
      {error ? (
        <p role="alert" className="mt-4 text-sm text-emergency">
          {error}
        </p>
      ) : null}
    </main>
  );
}

function QuestionCard({
  field,
  open,
  fields,
  className,
  onOpen,
  onUpdate,
  onMove,
  onRemove,
}: {
  field: IntakeField;
  open: boolean;
  fields: IntakeField[];
  className: string;
  onOpen: () => void;
  onUpdate: (patch: Partial<IntakeField>) => void;
  onMove: (direction: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className={cn("min-w-0 rounded-2xl border bg-paper p-3", open ? "border-gold ring-4 ring-gold/15" : "border-transparent", className)}>
      <button type="button" className="w-full text-left" aria-expanded={open} onClick={onOpen}>
        <FieldFace field={field} />
      </button>
      {open ? (
        <div className="mt-4 grid gap-3 border-t border-line pt-4">
          <div className="flex flex-wrap gap-3 text-sm">
            <button type="button" className="underline" onClick={() => onMove(-1)}>
              Move up
            </button>
            <button type="button" className="underline" onClick={() => onMove(1)}>
              Move down
            </button>
            {field.locked ? <span className="text-muted">Kept on every form</span> : (
              <button type="button" className="underline" onClick={onRemove}>
                Remove
              </button>
            )}
          </div>
          <Field label="Label">
            <input className={fieldClass} value={field.label} onChange={(event) => onUpdate({ label: event.target.value })} />
          </Field>
          <Field label="Help text">
            <input className={fieldClass} value={field.help} onChange={(event) => onUpdate({ help: event.target.value })} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="Type">
              <select
                className={fieldClass}
                value={field.type}
                disabled={field.locked}
                onChange={(event) => onUpdate({ type: event.target.value as IntakeFieldType })}
              >
                {types.map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Saves into">
              <select
                className={fieldClass}
                value={field.mapsTo ?? ""}
                disabled={field.locked}
                onChange={(event) => onUpdate({ mapsTo: (event.target.value || null) as IntakeMap | null })}
              >
                <option value="">Additional question</option>
                {CHART_FIELDS.filter((chartField) => chartField.id === field.mapsTo || !fields.some((item) => item.mapsTo === chartField.id)).map(
                  (chartField) => (
                    <option key={chartField.id} value={chartField.id}>
                      {chartField.label}
                    </option>
                  ),
                )}
              </select>
            </Field>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={field.required}
              disabled={field.locked}
              onChange={(event) => onUpdate({ required: event.target.checked })}
            />
            Required
          </label>
          {field.type === "select" && field.mapsTo !== "sex" ? (
            <Field label="Choices, one per line">
              <textarea
                className={fieldClass}
                rows={3}
                value={field.options.join("\n")}
                onChange={(event) =>
                  onUpdate({
                    options: event.target.value.split("\n").map((option) => option.trim()).filter(Boolean),
                  })
                }
              />
            </Field>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function FieldFace({ field }: { field: IntakeField }) {
  const choices = field.type === "yes_no" ? ["yes", "no"] : field.options;
  if (field.type === "acknowledge") {
    return (
      <span className="flex items-start gap-3 rounded-2xl border border-emergency/20 bg-card px-4 py-4">
        <span className="mt-0.5 size-5 rounded border border-line bg-paper" aria-hidden />
        <span>
          <span className="block text-sm font-semibold leading-snug">{field.label}</span>
          {field.help ? <span className="mt-1 block text-sm leading-relaxed text-muted">{field.help}</span> : null}
        </span>
      </span>
    );
  }
  if (field.type === "yes_no" || (field.type === "select" && choices.length > 0 && choices.length <= 6)) {
    return (
      <span className="block">
        <span className="text-sm font-medium text-ink">
          {field.label}
          {field.required ? <span className="kicker ml-2 text-royal">Required</span> : null}
        </span>
        {field.help ? <span className="mt-1 block text-sm text-muted">{field.help}</span> : null}
        <span className={cn("mt-2 grid gap-2", choices.length > 2 ? "sm:grid-cols-2" : "grid-cols-2")}>
          {choices.map((option) => (
            <span key={option} className="rounded-xl border border-line bg-paper px-3 py-3 text-center text-sm font-semibold">
              {field.type === "yes_no" ? (option === "yes" ? "Yes" : "No") : field.mapsTo === "sex" ? sexLabel(option) : option}
            </span>
          ))}
        </span>
      </span>
    );
  }
  return (
    <span className="block">
      <span className="text-sm font-medium text-ink">
        {field.label}
        {field.required ? <span className="kicker ml-2 text-royal">Required</span> : null}
      </span>
      <span
        className={cn(
          "mt-2 block rounded-xl border border-line bg-paper px-3.5 text-sm text-muted/70",
          field.type === "long_text" ? "min-h-28 py-3" : "py-2.5",
        )}
      >
        {field.type === "long_text" ? "A few sentences" : field.type === "date" ? "Date" : "Answer"}
      </span>
      {field.help ? <span className="mt-2 block text-sm leading-relaxed text-muted">{field.help}</span> : null}
    </span>
  );
}

function LinkCard({ path, origin, email, name }: { path: string; origin: string; email: string; name: string }) {
  const url = `${origin}${path}`;
  const mailto = email
    ? `mailto:${email}?subject=${encodeURIComponent("Your form for The Alignment Clinic")}&body=${encodeURIComponent(
        `Hello${name ? ` ${name}` : ""},\n\nPlease complete this form before your visit:\n${url}\n`,
      )}`
    : "";
  return (
    <div className="mt-3 grid gap-2 rounded-xl bg-mist p-3">
      <p className="break-all text-sm">{url}</p>
      <div className="flex flex-wrap gap-3 text-sm">
        <button type="button" className="underline" onClick={() => void navigator.clipboard.writeText(url)}>
          Copy link
        </button>
        {mailto ? (
          <a className="underline" href={mailto}>
            Email link
          </a>
        ) : null}
      </div>
    </div>
  );
}

function CredentialCard({ email, password, origin }: { email: string; password: string; origin: string }) {
  const loginUrl = `${origin}/portal/login`;
  const text = `Portal: ${loginUrl}\nEmail: ${email}\nPassword: ${password}`;
  return (
    <div className="mt-3 grid gap-2 rounded-xl border border-gold/30 bg-gold/10/50 p-3">
      <p>Show this password once. It cannot be looked up later. You can reset it.</p>
      <p className="break-all">
        {loginUrl}
        <br />
        {email}
        <br />
        <span className="font-semibold">{password}</span>
      </p>
      <div className="flex flex-wrap gap-3">
        <button type="button" className="underline" onClick={() => void navigator.clipboard.writeText(text)}>
          Copy login
        </button>
        <a
          className="underline"
          href={`mailto:${email}?subject=${encodeURIComponent("Your Alignment Clinic portal")}&body=${encodeURIComponent(text)}`}
        >
          Email login
        </a>
      </div>
    </div>
  );
}
