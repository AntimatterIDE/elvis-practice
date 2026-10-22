"use client";

import { useEffect, useState } from "react";
import { sendStaffPortalMessageAction, staffPortalThreadAction } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";
import { fieldClass, panelClass } from "@/components/admin/rcm/ui";
import type { PortalMessage } from "@/lib/portal/types";

function when(iso: string) {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  return new Date(time).toLocaleString(undefined, {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function PortalMail({ patientId, patientName }: { patientId: string; patientName: string }) {
  const [messages, setMessages] = useState<PortalMessage[]>([]);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancel = false;
    void staffPortalThreadAction(patientId).then((result) => {
      if (cancel) return;
      setReady(true);
      if ("error" in result) {
        if (result.error !== "That record is not on the portal.") setError(result.error);
        return;
      }
      setMessages(result.messages);
    });
    return () => {
      cancel = true;
    };
  }, [patientId]);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await sendStaffPortalMessageAction(patientId, body);
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setMessages(result.messages);
    setBody("");
  }

  return (
    <section className={`${panelClass} lg:col-span-2`}>
      <h2 className="font-display text-2xl">Portal messages</h2>
      <p className="mt-2 text-sm text-muted">What {patientName} sends from the patient portal, and your replies, stay on this record.</p>
      {ready && messages.length ? (
        <ol className="mt-4 grid gap-2">
          {messages.map((message) => (
            <li key={message.id} className="rounded-xl border border-line px-3 py-2 text-sm">
              <p className="text-xs uppercase tracking-[0.14em] text-muted">
                {message.from === "patient" ? message.author || patientName : message.author || "The practice"}
                {when(message.createdAt) ? ` · ${when(message.createdAt)}` : ""}
              </p>
              <p className="mt-1 leading-relaxed">{message.body}</p>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-muted">{ready ? "No messages yet." : "Opening the thread…"}</p>
      )}
      <form onSubmit={(event) => void send(event)} className="mt-4 grid gap-3">
        <label className="text-xs uppercase tracking-[0.14em] text-muted" htmlFor={`portal-reply-${patientId}`}>
          Reply
        </label>
        <textarea
          id={`portal-reply-${patientId}`}
          className={fieldClass}
          rows={3}
          maxLength={2000}
          value={body}
          placeholder="Write a reply the patient will see in the portal…"
          onChange={(event) => setBody(event.target.value)}
          required
        />
        {error ? <p className="text-sm text-emergency">{error}</p> : null}
        <Button type="submit" disabled={pending} className="w-fit">
          {pending ? "Sending…" : "Send"}
        </Button>
      </form>
    </section>
  );
}
