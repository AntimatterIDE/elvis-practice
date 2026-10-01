"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { createIntakeInviteAction, intakeSnapshotAction, issuePortalLoginAction, saveIntakeFormAction } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";
import { CHART_FIELDS } from "@/lib/portal/defaults";
import type { IntakeAdminSnapshot, IntakeField, IntakeFieldType, IntakeMap } from "@/lib/portal/types";
import { Field, PageHeader, fieldClass } from "@/components/admin/rcm/ui";
import { formatDay } from "@/lib/rcm/format";

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

  const origin = typeof window === "undefined" ? "" : window.location.origin;

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Patient intake"
        lede="Shape the questions, send a private link, and open a chart when the form comes back. A portal login is a separate step you can hand to the patient."
      />
      <p className="mt-4 text-sm text-muted">
        {snapshot.storage === "database"
          ? "Submitted forms are stored in the practice database."
          : "Submitted forms are stored on this server. Connect Supabase and run the portal migration to keep them in the practice database."}
      </p>
      <div className="mt-8 grid gap-8 xl:grid-cols-[1.2fr_0.8fr]">
        <section className="grid gap-4 border border-line bg-card p-4">
          <h2 className="font-display text-2xl">Form</h2>
          <Field label="Title">
            <input className={fieldClass} value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} />
          </Field>
          <Field label="Introduction">
            <textarea
              className={fieldClass}
              rows={3}
              value={form.introduction}
              onChange={(event) => setForm({ ...form, introduction: event.target.value })}
            />
          </Field>
          <ol className="grid gap-4">
            {form.fields.map((field, index) => (
              <li key={field.id} className="grid gap-3 border border-line p-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="text-xs uppercase tracking-[0.14em] text-muted">Question {index + 1}</p>
                  <div className="flex gap-3 text-sm">
                    <button type="button" className="underline" onClick={() => move(field.id, -1)}>
                      Up
                    </button>
                    <button type="button" className="underline" onClick={() => move(field.id, 1)}>
                      Down
                    </button>
                    {field.locked ? null : (
                      <button
                        type="button"
                        className="underline"
                        onClick={() => setForm((current) => ({ ...current, fields: current.fields.filter((item) => item.id !== field.id) }))}
                      >
                        Remove
                      </button>
                    )}
                  </div>
                </div>
                <Field label="Label">
                  <input className={fieldClass} value={field.label} onChange={(event) => updateField(field.id, { label: event.target.value })} />
                </Field>
                <Field label="Help text">
                  <input className={fieldClass} value={field.help} onChange={(event) => updateField(field.id, { help: event.target.value })} />
                </Field>
                <div className="grid gap-3 sm:grid-cols-2">
                  <Field label="Type">
                    <select
                      className={fieldClass}
                      value={field.type}
                      disabled={field.locked}
                      onChange={(event) => updateField(field.id, { type: event.target.value as IntakeFieldType })}
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
                      onChange={(event) => updateField(field.id, { mapsTo: (event.target.value || null) as IntakeMap | null })}
                    >
                      <option value="">Additional question</option>
                      {CHART_FIELDS.filter((chartField) => chartField.id === field.mapsTo || !form.fields.some((item) => item.mapsTo === chartField.id)).map(
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
                    onChange={(event) => updateField(field.id, { required: event.target.checked })}
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
                        updateField(field.id, {
                          options: event.target.value.split("\n").map((option) => option.trim()).filter(Boolean),
                        })
                      }
                    />
                  </Field>
                ) : null}
              </li>
            ))}
          </ol>
          <div className="flex flex-wrap gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() =>
                setForm((current) => ({
                  ...current,
                  fields: [
                    ...current.fields,
                    {
                      id: `q_${crypto.randomUUID().slice(0, 8)}`,
                      label: "New question",
                      help: "",
                      type: "short_text",
                      required: false,
                      options: [],
                      mapsTo: null,
                      locked: false,
                    },
                  ],
                }))
              }
            >
              Add question
            </Button>
            <Button type="button" onClick={() => void onSave()} disabled={pending}>
              {pending ? "Saving…" : "Save form"}
            </Button>
          </div>
          {saved ? <p className="text-sm text-oxide">{saved}</p> : null}
        </section>
        <div className="grid gap-6">
          <form onSubmit={onInvite} className="grid gap-4 border border-line bg-card p-4">
            <h2 className="font-display text-2xl">Send a link</h2>
            <p className="text-sm text-muted">The link expires in 14 days and can be submitted once.</p>
            <Field label="Patient name">
              <input className={fieldClass} value={recipientName} onChange={(event) => setRecipientName(event.target.value)} />
            </Field>
            <Field label="Email for the note">
              <input className={fieldClass} type="email" value={recipientEmail} onChange={(event) => setRecipientEmail(event.target.value)} />
            </Field>
            <Button type="submit">Create link</Button>
            {freshPath ? <LinkCard path={freshPath} origin={origin} email={snapshot.invites[0]?.recipientEmail ?? ""} name={snapshot.invites[0]?.recipientName ?? ""} /> : null}
          </form>
          <section className="border border-line bg-card p-4">
            <h2 className="font-display text-2xl">Links</h2>
            <ul className="mt-3 divide-y divide-line">
              {snapshot.invites.length === 0 ? <li className="py-3 text-sm text-muted">No links yet.</li> : null}
              {snapshot.invites.map((invite) => (
                <li key={invite.id} className="py-3 text-sm">
                  <span className="block font-semibold">{invite.recipientName || "Unnamed link"}</span>
                  <span className="text-muted">
                    {invite.status} · {formatDay(invite.createdAt)}
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
          <section className="border border-line bg-card p-4">
            <h2 className="font-display text-2xl">Submitted forms</h2>
            <ul className="mt-3 divide-y divide-line">
              {snapshot.submissions.length === 0 ? <li className="py-3 text-sm text-muted">Nothing submitted yet.</li> : null}
              {snapshot.submissions.map((submission) => {
                const login = issued[submission.patientId];
                return (
                  <li key={submission.id} className="py-3 text-sm">
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

function LinkCard({ path, origin, email, name }: { path: string; origin: string; email: string; name: string }) {
  const url = `${origin}${path}`;
  const mailto = email
    ? `mailto:${email}?subject=${encodeURIComponent("Your form for The Alignment Clinic")}&body=${encodeURIComponent(
        `Hello${name ? ` ${name}` : ""},\n\nPlease complete this form before your visit:\n${url}\n`,
      )}`
    : "";
  return (
    <div className="mt-3 grid gap-2 bg-mist p-3">
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
    <div className="mt-3 grid gap-2 border border-oxide/30 bg-mint/40 p-3">
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
