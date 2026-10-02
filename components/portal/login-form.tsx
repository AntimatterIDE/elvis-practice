"use client";

import { useActionState } from "react";
import { portalSignInAction } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

const initial = { error: undefined as string | undefined };

export function PortalLoginForm() {
  const [state, action, pending] = useActionState(portalSignInAction, initial);

  return (
    <form action={action} className="mt-6 grid gap-4">
      <label className="grid gap-2 text-sm font-medium" htmlFor="email">
        Email
        <Input id="email" name="email" type="email" autoComplete="username" required />
      </label>
      <label className="grid gap-2 text-sm font-medium" htmlFor="password">
        Password
        <Input id="password" name="password" type="password" autoComplete="current-password" required />
      </label>
      {state.error ? (
        <p role="alert" className="rounded-xl border border-emergency/30 bg-red-50 px-3 py-2 text-sm text-emergency">
          {state.error}
        </p>
      ) : null}
      <Button type="submit" disabled={pending} className="mt-1">
        {pending ? "Signing in…" : "Sign in"}
      </Button>
    </form>
  );
}
