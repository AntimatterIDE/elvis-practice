"use client";

import { useActionState } from "react";
import { completeRecovery, type RecoveryState } from "@/app/auth/confirm/actions";

const initial: RecoveryState = {};

export function ContinueForm({ tokenHash = "", code = "" }: { tokenHash?: string; code?: string }) {
  const [state, action, pending] = useActionState(completeRecovery, initial);

  return (
    <form action={action} className="mt-6 grid gap-4">
      {tokenHash ? <input type="hidden" name="token_hash" value={tokenHash} /> : null}
      {code ? <input type="hidden" name="code" value={code} /> : null}
      {state.error ? (
        <p role="alert" className="rounded-xl border border-emergency/30 bg-red-50 px-3 py-2 text-sm text-emergency">
          {state.error}
        </p>
      ) : null}
      <button
        type="submit"
        disabled={pending}
        className="inline-flex items-center justify-center rounded-full bg-oxide px-5 py-3.5 text-sm font-semibold text-paper hover:bg-oxide-deep disabled:opacity-50"
      >
        {pending ? "Checking the link…" : "Continue"}
      </button>
    </form>
  );
}
