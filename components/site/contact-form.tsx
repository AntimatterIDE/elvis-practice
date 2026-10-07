"use client";

import { useActionState } from "react";
import { submitInquiry, type ContactState } from "@/app/(site)/contact/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";

const initialState: ContactState = { status: "idle", message: "" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitInquiry, initialState);
  const emailDescribedBy = state.fieldErrors?.email ? "email-error reach-hint" : "reach-hint";
  const phoneDescribedBy = "reach-hint";

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <p className="rounded-2xl border border-gold/20 bg-gold/10 px-4 py-3 text-sm leading-relaxed text-ink">
        Do not include medical information. That means no symptoms, history, images, medicines, or
        insurance numbers. This form is an administrative inquiry only.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" required aria-invalid={state.fieldErrors?.name ? true : undefined} aria-describedby={state.fieldErrors?.name ? "name-error" : undefined} />
          {state.fieldErrors?.name ? (
            <p id="name-error" className="text-sm text-emergency" role="alert">
              {state.fieldErrors.name}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reason">Reason</Label>
          <Select id="reason" name="reason" defaultValue="appointment">
            <option value="appointment">Request a call about scheduling</option>
            <option value="general">General question</option>
          </Select>
        </div>
      </div>
      <p id="reach-hint" className="text-sm leading-relaxed text-muted">
        Add an email address or a phone number.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            aria-describedby={emailDescribedBy}
            aria-invalid={state.fieldErrors?.email ? true : undefined}
          />
          {state.fieldErrors?.email ? (
            <p id="email-error" className="text-sm text-emergency" role="alert">
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" aria-describedby={phoneDescribedBy} />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="note">Note, optional</Label>
        <Textarea
          id="note"
          name="note"
          maxLength={500}
          placeholder="A short non-medical note, such as the best time for a call."
          aria-invalid={state.fieldErrors?.note ? true : undefined}
          aria-describedby={state.fieldErrors?.note ? "note-error" : undefined}
        />
        {state.fieldErrors?.note ? (
          <p id="note-error" className="text-sm text-emergency" role="alert">
            {state.fieldErrors.note}
          </p>
        ) : null}
      </div>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <Button type="submit" disabled={pending} className="justify-self-start">
        {pending ? "Checking…" : "Submit inquiry"}
      </Button>
      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className={
            state.status === "error"
              ? "max-w-xl text-sm leading-relaxed text-emergency"
              : "max-w-xl text-sm leading-relaxed text-ink"
          }
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
