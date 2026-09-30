"use client";

import { useActionState } from "react";
import type { AdminFormState } from "@/app/admin/actions";

const initial: AdminFormState = {};

export function MfaForm({
  action,
  factorId,
}: {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  factorId: string;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="mt-8 grid gap-4">
      <input type="hidden" name="factorId" value={factorId} />
      <label className="grid gap-2 text-sm" htmlFor="code">
        Six-digit code
        <input id="code" name="code" inputMode="numeric" autoComplete="one-time-code" required className="border border-line bg-card px-3 py-3 text-base" />
      </label>
      {state.error ? (
        <p role="alert" className="text-sm text-emergency">
          {state.error}
        </p>
      ) : null}
      <button disabled={pending} className="justify-self-start bg-oxide px-5 py-3 text-sm text-paper">
        Verify
      </button>
    </form>
  );
}
