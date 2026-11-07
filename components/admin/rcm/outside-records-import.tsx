"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { pushPortalChartsAction } from "@/app/portal/actions";
import type { OnboardDraft } from "@/lib/ocr/onboard-draft";
import {
  chartSlotsForOnboardFiles,
  coverageFromPatient,
  emptyOnboardDraft,
  markSlotsFromUploads,
  refreshOnboardWarnings,
} from "@/lib/ocr/onboard-draft";
import {
  findOcrImportMatch,
  mergeOnboardIntoPatient,
  patientFromOnboardDraftWithHashes,
  type OcrImportMatch,
} from "@/lib/ocr/dedupe";
import { fileOnboardPacketToChart } from "@/lib/ocr/file-onboard";
import type { Sex } from "@/lib/rcm/types";
import { patientName } from "@/lib/rcm/format";
import { Field, fieldClass, panelClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";
import { cn } from "@/lib/utils";

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

export function OutsideRecordsImport({ variant = "panel" }: { variant?: "panel" | "hero" }) {
  const router = useRouter();
  const { patients, rememberPatient } = useRcm();
  const hero = variant === "hero";
  const [files, setFiles] = useState<FileList | null>(null);
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
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

  const coveredBy = useMemo(() => coverageFromPatient(match?.patient), [match?.patient]);

  const filingSlots = useMemo(() => {
    if (!draft || !pendingFiles.length) return [] as string[];
    return chartSlotsForOnboardFiles(pendingFiles, draft.documentHints, ocrMeta?.page_labels ?? []);
  }, [draft, pendingFiles, ocrMeta]);

  useEffect(() => {
    if (!draft) return;
    setDraft((current) => (current ? refreshOnboardWarnings(current, { coveredBy }) : current));
    // Recompute soft gaps when an existing chart match covers phone/email/payer.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [coveredBy?.phone, coveredBy?.email, coveredBy?.memberId, coveredBy?.payerName, coveredBy?.firstName, coveredBy?.lastName]);

  function update<K extends keyof OnboardDraft>(key: K, value: OnboardDraft[K]) {
    setDraft((current) =>
      current ? refreshOnboardWarnings({ ...current, [key]: value }, { coveredBy }) : current,
    );
  }

  async function stageLargeFile(file: File) {
    const prepared = await fetch("/api/ocr/onboard/prepare", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        fileName: file.name,
        contentType: file.type || "application/pdf",
        byteSize: file.size,
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
    if (!files?.length) {
      setError("Choose a PDF packet and optional photo ID or insurance card images.");
      return;
    }
    setBusy("extract");
    setError("");
    setDraft(null);
    setOcrMeta(null);
    setFingerprints([]);
    setPendingFiles([]);
    try {
      const selected = Array.from(files);
      const localHashes = await Promise.all(selected.map((file) => sha256Hex(file)));
      // Vercel request bodies cap near 4.5MB — stage larger files via signed upload first.
      const DIRECT_LIMIT = 3.5 * 1024 * 1024;
      const large = selected.filter((file) => file.size > DIRECT_LIMIT);
      const small = selected.filter((file) => file.size <= DIRECT_LIMIT);

      let res: Response;
      if (large.length) {
        const paths = await Promise.all(large.map((file) => stageLargeFile(file)));
        if (small.length) {
          for (const file of small) paths.push(await stageLargeFile(file));
        }
        res = await fetch("/api/ocr/onboard/extract", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ paths }),
        });
      } else {
        const body = new FormData();
        small.forEach((file) => body.append("files", file));
        res = await fetch("/api/ocr/onboard/extract", { method: "POST", body });
      }

      const json = (await res.json().catch(() => null)) as ExtractResponse | null;
      if (!res.ok || !json?.draft) {
        setError(json?.message || `OCR import failed (${res.status}).`);
        setBusy("idle");
        return;
      }
      const hashes = [...new Set([...(json.fingerprints ?? []), ...localHashes].map((item) => item.toLowerCase()))];
      const nextDraft = { ...emptyOnboardDraft(), ...json.draft };
      const matched = findOcrImportMatch(patients, {
        firstName: nextDraft.firstName,
        lastName: nextDraft.lastName,
        dateOfBirth: nextDraft.dateOfBirth,
        fingerprints: hashes,
      });
      setDraft(
        refreshOnboardWarnings(nextDraft, {
          coveredBy: coverageFromPatient(matched?.patient),
        }),
      );
      setFingerprints(hashes);
      setOcrMeta(json.ocr ?? null);
      setPendingFiles(selected);
    } catch (error) {
      const message = error instanceof Error ? error.message : "";
      setError(message || "Could not reach the OCR import API. Large PDFs are staged through storage first — try again.");
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
    let patient =
      mode === "update" && match
        ? mergeOnboardIntoPatient(match.patient, draft, fingerprints)
        : patientFromOnboardDraftWithHashes(draft, `p_${crypto.randomUUID().slice(0, 8)}`, fingerprints);

    const result = await pushPortalChartsAction({ patients: [patient], appointments: [] });
    if (!result.ok) {
      setBusy("idle");
      setError(result.error || "That chart could not be saved for the practice.");
      return;
    }

    let fileNote = "";
    if (pendingFiles.length) {
      const filed = await fileOnboardPacketToChart({
        patientId: patient.id,
        files: pendingFiles,
        hints: draft.documentHints,
        pageLabels: ocrMeta?.page_labels ?? [],
      });
      if (filed.uploaded.length) {
        patient = { ...patient, documents: markSlotsFromUploads(patient.documents, filed.uploaded) };
        await pushPortalChartsAction({ patients: [patient], appointments: [] });
      }
      if (filed.errors.length) {
        fileNote = ` Chart saved, but some files did not store: ${filed.errors.slice(0, 3).join("; ")}`;
      }
    }

    setBusy("idle");
    rememberPatient(patient);
    if (fileNote) {
      setError(fileNote.trim());
      return;
    }
    router.push(`/admin/operations/patients/${patient.id}`);
  }

  return (
    <section
      className={cn(
        "relative grid gap-4 overflow-hidden",
        hero
          ? "rounded-3xl border border-oxide/25 bg-gradient-to-br from-mint/80 via-card to-paper p-5 shadow-[0_22px_50px_-36px_rgb(10_110_102_/_0.55)] sm:p-6"
          : panelClass,
      )}
    >
      {hero ? <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-oxide" aria-hidden="true" /> : null}
      <div>
        {hero ? <p className="kicker text-oxide-deep">Records</p> : null}
        <h2 className={cn("font-display tracking-tight text-ink", hero ? "mt-2 text-3xl sm:text-4xl" : "text-2xl")}>
          {hero ? "Import a packet and open a chart" : "Records"}
        </h2>
        <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted sm:text-base">
          {hero
            ? "Back-office import — no patient link required. Extract, review, and confirm to create or update a chart and file the PDFs."
            : "Extract is safe to re-run on the same PDFs (nothing is saved until you confirm). Large packets upload through storage first so they are not blocked by the request size limit. Confirm updates a matched chart, files the PDFs into chart document slots, and keeps longer clinical text in medical history / case notes."}
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
            <div className="rounded-md bg-black/[0.04] px-3 py-2 text-sm leading-relaxed text-muted">
              <p className="font-medium text-ink">Still useful to fill</p>
              <ul className="mt-1 list-disc space-y-1 pl-5">
                {draft.warnings.map((warning) => (
                  <li key={warning}>{warning}</li>
                ))}
              </ul>
            </div>
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
          <Field label="Reason for visit">
            <textarea
              className={fieldClass}
              rows={2}
              value={draft.reasonForVisit}
              onChange={(e) => update("reasonForVisit", e.target.value)}
            />
          </Field>
          <Field label="Medical history (summary)">
            <textarea
              className={fieldClass}
              rows={4}
              value={draft.medicalHistory}
              onChange={(e) => update("medicalHistory", e.target.value)}
            />
          </Field>
          <Field label="Surgical history">
            <textarea
              className={fieldClass}
              rows={2}
              value={draft.surgicalHistory}
              onChange={(e) => update("surgicalHistory", e.target.value)}
            />
          </Field>
          <Field label="Imaging / EMG findings">
            <textarea
              className={fieldClass}
              rows={4}
              value={draft.imagingFindings}
              onChange={(e) => update("imagingFindings", e.target.value)}
            />
          </Field>
          {draft.injuryCase ? (
            <>
              <div className="grid gap-3 sm:grid-cols-2">
                <Field label="Date of injury">
                  <input
                    className={fieldClass}
                    type="date"
                    value={draft.injuryCase.dateOfInjury}
                    onChange={(e) =>
                      update("injuryCase", draft.injuryCase ? { ...draft.injuryCase, dateOfInjury: e.target.value } : draft.injuryCase)
                    }
                  />
                </Field>
                <Field label="Injury description">
                  <input
                    className={fieldClass}
                    value={draft.injuryCase.description}
                    onChange={(e) =>
                      update("injuryCase", draft.injuryCase ? { ...draft.injuryCase, description: e.target.value } : draft.injuryCase)
                    }
                  />
                </Field>
              </div>
              <Field label="Injury / case notes (summary)">
                <textarea
                  className={fieldClass}
                  rows={4}
                  value={draft.injuryCase.notes}
                  onChange={(e) =>
                    update("injuryCase", draft.injuryCase ? { ...draft.injuryCase, notes: e.target.value } : draft.injuryCase)
                  }
                />
              </Field>
            </>
          ) : null}
          {draft.problems.length ? (
            <p className="text-sm text-muted">
              Problems: {draft.problems.map((problem) => `${problem.name}${problem.icd ? ` (${problem.icd})` : ""}`).join("; ")}
            </p>
          ) : null}
          {filingSlots.length || pendingFiles.length ? (
            <p className="rounded-md bg-black/[0.04] px-3 py-2 text-sm leading-relaxed">
              On confirm, {pendingFiles.length} file{pendingFiles.length === 1 ? "" : "s"} will be filed into:{" "}
              {filingSlots.join(", ") || "outside-records"}. Full OCR text is stored with the chart files — not pasted into
              these summary fields.
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
