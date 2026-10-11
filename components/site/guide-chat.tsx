"use client";

import { guideDisclaimer } from "@/lib/guide/prompt";
import { cn } from "@/lib/utils";
import { IconArrow, IconChat, IconClose } from "@/components/site/icons";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";

type Turn = { role: "user" | "assistant"; content: string };

const infoLinks = [
  { href: "/about", label: "About the clinic" },
  { href: "/visit", label: "Your visit" },
  { href: "/conditions", label: "Conditions" },
  { href: "/questions", label: "Questions" },
  { href: "/journal", label: "Journal" },
] as const;

const starterPrompts = ["Where is the office?", "What happens at a visit?", "What is in the journal?"] as const;

type Frame = { left: number; top: number; width: number; height: number; desktop: boolean };

function readFrame(): Frame {
  const viewport = window.visualViewport;
  return {
    desktop: window.matchMedia("(min-width: 768px)").matches,
    left: viewport?.offsetLeft ?? 0,
    top: viewport?.offsetTop ?? 0,
    width: viewport?.width ?? window.innerWidth,
    height: viewport?.height ?? window.innerHeight,
  };
}

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
  const [frame, setFrame] = useState<Frame>({ left: 0, top: 0, width: 0, height: 0, desktop: false });
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
    const sync = () => setFrame(readFrame());
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

  async function ask(content: string) {
    const trimmed = content.trim();
    if (!trimmed || pending) return;
    const history = [...turns, { role: "user" as const, content: trimmed }].slice(-8);
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

  function submit(event: React.FormEvent) {
    event.preventDefault();
    void ask(draft);
  }

  const panel =
    open && mounted
      ? createPortal(
          <div
            className="fixed z-[70]"
            style={{ left: frame.left, top: frame.top, width: frame.width, height: frame.height }}
          >
            <button type="button" aria-label="Close" className="absolute inset-0 bg-pine/45" onClick={() => setOpen(false)} />
            <section
              role="dialog"
              aria-modal="true"
              aria-labelledby={titleId}
              className={cn(
                "guide-sheet absolute flex min-w-0 flex-col overflow-hidden border border-line bg-card shadow-[0_24px_80px_-24px_rgb(7_30_54_/_0.55)]",
                frame.desktop
                  ? "right-6 bottom-6 w-[24rem] max-h-[min(36rem,calc(100%-3rem))] rounded-[1.75rem]"
                  : "inset-x-3 bottom-3 max-h-[calc(100%-1.5rem)] rounded-[1.75rem]",
              )}
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
                      "max-w-[85%] rounded-3xl px-3.5 py-2.5 text-sm leading-relaxed",
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
                {turns.length === 1 && !pending ? (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {starterPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        className="rounded-full border border-line bg-paper px-3 py-2 text-left text-sm leading-snug"
                        onClick={() => void ask(prompt)}
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>
              <form onSubmit={submit} className="grid min-w-0 gap-2 border-t border-line px-3 py-3">
                <Link
                  href="/contact"
                  className="flex h-11 items-center justify-center rounded-full bg-oxide-deep px-4 text-sm font-semibold text-paper hover:bg-oxide-ink"
                  onClick={() => setOpen(false)}
                >
                  Request a consultation
                </Link>
                <div className="flex min-w-0 gap-2 overflow-x-auto overscroll-x-contain pb-0.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                  {infoLinks.map((item) => (
                    <Link
                      key={item.href}
                      href={item.href}
                      className="inline-flex h-9 shrink-0 items-center rounded-full border border-line px-3 text-xs font-semibold text-ink"
                      onClick={() => setOpen(false)}
                    >
                      {item.label}
                    </Link>
                  ))}
                </div>
                <div className="flex min-w-0 items-end gap-2">
                  <label htmlFor="guide-question" className="sr-only">
                    Your question
                  </label>
                  <textarea
                    ref={inputRef}
                    id="guide-question"
                    value={draft}
                    maxLength={800}
                    rows={1}
                    placeholder="Ask a question"
                    className="max-h-24 min-h-11 min-w-0 flex-1 resize-none rounded-full border border-line bg-paper px-4 py-2.5 text-base outline-none focus:border-oxide"
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
                    aria-label="Send"
                    disabled={pending || draft.trim().length === 0}
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-full bg-oxide-deep text-paper hover:bg-oxide-ink disabled:opacity-50"
                  >
                    <IconArrow className="h-3 w-5" />
                  </button>
                </div>
                <p className="text-xs leading-snug text-muted">{guideDisclaimer}</p>
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
        aria-label="Ask"
        aria-expanded={open}
        aria-haspopup="dialog"
        className={cn(
          "fixed right-4 bottom-[5.35rem] z-40 inline-flex size-14 items-center justify-center rounded-full bg-pine text-paper shadow-[0_16px_40px_-18px_rgb(7_30_54_/_0.9)] hover:bg-ink md:right-6 md:bottom-6",
          open && "hidden",
        )}
        onClick={() => {
          setFrame(readFrame());
          setOpen(true);
        }}
      >
        <IconChat className="size-6" />
      </button>
    </>
  );
}
