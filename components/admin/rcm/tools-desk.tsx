"use client";

import { useMemo, useState } from "react";
import { money } from "@/lib/rcm/format";
import { LoadingDesk, PageHeader, fieldClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

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

export function ToolsDesk() {
  const { ready } = useRcm();
  const [query, setQuery] = useState("");
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return codes;
    return codes.filter((item) => `${item.code} ${item.label} ${item.kind}`.toLowerCase().includes(term));
  }, [query]);

  if (!ready) return <LoadingDesk />;

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Tools"
        lede="A short code list and sample fees for the demo. This is not a full fee schedule or payer policy library."
      />
      <input
        className={`${fieldClass} mt-8 max-w-md`}
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search CPT or ICD-10"
        aria-label="Search codes"
      />
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {matches.length === 0 ? <li className="py-4 text-sm text-muted">No codes match.</li> : null}
        {matches.map((item) => (
          <li key={item.code} className="flex items-baseline justify-between gap-4 py-4 text-sm">
            <span>
              <span className="font-semibold">{item.code}</span>
              <span className="text-muted"> · {item.kind} · {item.label}</span>
            </span>
            <span>{item.fee == null ? "Diagnosis" : money(item.fee)}</span>
          </li>
        ))}
      </ul>
      <section className="mt-8 max-w-2xl border border-line bg-card p-4 text-sm">
        <h2 className="font-display text-2xl">Prior auth watch</h2>
        <p className="mt-3 text-muted">
          In this demo, MRI lumbar spine (72148) is treated as a service that often needs authorization. Eligibility
          estimates also flag Aetna and UnitedHealthcare for imaging review. Confirm the real payer rule before using
          this in clinic.
        </p>
      </section>
    </main>
  );
}
