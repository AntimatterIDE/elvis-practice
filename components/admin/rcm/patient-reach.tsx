"use client";

import { useState } from "react";
import { callPatient, emailPatient, textPatient } from "@/app/admin/bird/actions";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/admin/rcm/ui";

export function PatientReach({ email, phone }: { email: string; phone: string }) {
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<{ ok: boolean; message: string }>) {
    setPending(true);
    const result = await action();
    setMessage(result.message);
    setPending(false);
  }

  return (
    <form
      className="mt-5 rounded-2xl border border-line bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        void run(() => emailPatient({ email, text }));
      }}
    >
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">Contact</p>
      <p className="mt-1 text-sm text-muted">Email, text, or call the number on this chart. The message is not saved in the chart.</p>
      <textarea className={`${fieldClass} mt-3 min-h-20`} value={text} maxLength={320} placeholder="Appointment reminder" onChange={(event) => setText(event.target.value)} />
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="submit" disabled={pending || !email}>Email</Button>
        <Button type="button" variant="secondary" disabled={pending || !phone} onClick={() => void run(() => textPatient({ phone, text }))}>
          Text
        </Button>
        <Button type="button" variant="secondary" disabled={pending || !phone} onClick={() => void run(() => callPatient({ phone, text }))}>
          Call
        </Button>
      </div>
      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
    </form>
  );
}
