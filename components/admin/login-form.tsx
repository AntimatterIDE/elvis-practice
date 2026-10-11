"use client";

import { useActionState, useState } from "react";
import { Eye, EyeOff } from "lucide-react";
import type { AdminFormState } from "@/app/admin/actions";

const initial: AdminFormState = {};

const field =
  "h-11 w-full rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white px-3 text-sm text-neutral-900 placeholder:text-neutral-400 transition-colors duration-150 hover:border-neutral-300 focus:border-neutral-900 focus-visible:outline-none disabled:opacity-50";

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
  const [reveal, setReveal] = useState(false);

  return (
    <form action={formAction} className="mt-6 space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="block text-sm font-medium text-neutral-900">
          Email
        </label>
        <input id="email" name="email" type="email" autoComplete="username" required defaultValue={defaultEmail} className={field} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="block text-sm font-medium text-neutral-900">
          Password
        </label>
        <div className="relative">
          <input
            id="password"
            name="password"
            type={reveal ? "text" : "password"}
            autoComplete="current-password"
            required
            defaultValue={defaultPassword}
            className={`${field} pr-11`}
          />
          <button
            type="button"
            className="absolute inset-y-0 right-0 inline-flex w-11 items-center justify-center text-neutral-500"
            aria-label={reveal ? "Hide password" : "Show password"}
            onClick={() => setReveal((current) => !current)}
          >
            {reveal ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      </div>
      {state.error ? (
        <p role="alert" className="rounded-[var(--rb-r-md,8px)] border border-emergency/30 bg-red-50 px-3 py-2 text-sm text-emergency">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex h-11 w-full items-center justify-center rounded-[var(--rb-r-lg,10px)] bg-[var(--rb-accent,#0a6e66)] text-sm font-medium text-[var(--rb-accent-fg,#f3f7fb)] hover:bg-oxide-ink disabled:opacity-60"
      >
        {pending ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
