"use client";

import { useActionState } from "react";
import { submitIntakeAction } from "@/app/portal/actions";
import { sexLabel } from "@/lib/portal/defaults";
import type { IntakeField, PublicIntake } from "@/lib/portal/types";
import { emergencyNote } from "@/lib/site";

const initial = { error: undefined as string | undefined, done: false };

export function IntakeForm({ token, form }: { token: string; form: PublicIntake }) {
  const [state, action, pending] = useActionState(submitIntakeAction, initial);

  if (state.done) {
    return (
      <div className="mt-8 border border-line bg-mint/40 p-5">
        <h2 className="font-display text-3xl">The practice has your form.</h2>
        <p className="mt-3 text-sm leading-relaxed">
          A chart will be opened from what you sent. If the practice gives you a portal login, it arrives separately.
          This page is not for emergencies.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 grid gap-5">
      <input type="hidden" name="token" value={token} />
      {form.fields.map((field) => (
        <Question key={field.id} field={field} />
      ))}
      {state.error ? (
        <p role="alert" className="text-sm text-emergency">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="justify-self-start bg-oxide px-5 py-3 text-sm text-paper disabled:opacity-50">
        {pending ? "Sending…" : "Submit form"}
      </button>
      <p className="text-sm leading-relaxed text-muted">{emergencyNote}</p>
    </form>
  );
}

function Question({ field }: { field: IntakeField }) {
  const name = `a.${field.id}`;
  const inputId = `field-${field.id}`;
  return (
    <div className="grid gap-2 text-sm">
      <label htmlFor={inputId}>
        {field.label}
        {field.required ? <span className="text-emergency"> *</span> : null}
      </label>
      {field.help ? <span className="text-muted">{field.help}</span> : null}
      <Control field={field} name={name} inputId={inputId} />
    </div>
  );
}

function Control({ field, name, inputId }: { field: IntakeField; name: string; inputId: string }) {
  const className = "w-full border border-line bg-card px-3 py-2.5 text-base text-ink outline-none focus:border-oxide";
  if (field.type === "long_text") {
    return <textarea id={inputId} name={name} required={field.required} rows={4} className={className} />;
  }
  if (field.type === "select") {
    return (
      <select id={inputId} name={name} required={field.required} defaultValue="" className={className}>
        <option value="" disabled>
          Choose one
        </option>
        {field.options.map((option) => (
          <option key={option} value={option}>
            {field.mapsTo === "sex" ? sexLabel(option) : option}
          </option>
        ))}
      </select>
    );
  }
  if (field.type === "yes_no") {
    return (
      <span className="flex gap-4">
        <label className="flex items-center gap-2" htmlFor={inputId}>
          <input id={inputId} type="radio" name={name} value="yes" required={field.required} /> Yes
        </label>
        <label className="flex items-center gap-2">
          <input type="radio" name={name} value="no" required={field.required} /> No
        </label>
      </span>
    );
  }
  if (field.type === "acknowledge") {
    return (
      <span className="flex items-start gap-2">
        <input id={inputId} type="checkbox" name={name} value="yes" required={field.required} className="mt-1" />
        <span>Yes</span>
      </span>
    );
  }
  const type = field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "date" ? "date" : "text";
  return <input id={inputId} name={name} type={type} required={field.required} className={className} />;
}
