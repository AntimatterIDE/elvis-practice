"use client";

import { useActionState } from "react";
import { submitInquiry, type ContactState } from "@/app/(site)/contact/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const initialState: ContactState = { status: "idle", message: "" };

export function ContactForm() {
  const [state, formAction, pending] = useActionState(submitInquiry, initialState);

  return (
    <form action={formAction} className="grid gap-5" noValidate>
      <p className="border border-line bg-card px-4 py-3 text-sm leading-relaxed text-pine">
        Do not include medical information. That means no symptoms, history, images, medicines, or
        insurance numbers. This form is an administrative inquiry only.
      </p>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="name">Name</Label>
          <Input id="name" name="name" autoComplete="name" required />
          {state.fieldErrors?.name ? (
            <p className="text-sm text-emergency" role="alert">
              {state.fieldErrors.name}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="reason">Reason</Label>
          <select
            id="reason"
            name="reason"
            defaultValue="appointment"
            className="w-full border border-line bg-card px-3 py-3 text-base"
          >
            <option value="appointment">Request a call about scheduling</option>
            <option value="general">General question</option>
          </select>
        </div>
      </div>
      <div className="grid gap-5 md:grid-cols-2">
        <div className="grid gap-2">
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" autoComplete="email" />
          {state.fieldErrors?.email ? (
            <p className="text-sm text-emergency" role="alert">
              {state.fieldErrors.email}
            </p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="phone">Phone</Label>
          <Input id="phone" name="phone" type="tel" autoComplete="tel" />
        </div>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="note">Note, optional</Label>
        <Textarea
          id="note"
          name="note"
          maxLength={500}
          placeholder="A short non-medical note, such as the best time for a call."
        />
        {state.fieldErrors?.note ? (
          <p className="text-sm text-emergency" role="alert">
            {state.fieldErrors.note}
          </p>
        ) : null}
      </div>
      <div className="hidden" aria-hidden="true">
        <label htmlFor="website">Website</label>
        <input id="website" name="website" tabIndex={-1} autoComplete="off" />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="justify-self-start bg-oxide px-5 py-3 text-sm text-paper disabled:opacity-60"
      >
        {pending ? "Checking…" : "Submit inquiry"}
      </button>
      {state.message ? (
        <p
          role={state.status === "error" ? "alert" : "status"}
          className="max-w-xl text-sm leading-relaxed text-ink"
        >
          {state.message}
        </p>
      ) : null}
    </form>
  );
}
