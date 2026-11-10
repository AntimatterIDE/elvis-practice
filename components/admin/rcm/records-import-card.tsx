"use client";

import { useState } from "react";
import { BulkPatientImport } from "@/components/admin/rcm/bulk-patient-import";
import { OutsideRecordsImport } from "@/components/admin/rcm/outside-records-import";
import { cn } from "@/lib/utils";

type ImportMode = "packet" | "folder";

const MODE_COPY: Record<ImportMode, { label: string; lede: string }> = {
  packet: {
    label: "One packet",
    lede: "Back-office import — no patient link required. Extract, review, and confirm to create or update a chart and file the PDFs.",
  },
  folder: {
    label: "Folder",
    lede: "Subfolders become one draft each; loose files at the root become one draft per file. OCR detects existing charts, then you Approve or Deny each card.",
  },
};

/** Single intake card that switches between one-packet and bulk-folder import. */
export function RecordsImportCard() {
  const [mode, setMode] = useState<ImportMode>("packet");
  const copy = MODE_COPY[mode];

  return (
    <section className="relative grid gap-4 overflow-hidden rounded-3xl border border-oxide/25 bg-gradient-to-br from-mint/80 via-card to-paper p-5 shadow-[0_22px_50px_-36px_rgb(10_110_102_/_0.55)] sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-oxide" aria-hidden="true" />
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div className="min-w-0">
          <p className="kicker text-oxide-deep">Records</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight text-ink sm:text-4xl">Import records</h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted sm:text-base">{copy.lede}</p>
        </div>
        <div
          role="tablist"
          aria-label="Import mode"
          className="inline-flex shrink-0 self-start rounded-xl border border-line bg-paper/90 p-1"
        >
          {(Object.keys(MODE_COPY) as ImportMode[]).map((id) => {
            const selected = mode === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={selected}
                className={cn(
                  "rounded-lg px-3 py-1.5 text-sm font-medium transition-colors",
                  selected ? "bg-oxide text-white shadow-sm" : "text-muted hover:text-ink",
                )}
                onClick={() => setMode(id)}
              >
                {MODE_COPY[id].label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Keep both mounted so mid-review bulk state survives an accidental mode flip. */}
      <div className={mode === "packet" ? "grid gap-4" : "hidden"} aria-hidden={mode !== "packet"}>
        <OutsideRecordsImport embedded />
      </div>
      <div className={mode === "folder" ? "grid gap-4" : "hidden"} aria-hidden={mode !== "folder"}>
        <BulkPatientImport embedded />
      </div>
    </section>
  );
}
