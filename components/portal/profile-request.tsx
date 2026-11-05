"use client";

import { useState } from "react";
import { sendPortalMessageAction } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";
import { controlClass } from "@/components/ui/control";

export function ProfileRequest() {
  const [note, setNote] = useState("");
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = note.trim();
    if (text.length < 2) {
      setMessage("Write what should change.");
      return;
    }
    setPending(true);
    setMessage("");
    const result = await sendPortalMessageAction(`Profile update request: ${text}`);
    setPending(false);
    if ("error" in result) {
      setMessage(result.error);
      return;
    }
    setNote("");
    setMessage("Sent. The practice will see it in messages.");
  }

  return (
    <form onSubmit={onSubmit} className="rounded-3xl border border-line bg-card p-6">
      <h2 className="font-display text-2xl font-medium leading-tight">Request a profile update</h2>
      <p className="mt-2 text-sm leading-relaxed text-muted">
        The practice updates the chart. This note goes to them as a message.
      </p>
      <label className="mt-4 grid gap-2 text-sm">
        <span className="font-medium">What should change</span>
        <textarea
          className={controlClass}
          rows={4}
          maxLength={1800}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          placeholder="New phone number, pharmacy, or address"
        />
      </label>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Send to the practice"}
        </Button>
        {message ? <p className="text-sm text-muted">{message}</p> : null}
      </div>
    </form>
  );
}
