"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import type { OnboardDraft } from "@/lib/ocr/onboard-draft";
import {
  coverageFromAnswers,
  emptyOnboardDraft,
  intakeAnswersFromOnboardDraft,
  refreshOnboardWarnings,
} from "@/lib/ocr/onboard-draft";
import type { IntakeField } from "@/lib/portal/types";
import { cn } from "@/lib/utils";

type ExtractResponse = {
  draft?: OnboardDraft;
  fingerprints?: string[];
  corpus?: string;
  corpusChars?: number;
  retainedPaths?: string[];
  ocr?: {
    method_used: string;
    page_count: number;
    partial: boolean;
    processing_ms: number;
    page_labels: { page: number; label: string }[];
  };
  message?: string;
};

export type IntakeOcrPayload = {
  draft: OnboardDraft;
  fingerprints: string[];
  paths: string[];
  corpus: string;
  pageLabels: { label: string }[];
  answers: Record<string, string>;
};

async function sha256Hex(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function IntakeRecordsImport({
  token = "",
  fields,
  coveredBy,
  onApplied,
}: {
  token?: string;
  fields: IntakeField[];
  /** Existing form/profile values — missing-field warnings skip gaps already covered. */
  coveredBy?: Record<string, string>;
  onApplied: (payload: IntakeOcrPayload) => void;
}) {
  const [files, setFiles] = useState<FileList | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<OnboardDraft | null>(null);
  const [meta, setMeta] = useState<ExtractResponse["ocr"] | null>(null);
  const [payload, setPayload] = useState<IntakeOcrPayload | null>(null);
  const [applied, setApplied] = useState(false);

  const authHeaders = useMemo(() => {
    const headers: Record<string, string> = {};
    if (token) headers["x-intake-token"] = token;
    return headers;
  }, [token]);

  async function stageFile(file: File) {
    const prepared = await fetch("/api/ocr/onboard/prepare", {
      method: "POST",
      headers: { "content-type": "application/json", ...authHeaders },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || "application/pdf",
        byteSize: file.size,
        token: token || undefined,
      }),
    });
    const preparedJson = (await prepared.json().catch(() => null)) as
      | { path?: string; signedUrl?: string; message?: string }
      | null;
    if (!prepared.ok || !preparedJson?.path || !preparedJson.signedUrl) {
      throw new Error(preparedJson?.message || "Could not stage that file for OCR.");
    }
    const uploaded = await fetch(preparedJson.signedUrl, {
      method: "PUT",
      headers: { "content-type": file.type || "application/pdf" },
      body: file,
    });
    if (!uploaded.ok) throw new Error(`Upload failed for ${file.name} (${uploaded.status}).`);
    return preparedJson.path;
  }

  async function onExtract(event: React.FormEvent) {
    event.preventDefault();
    event.stopPropagation();
    if (!files?.length) {
      setError("Choose a PDF packet and optional photo ID or insurance card images.");
      return;
    }
    setBusy(true);
    setError("");
    setDraft(null);
    setMeta(null);
    setPayload(null);
    setApplied(false);
    try {
      const selected = Array.from(files);
      const localHashes = await Promise.all(selected.map((file) => sha256Hex(file)));
      const paths = await Promise.all(selected.map((file) => stageFile(file)));
      const res = await fetch("/api/ocr/onboard/extract", {
        method: "POST",
        headers: { "content-type": "application/json", ...authHeaders },
        body: JSON.stringify({ paths, token: token || undefined }),
      });
      const json = (await res.json().catch(() => null)) as ExtractResponse | null;
      if (!res.ok || !json?.draft) {
        setError(json?.message || `OCR import failed (${res.status}).`);
        setBusy(false);
        return;
      }
      const nextDraft = refreshOnboardWarnings(
        { ...emptyOnboardDraft(), ...json.draft },
        { coveredBy: coverageFromAnswers(coveredBy, fields) },
      );
      const fingerprints = [...new Set([...(json.fingerprints ?? []), ...localHashes].map((item) => item.toLowerCase()))];
      const answers = intakeAnswersFromOnboardDraft(fields, nextDraft);
      const nextPayload: IntakeOcrPayload = {
        draft: nextDraft,
        fingerprints,
        paths: json.retainedPaths?.length ? json.retainedPaths : paths,
        corpus: json.corpus || "",
        pageLabels: (json.ocr?.page_labels ?? []).map((item) => ({ label: item.label })),
        answers,
      };
      setDraft(nextDraft);
      setMeta(json.ocr ?? null);
      setPayload(nextPayload);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the OCR import API.");
    }
    setBusy(false);
  }

  function applyToForm() {
    if (!payload) return;
    onApplied(payload);
    setApplied(true);
  }

  return (
    <section
      className={cn(
        "relative overflow-hidden rounded-3xl border border-oxide/25 bg-gradient-to-br from-mint/80 via-card to-paper",
        "p-5 shadow-[0_22px_50px_-36px_rgb(10_110_102_/_0.55)] sm:p-6",
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-oxide" aria-hidden="true" />
      <p className="kicker text-oxide-deep">Records</p>
      <h2 className="mt-2 font-display text-3xl tracking-tight text-ink sm:text-4xl">Upload records from another doctor</h2>
      <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted sm:text-base">
        We read the packet and fill what we can on this form. You still review every answer before you send it.
      </p>

      <div className="mt-5 grid gap-3">
        <label className="grid gap-2 text-sm font-medium text-ink">
          PDF packet and optional ID or insurance images
          <input
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png"
            multiple
            className="block w-full rounded-2xl border border-line bg-paper px-3 py-3 text-sm file:mr-3 file:rounded-full file:border-0 file:bg-oxide file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-paper"
            onChange={(event) => setFiles(event.target.files)}
          />
        </label>
        <div className="flex flex-wrap gap-2">
          <Button type="button" disabled={busy} onClick={(event) => void onExtract(event)}>
            {busy ? "Reading documents…" : "Extract from records"}
          </Button>
          {payload ? (
            <Button type="button" variant="secondary" disabled={busy} onClick={applyToForm}>
              {applied ? "Applied to form" : "Apply to this form"}
            </Button>
          ) : null}
        </div>
      </div>

      {meta ? (
        <p className="mt-3 text-xs text-muted">
          {meta.method_used} · {meta.page_count} pages
          {meta.partial ? " · partial" : ""} · {Math.round(meta.processing_ms / 1000)}s
        </p>
      ) : null}

      {draft ? (
        <div className="mt-4 rounded-2xl border border-line/80 bg-paper/80 px-4 py-3 text-sm leading-relaxed text-ink">
          <p className="font-medium">
            {draft.firstName || "—"} {draft.lastName || "—"}
            {draft.dateOfBirth ? ` · ${draft.dateOfBirth}` : ""}
            {draft.payerName ? ` · ${draft.payerName}` : ""}
          </p>
          {draft.reasonForVisit ? <p className="mt-1 text-muted">{draft.reasonForVisit}</p> : null}
          {draft.warnings.length ? (
            <ul className="mt-2 list-disc space-y-1 pl-5 text-emergency">
              {draft.warnings.slice(0, 4).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          {applied ? (
            <p className="mt-2 text-oxide-deep">
              Fields were filled below. Finish the rest of the intake, then submit — we will file the packet into your chart.
            </p>
          ) : (
            <p className="mt-2 text-muted">Review the summary, then apply it to the form fields below.</p>
          )}
        </div>
      ) : null}

      {error ? <p className="mt-3 text-sm text-emergency">{error}</p> : null}
    </section>
  );
}
