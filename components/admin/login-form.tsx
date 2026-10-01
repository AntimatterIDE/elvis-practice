"use client";

import { useActionState } from "react";
import type { AdminFormState } from "@/app/admin/actions";
import { fieldClass } from "@/components/admin/rcm/ui";

const initial: AdminFormState = {};

export function LoginForm({
  action,
  defaultEmail = "",
  defaultPassword = "",
}: {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  defaultEmail?: string;
  defaultPassword?: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);

  return (
    <form action={formAction} className="mt-6 grid gap-4">
      <label className="grid gap-2 text-sm font-medium" htmlFor="email">
        Email
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={defaultEmail} className={fieldClass} />
      </label>
      <label className="grid gap-2 text-sm font-medium" htmlFor="password">
        Password
        <input id="password" name="password" type="password" autoComplete="current-password" required defaultValue={defaultPassword} className={fieldClass} />
      </label>
      {state.error ? (
        <p role="alert" className="rounded-xl border border-emergency/30 bg-red-50 px-3 py-2 text-sm text-emergency">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="mt-1 inline-flex items-center justify-center rounded-full bg-oxide px-5 py-3.5 text-sm font-semibold text-paper hover:bg-oxide-deep disabled:opacity-50">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
