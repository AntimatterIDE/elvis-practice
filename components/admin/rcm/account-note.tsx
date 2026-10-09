"use client";

import type { AccountNote } from "@/lib/rcm/types";
import { Button } from "@/components/ui/button";

export function AccountNoteDialog({ notes, onClose }: { notes: AccountNote[]; onClose: () => void }) {
  const open = notes.filter((note) => !note.resolved);
  if (!open.length) return null;
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" role="presentation">
      <div role="dialog" aria-modal="true" aria-labelledby="account-note-title" className="grid w-full max-w-lg gap-4 rounded-2xl border border-line bg-card p-5 shadow-[0_24px_48px_-28px_rgb(7_30_54_/_0.6)]">
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">Account note</p>
          <h2 id="account-note-title" className="mt-2 font-display text-3xl">
            For the front desk
          </h2>
        </div>
        <ul className="grid gap-3">
          {open.map((note) => (
            <li key={note.id} className="rounded-xl bg-mint/60 px-4 py-3 text-sm leading-relaxed">
              {note.body}
            </li>
          ))}
        </ul>
        <p className="text-sm text-muted">Closing this note leaves it on the chart. It does not hold the bill.</p>
        <Button type="button" onClick={onClose} className="justify-self-start">
          Close
        </Button>
      </div>
    </div>
  );
}
