"use client";

import { useRef, useState } from "react";
import { fieldClass } from "@/components/admin/rcm/ui";
import type { CodeMatch } from "@/lib/coding/codes";
import { medicareCharge } from "@/lib/coding/fees";
import { money } from "@/lib/rcm/format";

export function CodeSearch({
  kind,
  label,
  placeholder,
  disabled,
  onPick,
  value,
  onValueChange,
  id,
  className,
}: {
  kind: "diagnosis" | "procedure";
  label: string;
  placeholder: string;
  disabled: boolean;
  onPick: (match: CodeMatch) => void;
  value?: string;
  onValueChange?: (value: string) => void;
  id?: string;
  className?: string;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<CodeMatch[]>([]);
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0);
  const shown = value ?? query;

  function search(next: string) {
    if (value === undefined) setQuery(next);
    onValueChange?.(next);
    if (timer.current) clearTimeout(timer.current);
    latest.current += 1;
    const ticket = latest.current;
    if (next.trim().length < 2) {
      setMatches([]);
      setStatus("");
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/coding/search?${new URLSearchParams({ kind, q: next.trim() })}`);
        const payload = (await response.json()) as { matches?: CodeMatch[]; release?: string; message?: string };
        if (ticket !== latest.current) return;
        const found = payload.matches ?? [];
        setMatches(found);
        if (!response.ok) setStatus(payload.message || "Code search is not available.");
        else setStatus(found.length ? `From ${payload.release}.` : `No billable code in ${payload.release} matches that.`);
      } catch {
        if (ticket === latest.current) setStatus("Code search is not available. Check the connection and try again.");
      }
    }, 200);
  }

  function pick(match: CodeMatch) {
    onPick(match);
    if (timer.current) clearTimeout(timer.current);
    latest.current += 1;
    setQuery("");
    setMatches([]);
    setStatus("");
  }

  return (
    <div className={className ?? "mt-3 grid gap-2"}>
      <input
        id={id}
        className={fieldClass}
        value={shown}
        onChange={(event) => search(event.target.value)}
        aria-label={label}
        placeholder={placeholder}
        disabled={disabled}
        autoComplete="off"
        spellCheck={false}
      />
      {matches.length ? (
        <ul className="relative z-20 grid divide-y divide-neutral-200 rounded-[var(--rb-r-md,8px)] border border-neutral-200 bg-white">
          {matches.map((match) => (
            <li key={match.code}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-neutral-50"
                onClick={() => pick(match)}
                disabled={disabled}
              >
                <span className="font-medium">{match.code}</span>
                {match.description ? <span className="text-muted"> · {match.description}</span> : null}
                {match.note ? <span className="text-muted"> · {match.note}</span> : null}
                {match.nonFacility || match.facility ? (
                  <span className="text-muted"> · {money(medicareCharge({ nonFacility: match.nonFacility ?? 0, facility: match.facility ?? 0 }, "11"))}</span>
                ) : null}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {status ? <p className="text-sm text-muted">{status}</p> : null}
    </div>
  );
}
