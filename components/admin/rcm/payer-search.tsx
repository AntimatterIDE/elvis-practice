"use client";

import { useRef, useState } from "react";
import { searchPayers } from "@/app/admin/stedi/actions";
import { fieldClass } from "@/components/admin/rcm/ui";

export type PayerPick = {
  name: string;
  tradingPartnerId: string;
};

type PayerMatch = {
  name: string;
  primaryPayerId: string;
  stediId: string;
  claims: string;
};

export function PayerSearch({
  id,
  label,
  value,
  tradingPartnerId,
  disabled,
  onChange,
}: {
  id?: string;
  label: string;
  value: string;
  tradingPartnerId?: string;
  disabled?: boolean;
  onChange: (next: PayerPick) => void;
}) {
  const [matches, setMatches] = useState<PayerMatch[]>([]);
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0);

  function search(next: string) {
    onChange({ name: next, tradingPartnerId: "" });
    if (timer.current) clearTimeout(timer.current);
    latest.current += 1;
    const ticket = latest.current;
    if (next.trim().length < 2) {
      setMatches([]);
      setStatus("");
      return;
    }
    timer.current = setTimeout(async () => {
      const result = await searchPayers(next.trim());
      if (ticket !== latest.current) return;
      const found: PayerMatch[] = [];
      for (const payer of result.payers) {
        if (!payer?.name || !payer.primaryPayerId) continue;
        found.push({
          name: payer.name,
          primaryPayerId: payer.primaryPayerId,
          stediId: payer.stediId,
          claims: payer.claims,
        });
      }
      setMatches(found);
      setStatus(result.message);
    }, 200);
  }

  function pick(match: PayerMatch) {
    onChange({ name: match.name, tradingPartnerId: match.primaryPayerId });
    if (timer.current) clearTimeout(timer.current);
    latest.current += 1;
    setMatches([]);
    setStatus(`Selected ${match.name} · payer id ${match.primaryPayerId}.`);
  }

  return (
    <div className="grid gap-2">
      <input
        id={id}
        className={fieldClass}
        value={value}
        onChange={(event) => search(event.target.value)}
        aria-label={label}
        placeholder="Search the Stedi payer list, such as Fidelis"
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
      />
      {tradingPartnerId ? (
        <p className="text-sm text-muted">Stedi payer id {tradingPartnerId}</p>
      ) : value.trim() ? (
        <p className="text-sm text-muted">Pick a payer from the list. A typed name alone cannot be filed.</p>
      ) : null}
      {matches.length ? (
        <ul className="relative z-20 grid divide-y divide-neutral-200 rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white">
          {matches.map((match) => (
            <li key={`${match.stediId}-${match.primaryPayerId}`}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                onClick={() => pick(match)}
                disabled={disabled}
              >
                <span className="font-medium">{match.name}</span>
                <span className="text-muted"> · {match.primaryPayerId}</span>
                {match.claims ? <span className="text-muted"> · claims {match.claims}</span> : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {status && !matches.length ? <p className="text-sm text-muted">{status}</p> : null}
    </div>
  );
}
