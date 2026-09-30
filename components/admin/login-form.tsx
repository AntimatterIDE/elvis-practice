"use client";

import { useActionState } from "react";
import type { AdminFormState } from "@/app/admin/actions";

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
    <form action={formAction} className="mt-8 grid gap-4">
      <label className="grid gap-2 text-sm" htmlFor="email">
        Email
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={defaultEmail} className="border border-line bg-card px-3 py-3 text-base" />
      </label>
      <label className="grid gap-2 text-sm" htmlFor="password">
        Password
        <input id="password" name="password" type="password" autoComplete="current-password" required defaultValue={defaultPassword} className="border border-line bg-card px-3 py-3 text-base" />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-emergency">
          {state.error}
        </p>
      ) : null}
      <button type="submit" disabled={pending} className="justify-self-start bg-oxide px-5 py-3 text-sm text-paper">
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
