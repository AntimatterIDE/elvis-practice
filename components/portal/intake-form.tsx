"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { submitIntakeAction } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";
import { controlClass as sharedControlClass } from "@/components/ui/control";
import { sexLabel } from "@/lib/portal/defaults";
import { intakeBlocks as blocks, intakeFieldSpan as span, intakeSections as sections } from "@/lib/portal/form-layout";
import type { IntakeField, PublicIntake } from "@/lib/portal/types";
import { emergencyNote } from "@/lib/site";
import { cn } from "@/lib/utils";

const initial = { error: undefined as string | undefined, done: false };

const controlClass = `${sharedControlClass} max-w-full scroll-mb-28`;

const autoComplete: Partial<Record<string, string>> = {
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

function answerLabel(field: IntakeField, value: string) {
  if (!value) return "Not answered";
  if (field.type === "yes_no") return value === "yes" ? "Yes" : "No";
  if (field.mapsTo === "sex") return sexLabel(value);
  if (field.type === "acknowledge") return "Yes";
  return value;
}

export function IntakeForm({ token, form }: { token: string; form: PublicIntake }) {
  const [state, action, pending] = useActionState(submitIntakeAction, initial);
  const [step, setStep] = useState(0);
  const [furthest, setFurthest] = useState(0);
  const [showInvalid, setShowInvalid] = useState(false);
  const [review, setReview] = useState<{ id: string; label: string; value: string }[]>([]);
  const formRef = useRef<HTMLFormElement>(null);
  const sectionRef = useRef<HTMLElement>(null);
  const groups = blocks(form.fields);
  const minutes = Math.max(2, Math.round(form.fields.length / 5));
  const reviewing = step >= groups.length;
  const current = groups[step];

  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "smooth" });
    if (!showInvalid) return;
    setShowInvalid(false);
    validateCurrent();
  }, [step, showInvalid]);

  function readReview() {
    const data = new FormData(formRef.current ?? undefined);
    setReview(
      form.fields.map((field) => ({
        id: field.id,
        label: field.label,
        value: answerLabel(field, String(data.get(`a.${field.id}`) ?? "")),
      })),
    );
  }

  function validateCurrent() {
    const section = sectionRef.current;
    if (!section) return true;
    const fields = [...section.querySelectorAll("input, textarea, select")] as HTMLInputElement[];
    for (const field of fields) {
      if (!field.checkValidity()) {
        field.reportValidity();
        return false;
      }
    }
    return true;
  }

  function findInvalid() {
    const form = formRef.current;
    if (!form) return null;
    const sections = [...form.querySelectorAll<HTMLElement>("[data-intake-step]")];
    for (let index = 0; index < sections.length; index += 1) {
      const seen = new Set<string>();
      const fields = [...sections[index].querySelectorAll("input, textarea, select")] as HTMLInputElement[];
      for (const field of fields) {
        if (!field.required || field.disabled) continue;
        if (field.type === "radio") {
          if (seen.has(field.name)) continue;
          seen.add(field.name);
          if (!form.querySelector(`input[name="${CSS.escape(field.name)}"]:checked`)) return index;
          continue;
        }
        if (field.type === "checkbox") {
          if (!field.checked) return index;
          continue;
        }
        if (!field.value.trim()) return index;
      }
    }
    return null;
  }

  function goTo(index: number) {
    if (index === step || index > furthest) return;
    if (index > step) {
      const invalid = findInvalid();
      if (invalid !== null && invalid < index) {
        setShowInvalid(true);
        setStep(invalid);
        return;
      }
    }
    setStep(index);
  }

  function openReview() {
    const invalid = findInvalid();
    if (invalid !== null) {
      setShowInvalid(true);
      setStep(invalid);
      return;
    }
    readReview();
    setFurthest(groups.length);
    setStep(groups.length);
  }

  function goNext() {
    if (!validateCurrent()) return;
    const next = Math.min(step + 1, groups.length);
    setFurthest((currentFurthest) => Math.max(currentFurthest, next));
    if (next === groups.length) readReview();
    setStep(next);
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    const invalid = findInvalid();
    if (invalid === null) return;
    event.preventDefault();
    setShowInvalid(true);
    setStep(invalid);
  }

  if (state.done) {
    return (
      <div className="mt-8 rounded-3xl border border-line bg-card p-6 shadow-[0_18px_40px_-32px_rgb(7_30_54_/_0.55)] sm:p-8">
        <p className="kicker text-royal">Received</p>
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
    <form ref={formRef} action={action} onSubmit={onSubmit} className="mt-8 grid min-w-0 gap-5">
      <input type="hidden" name="token" value={token} />
      <div className="rounded-3xl border border-line bg-card p-4 card-shadow sm:p-5">
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="font-medium text-ink">{reviewing ? "Review" : sections[current.key].title}</p>
          <p className="text-muted">
            {reviewing ? groups.length : step + 1} of {groups.length}
          </p>
        </div>
        <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-mist" aria-hidden="true">
          <div
            className="h-full rounded-full bg-gold transition-[width]"
            style={{ width: `${(Math.min(reviewing ? groups.length : step + 1, groups.length) / Math.max(groups.length, 1)) * 100}%` }}
          />
        </div>
        <ol className="mt-4 flex flex-wrap gap-2">
          {groups.map((group, index) => {
            const reached = index <= furthest;
            const active = !reviewing && index === step;
            return (
              <li key={`${group.key}-${index}`}>
                <button
                  type="button"
                  disabled={!reached}
                  onClick={() => goTo(index)}
                  className={cn(
                    "rounded-full px-3 py-1.5 text-xs font-semibold",
                    active ? "bg-gold text-paper" : reached ? "bg-gold/10 text-royal" : "bg-mist text-muted",
                  )}
                  aria-current={active ? "step" : undefined}
                >
                  {sections[group.key].title}
                </button>
              </li>
            );
          })}
          <li>
            <button
              type="button"
              disabled={furthest < groups.length}
              onClick={openReview}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-semibold",
                reviewing ? "bg-gold text-paper" : furthest >= groups.length ? "bg-gold/10 text-royal" : "bg-mist text-muted",
              )}
              aria-current={reviewing ? "step" : undefined}
            >
              Review
            </button>
          </li>
        </ol>
        <p className="mt-3 text-sm text-muted">About {minutes} minutes. One part at a time. Nothing is published on the website.</p>
      </div>
      {state.error ? (
        <p role="alert" className="rounded-2xl border border-emergency/30 bg-red-50 px-4 py-3 text-sm text-emergency">
          {state.error}
        </p>
      ) : null}
      {groups.map((group, index) => (
        <section
          key={`${group.key}-${index}`}
          ref={index === step ? sectionRef : undefined}
          data-intake-step={index}
          hidden={index !== step}
          className={cn(
            "rounded-3xl border bg-card p-5 card-shadow sm:p-7",
            group.key === "safety" ? "border-emergency/25 bg-red-50/40" : "border-line",
          )}
        >
          <h2 className="font-display text-3xl tracking-tight">{sections[group.key].title}</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted">{sections[group.key].lede}</p>
          <div className="mt-6 grid w-full min-w-0 grid-cols-1 gap-x-4 gap-y-5 sm:grid-cols-6">
            {group.fields.map((field) => (
              <Question key={field.id} field={field} className={group.fields.length === 1 ? "min-w-0 sm:col-span-6" : span(field)} />
            ))}
          </div>
        </section>
      ))}
      {reviewing ? (
        <section className="rounded-3xl border border-line bg-card p-5 card-shadow sm:p-7">
          <h2 className="font-display text-3xl tracking-tight">Check your answers</h2>
          <p className="mt-2 text-sm leading-relaxed text-muted">The link works once. Go back if something should change, then send the form.</p>
          <dl className="mt-6 divide-y divide-line">
            {review.map((item) => (
              <div key={item.id} className="grid gap-1 py-3 sm:grid-cols-[12rem_1fr] sm:gap-4">
                <dt className="text-sm text-muted">{item.label}</dt>
                <dd className="text-sm font-medium text-ink">{item.value}</dd>
              </div>
            ))}
          </dl>
        </section>
      ) : null}
      <div className="sticky bottom-0 z-10 -mx-5 flex gap-3 border-t border-line bg-paper/95 px-5 py-3 backdrop-blur">
        {step > 0 ? (
          <Button type="button" variant="secondary" className="flex-1 sm:flex-none" onClick={() => setStep((currentStep) => currentStep - 1)}>
            Back
          </Button>
        ) : null}
        {reviewing ? (
          <Button type="submit" disabled={pending} className="flex-1 sm:ml-auto sm:flex-none">
            {pending ? "Sending…" : "Send to the practice"}
          </Button>
        ) : (
          <Button type="button" className="flex-1 sm:ml-auto sm:flex-none" onClick={goNext}>
            {step === groups.length - 1 ? "Review answers" : "Continue"}
          </Button>
        )}
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
          <input id={inputId} type="checkbox" name={name} value="yes" required={field.required} className="mt-1 size-5 accent-gold" />
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
                className="flex cursor-pointer items-center justify-center rounded-xl border border-line bg-paper px-3 py-3.5 text-center text-sm font-semibold has-[:checked]:border-gold has-[:checked]:bg-gold/10 has-[:focus-visible]:ring-4 has-[:focus-visible]:ring-gold/20"
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
        {field.required ? <span className="kicker ml-2 text-royal">Required</span> : null}
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
        {field.required ? <span className="kicker ml-2 text-royal">Required</span> : null}
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
