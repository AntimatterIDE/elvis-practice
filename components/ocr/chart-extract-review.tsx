"use client";

import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import {
  mergeOnboardIntoPatient,
  type OnboardMergeOverwriteKey,
} from "@/lib/ocr/dedupe";
import { extractOnboardFromFiles } from "@/lib/ocr/extract-client";
import {
  emptyOnboardDraft,
  refreshOnboardWarnings,
  type OnboardDraft,
} from "@/lib/ocr/onboard-draft";
import type { Patient } from "@/lib/rcm/types";
import { cn } from "@/lib/utils";

type ScalarField = {
  key: OnboardMergeOverwriteKey;
  label: string;
  draftValue: string;
  currentValue: string;
};

function draftScalar(draft: OnboardDraft, key: OnboardMergeOverwriteKey): string {
  switch (key) {
    case "firstName":
      return draft.firstName;
    case "lastName":
      return draft.lastName;
    case "dateOfBirth":
      return draft.dateOfBirth;
    case "sex":
      return draft.sex === "unknown" ? "" : draft.sex;
    case "phone":
      return draft.phone;
    case "email":
      return draft.email;
    case "address":
      return draft.address;
    case "city":
      return draft.city;
    case "state":
      return draft.state;
    case "postalCode":
      return draft.postalCode;
    case "payerName":
      return draft.payerName;
    case "memberId":
      return draft.memberId;
    case "medicalHistory":
      return [draft.reasonForVisit, draft.medicalHistory].filter(Boolean).join("\n\n");
    case "surgicalHistory":
      return draft.surgicalHistory;
    case "pcpName":
      return draft.pcpName;
    case "pcpPhone":
      return draft.pcpPhone;
    case "referringName":
      return draft.referringName;
    case "referringPhone":
      return draft.referringPhone;
    case "pharmacyName":
      return draft.pharmacyName;
    case "pharmacyPhone":
      return draft.pharmacyPhone;
    case "emergencyName":
      return draft.emergencyName;
    case "emergencyPhone":
      return draft.emergencyPhone;
    case "emergencyRelation":
      return draft.emergencyRelation;
    default:
      return "";
  }
}

function patientScalar(patient: Patient, key: OnboardMergeOverwriteKey): string {
  switch (key) {
    case "firstName":
      return patient.firstName;
    case "lastName":
      return patient.lastName;
    case "dateOfBirth":
      return patient.dateOfBirth;
    case "sex":
      return patient.sex === "unknown" ? "" : patient.sex;
    case "phone":
      return patient.phone;
    case "email":
      return patient.email;
    case "address":
      return patient.address;
    case "city":
      return patient.city;
    case "state":
      return patient.state;
    case "postalCode":
      return patient.postalCode;
    case "payerName":
      return patient.payerName;
    case "memberId":
      return patient.memberId;
    case "medicalHistory":
      return patient.medicalHistory;
    case "surgicalHistory":
      return patient.surgicalHistory;
    case "pcpName":
      return patient.pcpName;
    case "pcpPhone":
      return patient.pcpPhone;
    case "referringName":
      return patient.referringName;
    case "referringPhone":
      return patient.referringPhone;
    case "pharmacyName":
      return patient.pharmacyName;
    case "pharmacyPhone":
      return patient.pharmacyPhone;
    case "emergencyName":
      return patient.emergencyName;
    case "emergencyPhone":
      return patient.emergencyPhone;
    case "emergencyRelation":
      return patient.emergencyRelation;
    default:
      return "";
  }
}

const SCALAR_FIELDS: Array<{ key: OnboardMergeOverwriteKey; label: string }> = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "payerName", label: "Payer" },
  { key: "memberId", label: "Member id" },
  { key: "address", label: "Address" },
  { key: "city", label: "City" },
  { key: "state", label: "State" },
  { key: "postalCode", label: "Postal code" },
];

