"use client";

import { useActionState } from "react";
import { submitIntakeAction } from "@/app/portal/actions";
import { sexLabel } from "@/lib/portal/defaults";
import type { IntakeField, IntakeMap, PublicIntake } from "@/lib/portal/types";
import { emergencyNote } from "@/lib/site";
import { cn } from "@/lib/utils";

const initial = { error: undefined as string | undefined, done: false };

const controlClass =
  "w-full max-w-full rounded-xl border border-line bg-paper px-3.5 py-3.5 text-base text-ink outline-none transition placeholder:text-muted/50 focus:border-oxide focus:bg-card focus:ring-4 focus:ring-oxide/15";

const sections = {
  you: {
    title: "About you",
    lede: "This is the name and date of birth on your chart.",
  },
  reach: {
    title: "How we reach you",
    lede: "We use this the day of your visit. A portal login, if the practice sends one, goes to this email.",
  },
  coverage: {
    title: "Insurance",
    lede: "Bring the card to the visit. Leave this blank if you are paying yourself.",
  },
  emergency: {
    title: "If we cannot reach you",
    lede: "Someone we can call. This is not your referring physician.",
  },
  pharmacy: {
    title: "Pharmacy",
    lede: "Where a prescription should go, if you need one.",
  },
  visit: {
    title: "Why you are coming",
    lede: "A few sentences is enough. Please do not attach photos.",
  },
  other: {
    title: "A few more questions",
    lede: "The practice added these for your visit.",
  },
  safety: {
    title: "Before you send",
    lede: "This form does not reach a clinician in real time.",
  },
} as const;

type SectionKey = keyof typeof sections;

const mappedSection: Record<IntakeMap, SectionKey> = {
  firstName: "you",
  lastName: "you",
  preferredName: "you",
  dateOfBirth: "you",
  sex: "you",
  phone: "reach",
  email: "reach",
  address: "reach",
  city: "reach",
  state: "reach",
  postalCode: "reach",
  payerName: "coverage",
  memberId: "coverage",
  emergencyName: "emergency",
  emergencyPhone: "emergency",
  emergencyRelation: "emergency",
  pharmacyName: "pharmacy",
  pharmacyPhone: "pharmacy",
};

const autoComplete: Partial<Record<IntakeMap | string, string>> = {
  firstName: "given-name",
  lastName: "family-name",
  preferredName: "nickname",
  dateOfBirth: "bday",
  email: "email",
  phone: "tel",
  address: "street-address",
  city: "address-level2",
  state: "address-level1",
  postalCode: "postal-code",
};

function sectionKey(field: IntakeField): SectionKey {
  if (field.type === "acknowledge") return "safety";
  if (field.mapsTo) return mappedSection[field.mapsTo];
  if (field.type === "long_text" || field.id === "reasonForVisit") return "visit";
  return "other";
}

function blocks(fields: IntakeField[]) {
  const safety = fields.filter((field) => field.type === "acknowledge");
  const rest = fields.filter((field) => field.type !== "acknowledge");
  const grouped: { key: SectionKey; fields: IntakeField[] }[] = [];
  for (const field of rest) {
    const key = sectionKey(field);
    const last = grouped[grouped.length - 1];
    if (last?.key === key) last.fields.push(field);
    else grouped.push({ key, fields: [field] });
  }
  if (safety.length) grouped.push({ key: "safety", fields: safety });
  return grouped;
}

function span(field: IntakeField) {
  if (field.type === "long_text" || field.type === "acknowledge" || field.type === "yes_no") return "min-w-0 sm:col-span-6";
  if (field.type === "select") return "min-w-0 sm:col-span-6";
  if (field.mapsTo === "address" || field.mapsTo === "preferredName") return "min-w-0 sm:col-span-6";
  if (field.mapsTo === "city" || field.mapsTo === "state" || field.mapsTo === "postalCode") return "min-w-0 sm:col-span-2";
  return "min-w-0 sm:col-span-3";
}

