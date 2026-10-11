"use client";

import { guideDisclaimer } from "@/lib/guide/prompt";
import { cn } from "@/lib/utils";
import { IconClose } from "@/components/site/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Turn = { role: "user" | "assistant"; content: string };

type Frame = { bottom: number; height: number; desktop: boolean };

const closedFrame: Frame = { bottom: 0, height: 560, desktop: false };

export function GuideChat() {
  const pathname = usePathname();
  const titleId = useId();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const threadRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [frame, setFrame] = useState<Frame>(closedFrame);
  const [turns, setTurns] = useState<Turn[]>([
    {
      role: "assistant",
      content: "Hey, how can I help you? I can look through what we share on the site and in the journal.",
    },
  ]);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const y = window.scrollY;
    const html = document.documentElement;
    const body = document.body;
    const previousHtml = html.style.overflow;
    const previousBody = body.style.overflow;
    html.style.overflow = "hidden";
    body.style.overflow = "hidden";
    const hold = () => {
      if (window.scrollY !== y) window.scrollTo(0, y);
    };
    window.addEventListener("scroll", hold, { passive: true });

    const viewport = window.visualViewport;
    const sync = () => {
      const desktop = window.matchMedia("(min-width: 768px)").matches;
      const height = viewport?.height ?? window.innerHeight;
      const offset = viewport ? Math.max(0, window.innerHeight - viewport.height - viewport.offsetTop) : 0;
      setFrame({
        desktop,
        bottom: desktop ? 24 : offset,
        height: desktop ? Math.min(640, height - 48) : Math.max(280, height - 20),
      });
    };
    sync();
    viewport?.addEventListener("resize", sync);
    viewport?.addEventListener("scroll", sync);
    window.addEventListener("resize", sync);

    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    if (window.matchMedia("(min-width: 768px)").matches) {
      inputRef.current?.focus({ preventScroll: true });
    }

    return () => {
      html.style.overflow = previousHtml;
      body.style.overflow = previousBody;
      window.removeEventListener("scroll", hold);
      viewport?.removeEventListener("resize", sync);
      viewport?.removeEventListener("scroll", sync);
      window.removeEventListener("resize", sync);
      window.removeEventListener("keydown", onKey);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const thread = threadRef.current;
    if (!thread) return;
    thread.scrollTop = thread.scrollHeight;
  }, [open, turns, pending, error]);

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
        setError(payload.message || "I'm having a little trouble with that. Try once more, or request a consultation and the office will call.");
        return;
      }
      const reply = payload.reply;
      setTurns((current) => [...current, { role: "assistant" as const, content: reply }].slice(-8));
    } catch {
      setError("I'm having a little trouble with that. Try once more, or request a consultation and the office will call.");
    } finally {
      setPending(false);
    }
  }

  const panel =
    open && mounted
      ? createPortal(
          <div className="fixed inset-0 z-[70]">
            <button type="button" aria-label="Close ask" className="absolute inset-0 bg-pine/50" onClick={() => setOpen(false)} />
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={cn(
                "guide-sheet fixed z-[71] flex flex-col overflow-hidden border border-line bg-card shadow-[0_24px_80px_-24px_rgb(7_30_54_/_0.55)]",
                frame.desktop ? "right-6 w-[24rem] rounded-3xl" : "inset-x-0 rounded-t-[1.75rem]",
              )}
              style={{ bottom: frame.bottom, maxHeight: frame.desktop ? frame.height : Math.min(frame.height * 0.72, 560) }}
            >
              <div className="flex items-center justify-between gap-3 border-b border-line px-4 py-3">
                <div className="min-w-0">
                  <h2 id={titleId} className="font-display text-2xl leading-none">
                    Ask
                  </h2>
                  <p className="mt-1 text-xs text-muted">About the site and the journal</p>
                </div>
                <button
                  type="button"
                  aria-label="Close"
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-full border border-line"
                  onClick={() => setOpen(false)}
                >
                  <IconClose className="size-3.5" />
                </button>
              </div>
              <div ref={threadRef} className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain px-4 py-4">
                {turns.map((turn, index) => (
                  <p
                    key={`${turn.role}-${index}`}
                    className={cn(
                      "max-w-[90%] rounded-2xl px-3 py-2 text-sm leading-relaxed",
                      turn.role === "user" ? "ml-auto bg-pine text-paper" : "bg-paper text-ink",
                    )}
                  >
                    {turn.content}
                  </p>
                ))}
                {pending ? <p className="text-sm text-muted">Let me look through what we have…</p> : null}
                {error ? (
                  <p role="alert" className="text-sm text-emergency">
                    {error}
                  </p>
                ) : null}
              </div>
              <form onSubmit={submit} className="grid gap-2 border-t border-line px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
                <div className="flex items-end gap-2">
                  <label htmlFor="guide-question" className="sr-only">
                    Your question
                  </label>
                  <textarea
                    ref={inputRef}
                    id="guide-question"
                    value={draft}
                    maxLength={800}
                    rows={1}
                    placeholder="Ask about a page or a journal note"
                    className="max-h-24 min-h-11 w-full flex-1 resize-none rounded-2xl border border-line bg-paper px-3 py-2.5 text-sm outline-none focus:border-oxide"
                    onChange={(event) => setDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === "Enter" && !event.shiftKey) {
                        event.preventDefault();
                        event.currentTarget.form?.requestSubmit();
                      }
                    }}
                  />
                  <button
                    type="submit"
                    disabled={pending || draft.trim().length === 0}
                    className="inline-flex h-11 shrink-0 items-center rounded-full bg-oxide-deep px-4 text-sm font-semibold text-paper hover:bg-oxide-ink disabled:opacity-50"
                  >
                    Send
                  </button>
                </div>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-[0.7rem] leading-snug text-muted">{guideDisclaimer}</p>
                  <Link href="/contact" className="shrink-0 text-xs font-semibold text-oxide-deep underline-offset-4 hover:underline" onClick={() => setOpen(false)}>
                    Request a consultation
                  </Link>
                </div>
              </form>
            </section>
          </div>,
          document.body,
        )
      : null;

  return (
    <>
      {panel}
      <button
        type="button"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "fixed right-4 bottom-[5.25rem] z-40 inline-flex min-h-11 items-center rounded-full bg-pine px-4 text-sm font-semibold text-paper shadow-[0_16px_40px_-24px_rgb(7_30_54_/_0.8)] hover:bg-ink md:right-6 md:bottom-6",
          open && "hidden",
        )}
        onClick={() => {
          const desktop = window.matchMedia("(min-width: 768px)").matches;
          const height = window.visualViewport?.height ?? window.innerHeight;
          setFrame({
            desktop,
            bottom: desktop ? 24 : 0,
            height: desktop ? Math.min(640, height - 48) : Math.max(280, height - 20),
          });
          setOpen(true);
        }}
      >
        Ask
      </button>
    </>
  );
}
