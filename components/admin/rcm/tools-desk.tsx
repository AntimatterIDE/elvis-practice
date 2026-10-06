"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/rcm/format";
import {
  LoadingDesk,
  PageHeader,
  fieldClass,
  panelClass,
  cardClass,
  badgeClass,
} from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";
import { cn } from "@/lib/utils";

const codes = [
  { code: "M54.5", kind: "ICD-10", label: "Low back pain", fee: null },
  { code: "M54.2", kind: "ICD-10", label: "Cervicalgia", fee: null },
  { code: "M51.16", kind: "ICD-10", label: "Lumbar disc degeneration", fee: null },
  { code: "M47.812", kind: "ICD-10", label: "Spondylosis, cervical region", fee: null },
  { code: "99213", kind: "CPT", label: "Office visit, low complexity", fee: 145 },
  { code: "99214", kind: "CPT", label: "Office visit, moderate complexity", fee: 210 },
  { code: "97110", kind: "CPT", label: "Therapeutic exercise", fee: 78 },
  { code: "72148", kind: "CPT", label: "MRI lumbar spine", fee: 890 },
] as const;

const categories = ["all", "CPT", "ICD-10"] as const;

export function ToolsDesk() {
  const { ready } = useRcm();
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [copiedCode, setCopiedCode] = useState<string | null>(null);

  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    return codes.filter((item) => {
      if (category !== "all" && item.kind !== category) return false;
      if (!term) return true;
      return `${item.code} ${item.label} ${item.kind}`.toLowerCase().includes(term);
    });
  }, [query, category]);

  if (!ready) return <LoadingDesk />;

  async function copyCode(code: string) {
    try {
      await navigator.clipboard.writeText(code);
      setCopiedCode(code);
      setTimeout(() => setCopiedCode(null), 1500);
    } catch {
      /* clipboard not available */
    }
  }

  const cptCodes = codes.filter((c) => c.kind === "CPT" && c.fee != null);

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Tools"
        lede="Reference fee schedule, code lookups, and practice utilities."
      />
      {/* Quick fee schedule reference */}
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {cptCodes.map((item) => (
          <div key={item.code} className={panelClass}>
            <p className="text-xs font-semibold uppercase tracking-wider text-muted">{item.code}</p>
            <p className="mt-1 font-display text-2xl tracking-tight text-ink">
              {item.fee != null ? money(item.fee) : "—"}
            </p>
            <p className="mt-0.5 text-xs text-muted">{item.label}</p>
          </div>
        ))}
      </div>

      {/* Search & filter */}
      <div className="mt-8 flex flex-wrap items-center gap-3">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search by code or description…"
          className={`${fieldClass} max-w-sm`}
          aria-label="Search codes"
        />
        <div className="flex gap-1.5" role="radiogroup" aria-label="Filter by code type">
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              className={cn(
                badgeClass,
                "cursor-pointer transition",
                category === cat
                  ? "bg-oxide-deep text-paper"
                  : "bg-mist text-muted hover:bg-mint hover:text-oxide-deep",
              )}
              aria-pressed={category === cat}
            >
              {cat === "all" ? "All" : cat}
            </button>
          ))}
        </div>
      </div>

      {/* Code cards */}
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {matches.length === 0 ? (
          <li className="col-span-full rounded-2xl border border-dashed border-line px-6 py-10 text-center text-sm text-muted">
            No codes match.
          </li>
        ) : null}
        {matches.map((item) => (
          <li key={item.code} className={cardClass}>
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-mono text-lg font-semibold text-ink">{item.code}</p>
                <p className="mt-0.5 text-sm text-muted">{item.label}</p>
              </div>
              <span
                className={cn(
                  badgeClass,
                  item.kind === "CPT" ? "bg-mint text-oxide-deep" : "bg-mist text-muted",
                )}
              >
                {item.kind}
              </span>
            </div>
            {item.fee != null ? (
              <p className="mt-3 text-sm">
                <span className="text-muted">Fee schedule: </span>
                <span className="font-semibold text-ink">{money(item.fee)}</span>
              </p>
            ) : (
              <p className="mt-3 text-xs text-muted italic">No fee schedule — diagnosis code</p>
            )}
            <button
              onClick={() => copyCode(item.code)}
              className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-oxide-deep transition hover:text-oxide-ink"
            >
              <svg className="h-3.5 w-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                />
              </svg>
              {copiedCode === item.code ? "Copied!" : "Copy code"}
            </button>
          </li>
        ))}
      </ul>
    </main>
  );
}