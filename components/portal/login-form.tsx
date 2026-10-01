"use client";

import { useActionState } from "react";
import { portalSignInAction } from "@/app/portal/actions";

const initial = { error: undefined as string | undefined };

const controlClass =
  "w-full rounded-xl border border-line bg-paper px-3.5 py-3.5 text-base text-ink outline-none transition focus:border-oxide focus:bg-card focus:ring-4 focus:ring-oxide/15";

export function PortalLoginForm() {
  const [state, action, pending] = useActionState(portalSignInAction, initial);

  return (
    <form action={action} className="mt-6 grid gap-4">
      <label className="grid gap-2 text-sm font-medium" htmlFor="email">
        Email
        <input id="email" name="email" type="email" autoComplete="username" required className={controlClass} />
      </label>
      <label className="grid gap-2 text-sm font-medium" htmlFor="password">
        Password
        <input
          id="password"
          name="password"
          type="password"
          autoComplete="current-password"
          required
          className={controlClass}
        />
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
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
