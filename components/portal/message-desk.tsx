"use client";

import { useState } from "react";
import { sendPortalMessageAction } from "@/app/portal/actions";
import type { PortalMessage } from "@/lib/portal/types";

function when(iso: string) {
  const time = Date.parse(iso);
  if (Number.isNaN(time)) return "";
  return new Date(time).toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function MessageDesk({ initial }: { initial: PortalMessage[] }) {
  const [messages, setMessages] = useState(initial);
  const [body, setBody] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function send(event: React.FormEvent) {
    event.preventDefault();
    setPending(true);
    setError("");
    const result = await sendPortalMessageAction(body);
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setMessages(result.messages);
    setBody("");
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-3xl border border-line bg-card p-6">
        {messages.length ? (
          <ol className="grid gap-3">
            {messages.map((message) => {
              const mine = message.from === "patient";
              return (
                <li key={message.id} className={mine ? "rounded-2xl bg-mint/50 px-4 py-3" : "rounded-2xl bg-pine px-4 py-3 text-paper"}>
                  <p className={mine ? "kicker text-oxide-deep" : "kicker text-foam"}>
                    {mine ? "You" : message.author || "The practice"}
                    {when(message.createdAt) ? ` · ${when(message.createdAt)}` : ""}
                  </p>
                  <p className="mt-2 text-sm leading-relaxed">{message.body}</p>
                </li>
              );
            })}
          </ol>
        ) : (
          <p className="text-sm leading-relaxed text-muted">
            Nothing from the practice yet. Write them here and the message stays on your record.
          </p>
        )}
      </section>
      <form onSubmit={(event) => void send(event)} className="rounded-3xl border border-line bg-card p-6">
        <label className="kicker text-muted" htmlFor="portal-message">
          Write a secure message
        </label>
        <textarea
          id="portal-message"
          value={body}
          onChange={(event) => setBody(event.target.value)}
          placeholder="Write a secure message…"
          rows={4}
          maxLength={2000}
          className="mt-3 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm leading-relaxed outline-none focus:border-oxide"
          required
        />
        {error ? <p className="mt-3 text-sm text-emergency">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-pine px-5 text-sm font-medium text-paper disabled:opacity-50"
        >
          {pending ? "Sending…" : "Send"}
        </button>
      </form>
    </div>
  );
}
