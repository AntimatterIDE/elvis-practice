"use client";

import { guideDisclaimer } from "@/lib/guide/prompt";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

type Turn = { role: "user" | "assistant"; content: string };

export function GuideChat() {
  const pathname = usePathname();
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "assistant",
      content:
        "I can help you find what this site and the journal say. I am not a spine expert, and I will not give a definite answer about your health. If you want the office to call, request a consultation.",
    },
  ]);

  useEffect(() => {
    if (!open) return;
    inputRef.current?.focus();
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    const content = draft.trim();
    if (!content || pending) return;
    const history = [...turns, { role: "user" as const, content }].slice(-8);
    setTurns(history);
    setDraft("");
    setError("");
    setPending(true);
    try {
      const response = await fetch("/api/guide", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ page: pathname, messages: history.slice(-6) }),
      });
      const payload = (await response.json()) as { reply?: string; message?: string };
      if (!response.ok || !payload.reply) {
        setError(payload.message || "The guide could not answer just now.");
        return;
      }
      const reply = payload.reply;
      setTurns((current) => [...current, { role: "assistant" as const, content: reply }].slice(-8));
    } catch {
      setError("The guide could not answer just now.");
    } finally {
      setPending(false);
    }
  }

  return (
    <>
      {open ? (
        <section
          role="dialog"
          aria-labelledby={titleId}
          className="fixed inset-x-4 bottom-24 z-50 flex max-h-[min(32rem,calc(100dvh-8rem))] flex-col overflow-hidden rounded-3xl border border-line bg-card shadow-[0_24px_80px_-32px_rgb(7_30_54_/_0.55)] md:inset-x-auto md:right-6 md:bottom-20 md:w-[22rem]"
        >
          <div className="flex items-start justify-between gap-3 border-b border-line px-4 py-3">
            <div className="min-w-0">
              <h2 id={titleId} className="font-display text-xl leading-tight">
                Ask about the site
              </h2>
            </div>
            <button
              type="button"
              className="inline-flex min-h-11 shrink-0 items-center rounded-full border border-line px-3 text-sm"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
          <div className="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
            {turns.map((turn, index) => (
              <p
                key={`${turn.role}-${index}`}
                className={cn(
                  "max-w-[95%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                  turn.role === "user" ? "ml-auto bg-pine text-paper" : "bg-paper text-ink",
                )}
              >
                {turn.content}
              </p>
            ))}
            {pending ? <p className="text-sm text-muted">Looking through the notes…</p> : null}
            {error ? (
              <p role="alert" className="text-sm text-emergency">
                {error}
              </p>
            ) : null}
          </div>
          <form onSubmit={submit} className="grid gap-2 border-t border-line px-4 py-3">
            <label htmlFor="guide-question" className="sr-only">
              Your question
            </label>
            <textarea
              ref={inputRef}
              id="guide-question"
              value={draft}
              maxLength={800}
              rows={2}
              placeholder="Ask about a page or a journal note"
              className="w-full resize-none rounded-2xl border border-line bg-paper px-3 py-2 text-sm outline-none focus:border-oxide"
              onChange={(event) => setDraft(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
            />
            <div className="flex items-center justify-between gap-3">
              <Link href="/contact" className="text-sm font-semibold text-oxide-deep underline-offset-4 hover:underline">
                Request a consultation
              </Link>
              <button
                type="submit"
                disabled={pending || draft.trim().length === 0}
                className="inline-flex min-h-11 items-center rounded-full bg-oxide-deep px-4 text-sm font-semibold text-paper hover:bg-oxide-ink disabled:opacity-50"
              >
                Send
              </button>
            </div>
            <p className="text-[0.7rem] leading-snug text-muted">{guideDisclaimer}</p>
          </form>
        </section>
      ) : null}
      {open ? null : (
        <button
          type="button"
          aria-expanded={false}
          className="fixed right-4 bottom-24 z-40 inline-flex min-h-11 items-center rounded-full bg-pine px-4 text-sm font-semibold text-paper shadow-[0_16px_40px_-24px_rgb(7_30_54_/_0.8)] hover:bg-ink md:right-6 md:bottom-6"
          onClick={() => setOpen(true)}
        >
          Ask
        </button>
      )}
    </>
  );
}