export function IntakeForm({ token, form }: { token: string; form: PublicIntake }) {
  const [state, action, pending] = useActionState(submitIntakeAction, initial);
  const groups = blocks(form.fields);
  const minutes = Math.max(2, Math.round(form.fields.length / 5));

  if (state.done) {
    return (
      <div className="mt-8 rounded-3xl border border-line bg-card p-6 shadow-[0_18px_40px_-32px_rgb(7_30_54_/_0.55)] sm:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-oxide">Received</p>
        <h2 className="mt-2 font-display text-4xl tracking-tight">The practice has your form.</h2>
        <p className="mt-3 max-w-prose text-base leading-relaxed text-muted">
          A chart will be opened from what you sent. You do not need to fill this out again.
        </p>
        <ol className="mt-6 grid gap-3 text-sm leading-relaxed">
          <li className="rounded-2xl bg-mist px-4 py-3">Bring a photo ID and your insurance card to the visit.</li>
          <li className="rounded-2xl bg-mist px-4 py-3">A portal login, if the practice sends one, arrives as a separate message.</li>
          <li className="rounded-2xl bg-mist px-4 py-3">Call the practice if a phone number or pharmacy should change.</li>
        </ol>
        <p className="mt-6 text-sm leading-relaxed text-muted">{emergencyNote}</p>
      </div>
    );
  }

  return (
    <form action={action} className="mt-8 grid min-w-0 gap-5">
      <input type="hidden" name="token" value={token} />
      <p className="text-sm text-muted">About {minutes} minutes. Answers stay with the practice and are not published on the website.</p>
      <nav aria-label="Form sections" className="sticky top-0 z-20 -mx-5 overflow-x-auto border-b border-line bg-paper/90 px-5 py-3 backdrop-blur">
        <ol className="flex w-max gap-2">
          {groups.map((group, index) => (
            <li key={`${group.key}-${index}`}>
              <a
                href={`#section-${index}`}
                className="inline-flex whitespace-nowrap rounded-full border border-line bg-card px-3 py-1.5 text-xs font-semibold text-ink hover:border-oxide"
              >
                {sections[group.key].title}
              </a>
            </li>
          ))}
        </ol>
      </nav>
      {state.error ? (
        <p role="alert" className="rounded-2xl border border-emergency/30 bg-red-50 px-4 py-3 text-sm text-emergency">
          {state.error}
        </p>
      ) : null}
      {groups.map((group, index) => (
        <section
          key={`${group.key}-${index}`}
          id={`section-${index}`}
          className={cn(
            "scroll-mt-24 rounded-3xl border bg-card p-5 shadow-[0_18px_40px_-32px_rgb(7_30_54_/_0.55)] sm:p-7",
            group.key === "safety" ? "border-emergency/25 bg-red-50/40" : "border-line",
          )}
        >
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="min-w-0 font-display text-2xl tracking-tight">{sections[group.key].title}</h2>
            <p className="shrink-0 text-xs font-semibold uppercase tracking-[0.16em] text-muted">
              {index + 1} of {groups.length}
            </p>
          </div>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">{sections[group.key].lede}</p>
          <div className="mt-6 grid w-full min-w-0 grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-6">
            {group.fields.map((field) => (
              <Question key={field.id} field={field} className={group.fields.length === 1 ? "min-w-0 sm:col-span-6" : span(field)} />
            ))}
          </div>
        </section>
      ))}
      <div className="flex flex-col gap-4 rounded-3xl border border-line bg-card p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
        <p className="max-w-md text-sm leading-relaxed text-muted">The link works once. You can change answers until you send the form.</p>
        <button
          type="submit"
          disabled={pending}
          className="inline-flex items-center justify-center rounded-full bg-oxide px-6 py-3.5 text-sm font-semibold text-paper hover:bg-oxide-deep disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send to the practice"}
        </button>
      </div>
      <p className="text-sm leading-relaxed text-muted">{emergencyNote}</p>
    </form>
  );
}

function Question({ field, className }: { field: IntakeField; className?: string }) {
  const name = `a.${field.id}`;
  const inputId = `field-${field.id}`;
  if (field.type === "acknowledge") {
    return (
      <div className={className}>
        <label htmlFor={inputId} className="flex items-start gap-3 rounded-2xl border border-emergency/20 bg-card px-4 py-4">
          <input id={inputId} type="checkbox" name={name} value="yes" required={field.required} className="mt-1 size-5 accent-oxide" />
          <span>
            <span className="block text-sm font-semibold leading-snug">{field.label}</span>
            {field.help ? <span className="mt-1 block text-sm leading-relaxed text-muted">{field.help}</span> : null}
          </span>
        </label>
      </div>
    );
  }
  if (field.type === "yes_no" || (field.type === "select" && field.options.length > 0 && field.options.length <= 6)) {
    return (
      <fieldset className={className}>
        <Legend field={field} />
        <div className={cn("mt-2 grid gap-2", field.options.length > 2 || field.type === "select" ? "sm:grid-cols-2" : "grid-cols-2")}>
          {(field.type === "yes_no" ? ["yes", "no"] : field.options).map((option, index) => {
            const id = index === 0 ? inputId : `${inputId}-${index}`;
            const label = field.type === "yes_no" ? (option === "yes" ? "Yes" : "No") : field.mapsTo === "sex" ? sexLabel(option) : option;
            return (
              <label
                key={option}
                htmlFor={id}
                className="flex cursor-pointer items-center justify-center rounded-xl border border-line bg-paper px-3 py-3.5 text-center text-sm font-semibold has-[:checked]:border-oxide has-[:checked]:bg-mint has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-oxide/20"
              >
                <input id={id} type="radio" name={name} value={option} required={field.required} className="sr-only" />
                {label}
              </label>
            );
          })}
        </div>
      </fieldset>
    );
  }
  return (
    <div className={cn("grid content-start gap-2", className)}>
      <label htmlFor={inputId} className="text-sm font-medium text-ink">
        {field.label}
        {field.required ? <span className="ml-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-oxide">Required</span> : null}
      </label>
      <Control field={field} name={name} inputId={inputId} />
      {field.help ? <p className="text-sm leading-relaxed text-muted">{field.help}</p> : null}
    </div>
  );
}

function Legend({ field }: { field: IntakeField }) {
  return (
    <>
      <legend className="text-sm font-medium text-ink">
        {field.label}
        {field.required ? <span className="ml-2 text-[0.65rem] font-semibold uppercase tracking-[0.14em] text-oxide">Required</span> : null}
      </legend>
      {field.help ? <p className="mt-1 text-sm leading-relaxed text-muted">{field.help}</p> : null}
    </>
  );
}

function Control({ field, name, inputId }: { field: IntakeField; name: string; inputId: string }) {
  const complete = autoComplete[field.mapsTo ?? field.id];
  if (field.type === "long_text") {
    return <textarea id={inputId} name={name} required={field.required} rows={5} className={controlClass} />;
  }
  if (field.type === "select") {
    return (
      <select id={inputId} name={name} required={field.required} defaultValue="" className={controlClass}>
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
  const type = field.type === "email" ? "email" : field.type === "phone" ? "tel" : field.type === "date" ? "date" : "text";
  return (
    <input
      id={inputId}
      name={name}
      type={type}
      required={field.required}
      autoComplete={complete}
      inputMode={field.type === "phone" ? "tel" : field.mapsTo === "postalCode" ? "numeric" : undefined}
      className={controlClass}
    />
  );
}
