"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { pushPortalChartsAction } from "@/app/portal/actions";
import type { OnboardDraft } from "@/lib/ocr/onboard-draft";
import { emptyOnboardDraft } from "@/lib/ocr/onboard-draft";
import {
  findOcrImportMatch,
  mergeOnboardIntoPatient,
  patientFromOnboardDraftWithHashes,
  type OcrImportMatch,
} from "@/lib/ocr/dedupe";
import type { Sex } from "@/lib/rcm/types";
import { patientName } from "@/lib/rcm/format";
import { Field, fieldClass, panelClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

type ExtractResponse = {
  draft?: OnboardDraft;
  fingerprints?: string[];
  ocr?: {
    method_used: string;
    page_count: number;
    partial: boolean;
    processing_ms: number;
    page_labels: { page: number; label: string }[];
  };
  message?: string;
};

async function sha256Hex(file: File) {
  const buffer = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", buffer);
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

export function OutsideRecordsImport() {
  const router = useRouter();
  const { patients, rememberPatient } = useRcm();
  const [files, setFiles] = useState<FileList | null>(null);
  const [draft, setDraft] = useState<OnboardDraft | null>(null);
  const [fingerprints, setFingerprints] = useState<string[]>([]);
  const [ocrMeta, setOcrMeta] = useState<ExtractResponse["ocr"] | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState<"idle" | "extract" | "save">("idle");

  const match: OcrImportMatch | null = useMemo(() => {
    if (!draft) return null;
    return findOcrImportMatch(patients, {
      firstName: draft.firstName,
      lastName: draft.lastName,
      dateOfBirth: draft.dateOfBirth,
      fingerprints,
    });
  }, [draft, fingerprints, patients]);

  function update<K extends keyof OnboardDraft>(key: K, value: OnboardDraft[K]) {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  }

  async function onExtract(event: React.FormEvent) {
    event.preventDefault();
    if (!files?.length) {
      setError("Choose a PDF packet and optional photo ID or insurance card images.");
      return;
    }
    setBusy("extract");
    setError("");
    setDraft(null);
    setOcrMeta(null);
    setFingerprints([]);
    const body = new FormData();
    Array.from(files).forEach((file) => body.append("files", file));
    try {
      const localHashes = await Promise.all(Array.from(files).map((file) => sha256Hex(file)));
      const res = await fetch("/api/ocr/onboard/extract", { method: "POST", body });
      const json = (await res.json()) as ExtractResponse;
      if (!res.ok || !json.draft) {
        setError(json.message || "OCR import failed.");
        setBusy("idle");
        return;
      }
      const hashes = [...new Set([...(json.fingerprints ?? []), ...localHashes].map((item) => item.toLowerCase()))];
      setDraft({ ...emptyOnboardDraft(), ...json.draft });
      setFingerprints(hashes);
      setOcrMeta(json.ocr ?? null);
    } catch {
      setError("Could not reach the OCR import API.");
    }
    setBusy("idle");
  }

  async function save(mode: "create" | "update") {
    if (!draft) return;
    if (!draft.firstName.trim() || !draft.lastName.trim()) {
      setError("Confirm first and last name before saving.");
      return;
    }
    if (mode === "create" && match?.reason === "fingerprint") {
      setError(
        `These exact files were already imported for ${patientName(match.patient)}. Use “Update existing chart” or pick different files.`,
      );
      return;
    }
    setBusy("save");
    setError("");
    const patient =
      mode === "update" && match
        ? mergeOnboardIntoPatient(match.patient, draft, fingerprints)
        : patientFromOnboardDraftWithHashes(draft, `p_${crypto.randomUUID().slice(0, 8)}`, fingerprints);
    const result = await pushPortalChartsAction({ patients: [patient], appointments: [] });
    setBusy("idle");
    if (!result.ok) {
      setError(result.error || "That chart could not be saved for the practice.");
      return;
    }
    rememberPatient(patient);
    router.push(`/admin/operations/patients/${patient.id}`);
  }

  return (
    <section className={`${panelClass} grid gap-4`}>
      <div>
        <h2 className="font-display text-2xl tracking-tight">Outside records</h2>
        <p className="mt-1 text-sm leading-relaxed text-muted">
          Extract is safe to re-run on the same PDFs (nothing is saved until you confirm). Confirm never creates a second
          chart for the same file fingerprint — it updates the existing patient instead.
        </p>
      </div>
      <form onSubmit={onExtract} className="grid gap-3">
        <Field label="Files">
          <input
            className={fieldClass}
            type="file"
            accept="application/pdf,image/jpeg,image/png,image/webp,.pdf,.jpg,.jpeg,.png"
            multiple
            onChange={(event) => setFiles(event.target.files)}
          />
        </Field>
        <Button type="submit" variant="secondary" disabled={busy !== "idle"}>
          {busy === "extract" ? "Reading documents…" : "Extract draft"}
        </Button>
      </form>
      {ocrMeta ? (
        <p className="text-xs text-muted">
          {ocrMeta.method_used} · {ocrMeta.page_count} pages
          {ocrMeta.partial ? " · partial" : ""} · {Math.round(ocrMeta.processing_ms / 1000)}s
          {fingerprints.length ? ` · ${fingerprints.length} file fingerprint${fingerprints.length === 1 ? "" : "s"}` : ""}
        </p>
      ) : null}
      {draft ? (
        <form
          onSubmit={(event) => {
            event.preventDefault();
            void save(match ? "update" : "create");
          }}
          className="grid gap-3 border-t border-black/5 pt-4"
        >
          <p className="text-sm text-muted">{draft.sourceSummary || "Review the mined fields, then save."}</p>
          {match ? (
            <p className="rounded-md bg-black/[0.04] px-3 py-2 text-sm leading-relaxed">
              {match.reason === "fingerprint"
                ? `These files were already imported for ${patientName(match.patient)}. Confirm will update that chart — no duplicate patient.`
                : `A chart already exists for ${patientName(match.patient)} (same name and date of birth). Confirm will update that chart.`}
            </p>
          ) : null}
          {draft.warnings.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-emergency">
              {draft.warnings.map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}
          <div className="grid gap-3 sm:grid-cols-2">
            <Field label="First name">
              <input className={fieldClass} value={draft.firstName} onChange={(e) => update("firstName", e.target.value)} required />
            </Field>
            <Field label="Last name">
              <input className={fieldClass} value={draft.lastName} onChange={(e) => update("lastName", e.target.value)} required />
            </Field>
            <Field label="Date of birth">
              <input
                className={fieldClass}
                type="date"
                value={draft.dateOfBirth}
                onChange={(e) => update("dateOfBirth", e.target.value)}
              />
            </Field>
            <Field label="Sex">
              <select className={fieldClass} value={draft.sex} onChange={(e) => update("sex", e.target.value as Sex)}>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="unknown">Unknown</option>
              </select>
            </Field>
            <Field label="Phone">
              <input className={fieldClass} value={draft.phone} onChange={(e) => update("phone", e.target.value)} />
            </Field>
            <Field label="Email">
              <input className={fieldClass} type="email" value={draft.email} onChange={(e) => update("email", e.target.value)} />
            </Field>
            <Field label="Payer">
              <input className={fieldClass} value={draft.payerName} onChange={(e) => update("payerName", e.target.value)} />
            </Field>
            <Field label="Member id">
              <input className={fieldClass} value={draft.memberId} onChange={(e) => update("memberId", e.target.value)} />
            </Field>
          </div>
          <Field label="Address">
            <input className={fieldClass} value={draft.address} onChange={(e) => update("address", e.target.value)} />
          </Field>
          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="City">
              <input className={fieldClass} value={draft.city} onChange={(e) => update("city", e.target.value)} />
            </Field>
            <Field label="State">
              <input className={fieldClass} value={draft.state} onChange={(e) => update("state", e.target.value)} />
            </Field>
            <Field label="Postal">
              <input className={fieldClass} value={draft.postalCode} onChange={(e) => update("postalCode", e.target.value)} />
            </Field>
          </div>
          <Field label="Reason for visit / HPI">
            <textarea
              className={fieldClass}
              rows={3}
              value={draft.reasonForVisit}
              onChange={(e) => update("reasonForVisit", e.target.value)}
            />
          </Field>
          {draft.injuryCase ? (
            <p className="text-sm text-muted">
              Injury case draft: DOI {draft.injuryCase.dateOfInjury || "—"} · {draft.injuryCase.description || "no description"} ·
              attorney {draft.injuryCase.attorneyName || "—"}
            </p>
          ) : null}
          {draft.problems.length ? (
            <p className="text-sm text-muted">
              Problems: {draft.problems.map((problem) => `${problem.name}${problem.icd ? ` (${problem.icd})` : ""}`).join("; ")}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="submit" disabled={busy !== "idle"}>
              {busy === "save"
                ? "Saving…"
                : match
                  ? "Update existing chart"
                  : "Confirm and create chart"}
            </Button>
            {match && match.reason === "name_dob" ? (
              <Button
                type="button"
                variant="secondary"
                disabled={busy !== "idle"}
                onClick={() => void save("create")}
              >
                Create separate chart anyway
              </Button>
            ) : null}
          </div>
        </form>
      ) : null}
      {error ? <p className="text-sm text-emergency">{error}</p> : null}
    </section>
  );
}