export function ChartExtractReview({
  patient,
  files,
  authHeaders,
  autoStart = true,
  onApplied,
  onConfirmDraft,
  onDismiss,
}: {
  patient: Patient;
  files: File[];
  authHeaders?: HeadersInit;
  autoStart?: boolean;
  /** Staff path: receive the merged patient and persist locally + server. */
  onApplied?: (merged: Patient) => void | Promise<void>;
  /** Portal path: send draft + overwrite keys; server merges into the signed-in chart. */
  onConfirmDraft?: (payload: {
    draft: OnboardDraft;
    fingerprints: string[];
    overwrite: OnboardMergeOverwriteKey[];
  }) => void | Promise<void>;
  onDismiss: () => void;
}) {
  const [busy, setBusy] = useState<"idle" | "extract" | "save">("idle");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState<OnboardDraft | null>(null);
  const [fingerprints, setFingerprints] = useState<string[]>([]);
  const [overwrite, setOverwrite] = useState<Set<OnboardMergeOverwriteKey>>(new Set());

  async function runExtract() {
    setBusy("extract");
    setError("");
    setDraft(null);
    setFingerprints([]);
    setOverwrite(new Set());
    const result = await extractOnboardFromFiles(files, { headers: authHeaders });
    if (!result.ok) {
      setError(result.message);
      setBusy("idle");
      return;
    }
    setDraft(
      refreshOnboardWarnings(
        { ...emptyOnboardDraft(), ...result.draft },
        {
          coveredBy: {
            firstName: patient.firstName,
            lastName: patient.lastName,
            phone: patient.phone,
            email: patient.email,
            memberId: patient.memberId,
            payerName: patient.payerName,
          },
        },
      ),
    );
    setFingerprints(result.fingerprints);
    setBusy("idle");
  }

  useEffect(() => {
    if (!autoStart || !files.length) return;
    void runExtract();
    // Intentionally once when the offer mounts with these files.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const conflicts = useMemo(() => {
    if (!draft) return [] as ScalarField[];
    return SCALAR_FIELDS.map((field) => {
      const draftValue = draftScalar(draft, field.key).trim();
      const currentValue = patientScalar(patient, field.key).trim();
      return { ...field, draftValue, currentValue };
    }).filter(
      (field) =>
        field.draftValue &&
        field.currentValue &&
        field.draftValue.toLowerCase() !== field.currentValue.toLowerCase(),
    );
  }, [draft, patient]);

  const injuryConflict = Boolean(
    draft?.injuryCase &&
      Object.values(draft.injuryCase).some(Boolean) &&
      patient.cases[0] &&
      (patient.cases[0].dateOfInjury.trim() || patient.cases[0].description.trim()),
  );
  const problemsConflict = Boolean(draft?.problems.length && patient.problems.length);

  function toggle(key: OnboardMergeOverwriteKey) {
    setOverwrite((current) => {
      const next = new Set(current);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  async function confirm() {
    if (!draft) return;
    setBusy("save");
    setError("");
    try {
      if (onConfirmDraft) {
        await onConfirmDraft({
          draft,
          fingerprints,
          overwrite: [...overwrite],
        });
      } else if (onApplied) {
        const merged = mergeOnboardIntoPatient(patient, draft, fingerprints, {
          overwrite: [...overwrite],
        });
        await onApplied(merged);
      } else {
        throw new Error("No save handler was provided.");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not save the extracted chart fields.");
      setBusy("idle");
      return;
    }
    setBusy("idle");
  }

  return (
    <section className="grid gap-3 rounded-2xl border border-oxide/30 bg-mint/30 p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-xl">Extract into chart</h3>
          <p className="mt-1 text-sm text-muted">
            Files stay in the slot you chose. Review what OCR found, then confirm. Empty chart fields fill
            automatically; check a box only to replace a value that is already filled.
          </p>
        </div>
        <Button type="button" variant="ghost" onClick={onDismiss} disabled={busy !== "idle"}>
          Dismiss
        </Button>
      </div>

      {busy === "extract" ? <p className="text-sm text-muted">Reading those files…</p> : null}
      {error ? <p className="text-sm text-emergency">{error}</p> : null}

      {!draft && busy === "idle" ? (
        <Button type="button" onClick={() => void runExtract()}>
          Extract into chart
        </Button>
      ) : null}

      {draft ? (
        <div className="grid gap-3">
          <dl className="grid gap-2 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted">Name</dt>
              <dd>
                {draft.firstName || draft.lastName
                  ? `${draft.firstName} ${draft.lastName}`.trim()
                  : "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted">Date of birth</dt>
              <dd>{draft.dateOfBirth || "—"}</dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted">Phone / email</dt>
              <dd>
                {draft.phone || "—"} · {draft.email || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted">Payer / member</dt>
              <dd>
                {draft.payerName || "—"} · {draft.memberId || "—"}
              </dd>
            </div>
            <div className="sm:col-span-2">
              <dt className="text-xs uppercase tracking-wider text-muted">Reason / history</dt>
              <dd className="whitespace-pre-wrap">
                {[draft.reasonForVisit, draft.medicalHistory].filter(Boolean).join("\n") || "—"}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted">Problems</dt>
              <dd>
                {draft.problems.length
                  ? draft.problems
                      .slice(0, 4)
                      .map((row) => row.name)
                      .join("; ")
                  : "—"}
                {draft.problems.length > 4 ? ` (+${draft.problems.length - 4})` : ""}
              </dd>
            </div>
            <div>
              <dt className="text-xs uppercase tracking-wider text-muted">Injury</dt>
              <dd>
                {draft.injuryCase
                  ? `${draft.injuryCase.dateOfInjury || "no DOI"} — ${
                      draft.injuryCase.description || draft.injuryCase.notes || "case noted"
                    }`
                  : "—"}
              </dd>
            </div>
          </dl>

          {draft.warnings.length ? (
            <ul className="list-disc pl-5 text-sm text-muted">
              {draft.warnings.slice(0, 4).map((warning) => (
                <li key={warning}>{warning}</li>
              ))}
            </ul>
          ) : null}

          {conflicts.length || injuryConflict || problemsConflict ? (
            <div className="grid gap-2 rounded-xl border border-line bg-card p-3">
              <p className="text-sm font-medium">Replace filled chart fields?</p>
              <p className="text-xs text-muted">Unchecked fields keep what is already on the chart.</p>
              {conflicts.map((field) => (
                <label key={field.key} className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={overwrite.has(field.key)}
                    onChange={() => toggle(field.key)}
                  />
                  <span>
                    <span className="font-medium">{field.label}</span>
                    <span className="block text-muted">
                      Chart: {field.currentValue.slice(0, 80)} → Extracted: {field.draftValue.slice(0, 80)}
                    </span>
                  </span>
                </label>
              ))}
              {injuryConflict ? (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={overwrite.has("injuryCase")}
                    onChange={() => toggle("injuryCase")}
                  />
                  <span>
                    <span className="font-medium">Injury case</span>
                    <span className="block text-muted">Replace the first case fields with extracted values.</span>
                  </span>
                </label>
              ) : null}
              {problemsConflict ? (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={overwrite.has("problems")}
                    onChange={() => toggle("problems")}
                  />
                  <span>
                    <span className="font-medium">Problems list</span>
                    <span className="block text-muted">
                      Replace the chart problem list (otherwise new problems are added).
                    </span>
                  </span>
                </label>
              ) : null}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <Button type="button" onClick={() => void confirm()} disabled={busy !== "idle"}>
              {busy === "save" ? "Saving…" : "Confirm into chart"}
            </Button>
            <Button type="button" variant="ghost" onClick={onDismiss} disabled={busy !== "idle"}>
              Cancel
            </Button>
          </div>
        </div>
      ) : null}

      <p className={cn("text-xs text-muted", files.length ? "" : "hidden")}>
        {files.length === 1 ? files[0]?.name : `${files.length} files`} ready for OCR.
      </p>
    </section>
  );
}
