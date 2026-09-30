"use client";

import { useActionState } from "react";
import type { AdminFormState } from "@/app/admin/actions";

const initial: AdminFormState = {};

export function AdminStateForm({
  action,
  children,
}: {
  action: (state: AdminFormState, formData: FormData) => Promise<AdminFormState>;
  children: React.ReactNode;
}) {
  const [state, formAction, pending] = useActionState(action, initial);
  return (
    <form action={formAction} className="mt-6 grid gap-4">
      {children}
      {state.error ? (
        <p role="alert" className="text-sm text-emergency">
          {state.error}
        </p>
      ) : null}
      {state.message ? (
        <p role="status" className="text-sm text-pine">
          {state.message}
        </p>
      ) : null}
      <span className="sr-only">{pending ? "Saving" : ""}</span>
    </form>
  );
}
