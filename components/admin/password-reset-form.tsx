"use client";

import { useActionState } from "react";
import type { AdminFormState } from "@/app/admin/actions";
import { fieldClass } from "@/components/admin/rcm/ui";

const initial: AdminFormState = {};

export function ForgotPasswordForm({
  action,
}: {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="mt-6 grid gap-4">
      <label className="grid gap-2 text-sm font-medium" htmlFor="email">
        Email
        <input id="email" name="email" type="email" autoComplete="username" required className={fieldClass} />
      </label>
      {state.error ? (
        <p role="alert" className="rounded-xl border border-emergency/30 bg-red-50 px-3 py-2 text-sm text-emergency">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="rounded-xl border border-line bg-paper px-3 py-2 text-sm text-ink">
          {state.message}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex items-center justify-center rounded-full bg-oxide px-5 py-3.5 text-sm font-semibold text-paper hover:bg-oxide-deep disabled:opacity-50"
      >
        {pending ? "Sending…" : "Send reset link"}
      </button>
    </form>
  );
}

export function NewPasswordForm({
  action,
}: {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="mt-6 grid gap-4">
      <label className="grid gap-2 text-sm font-medium" htmlFor="password">
        New password
        <input id="password" name="password" type="password" autoComplete="new-password" required minLength={8} className={fieldClass} />
      </label>
      <label className="grid gap-2 text-sm font-medium" htmlFor="confirm">
        Confirm password
        <input id="confirm" name="confirm" type="password" autoComplete="new-password" required minLength={8} className={fieldClass} />
      </label>
      {state.error ? (
        <p role="alert" className="rounded-xl border border-emergency/30 bg-red-50 px-3 py-2 text-sm text-emergency">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="mt-1 inline-flex items-center justify-center rounded-full bg-oxide px-5 py-3.5 text-sm font-semibold text-paper hover:bg-oxide-deep disabled:opacity-50"
      >
        {pending ? "Saving…" : "Save password"}
      </button>
    </form>
  );
}
