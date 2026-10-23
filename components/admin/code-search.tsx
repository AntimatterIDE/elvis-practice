"use client";

import { useRef, useState } from "react";
import { fieldClass } from "@/components/admin/rcm/ui";
import type { CodeMatch } from "@/lib/coding/codes";

export function CodeSearch({
  kind,
  label,
  placeholder,
  disabled,
  onPick,
}: {
  kind: "diagnosis" | "procedure";
  label: string;
  placeholder: string;
  disabled: boolean;
  onPick: (match: CodeMatch) => void;
}) {
  const [query, setQuery] = useState("");
  const [matches, setMatches] = useState<CodeMatch[]>([]);
  const [status, setStatus] = useState("");
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const latest = useRef(0);

  function search(value: string) {
    setQuery(value);
    if (timer.current) clearTimeout(timer.current);
    latest.current += 1;
    const ticket = latest.current;
    if (value.trim().length < 2) {
      setMatches([]);
      setStatus("");
      return;
    }
    timer.current = setTimeout(async () => {
      try {
        const response = await fetch(`/api/coding/search?${new URLSearchParams({ kind, q: value.trim() })}`);
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
    <div className="mt-3 grid gap-2">
      <input
        className={fieldClass}
        value={query}
        onChange={(event) => search(event.target.value)}
        aria-label={label}
        placeholder={placeholder}
        disabled={disabled}
      />
      {matches.length ? (
        <ul className="grid divide-y divide-neutral-200 rounded-[var(--rb-r-md,8px)] border border-neutral-200">
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
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {status ? <p className="text-sm text-muted">{status}</p> : null}
    </div>
  );
}
