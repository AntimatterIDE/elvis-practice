"use client";

import { useMemo, useState, useTransition } from "react";
import { purgeSmokeChartsAction } from "@/app/portal/actions";
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
  const { ready, patients, removePatient } = useRcm();
  const [query, setQuery] = useState("");
  const [purgeMessage, setPurgeMessage] = useState("");
  const [pending, startTransition] = useTransition();
  const matches = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return codes;
    return codes.filter((item) => `${item.code} ${item.label} ${item.kind}`.toLowerCase().includes(term));
  }, [query]);

  const smokeLocal = useMemo(
    () =>
      patients.filter((patient) =>
        /^(ClaimPipe Multi|BulkSmoke Alpha|LetterSmoke Alpha|LetterSmoke Beta|LetterSmoke Gamma|OCR ExtractTest|Alicia Mendel)$/i.test(
          `${patient.firstName} ${patient.lastName}`.trim(),
        ),
      ),
    [patients],
  );

  if (!ready) return <LoadingDesk />;

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Tools"
        lede="A short code list. Fees here are examples, not the practice fee schedule."
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
          MRI lumbar spine (72148) often needs authorization. Confirm the payer rule before scheduling imaging.
        </p>
      </section>
      <section className="mt-8 max-w-2xl border border-line bg-card p-4 text-sm">
        <h2 className="font-display text-2xl">Purge QA smoke charts</h2>
        <p className="mt-3 text-muted">
          Removes ClaimPipe / BulkSmoke / LetterSmoke / OCR ExtractTest / Alicia Mendel charts from the shared
          roster. Local count now: {smokeLocal.length}.
        </p>
        <button
          type="button"
          className="mt-4 rounded-full bg-oxide px-4 py-2.5 text-sm font-semibold text-paper disabled:opacity-50"
          disabled={pending}
          onClick={() => {
            if (!window.confirm("Purge QA smoke charts from the shared roster?")) return;
            startTransition(async () => {
              const result = await purgeSmokeChartsAction();
              if (!result.ok) {
                setPurgeMessage(result.error || "Purge failed.");
                return;
              }
              for (const id of result.ids) removePatient(id);
              for (const patient of smokeLocal) removePatient(patient.id);
              setPurgeMessage(
                result.removed
                  ? `Removed ${result.removed} smoke chart${result.removed === 1 ? "" : "s"} from the practice roster.`
                  : "No matching smoke charts were on the shared roster.",
              );
            });
          }}
        >
          {pending ? "Purging…" : "Purge smoke charts"}
        </button>
        {purgeMessage ? <p className="mt-3 text-oxide">{purgeMessage}</p> : null}
      </section>
    </main>
  );
}
