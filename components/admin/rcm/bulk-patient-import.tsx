"use client";

import Link from "next/link";
import { useMemo, useState, type ChangeEvent, type InputHTMLAttributes } from "react";
import { pushPortalChartsAction } from "@/app/portal/actions";
import { Button } from "@/components/ui/button";
import { Field, fieldClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";
import {
  bulkCardNeedsName,
  groupBulkImportFiles,
  resolveBulkCardMatch,
  type BulkImportCard,
  type BulkImportPacket,
} from "@/lib/ocr/bulk-import";
import {
  mergeOnboardIntoPatient,
  onboardDraftAcceptKeys,
  patientFromOnboardDraftWithHashes,
  type OnboardMergeOverwriteKey,
} from "@/lib/ocr/dedupe";
import { extractOnboardFromFiles } from "@/lib/ocr/extract-client";
import { fileOnboardPacketToChart } from "@/lib/ocr/file-onboard";
import { markSlotsFromUploads, type OnboardDraft } from "@/lib/ocr/onboard-draft";
import { patientName } from "@/lib/rcm/format";
import type { Sex } from "@/lib/rcm/types";
import { cn } from "@/lib/utils";

const UPDATE_COMPARE_FIELDS: Array<{ key: OnboardMergeOverwriteKey; label: string }> = [
  { key: "firstName", label: "First name" },
  { key: "lastName", label: "Last name" },
  { key: "dateOfBirth", label: "Date of birth" },
  { key: "phone", label: "Phone" },
  { key: "email", label: "Email" },
  { key: "payerName", label: "Payer" },
  { key: "memberId", label: "Member id" },
];

function draftFieldValue(draft: OnboardDraft, key: OnboardMergeOverwriteKey): string {
  const value = draft[key as keyof OnboardDraft];
  if (typeof value === "string") return value.trim();
  if (key === "sex" && draft.sex !== "unknown") return draft.sex;
  return "";
}

function matchFieldValue(
  match: NonNullable<BulkImportCard["match"]>,
  key: OnboardMergeOverwriteKey,
): string {
  if (key === "firstName" || key === "lastName") {
    const parts = match.name.split(/\s+/);
    if (key === "firstName") return parts[0] || "";
    return parts.slice(1).join(" ");
  }
  if (key === "dateOfBirth") return match.dateOfBirth || "";
  if (key === "phone") return match.phone || "";
  if (key === "email") return match.email || "";
  if (key === "payerName") return match.payerName || "";
  if (key === "memberId") return match.memberId || "";
  return "";
}

type Phase = "idle" | "extracting" | "review" | "creating" | "done";

type ApplyResult = {
  created: { id: string; name: string }[];
  updated: { id: string; name: string }[];
  fileNotes: string[];
  errors: string[];
};

function updateDraftField<K extends keyof OnboardDraft>(
  draft: OnboardDraft,
  key: K,
  value: OnboardDraft[K],
): OnboardDraft {
  return { ...draft, [key]: value };
}

export function BulkPatientImport({
  embedded = false,
}: {
  /** When true, omit the outer card chrome — used inside RecordsImportCard. */
  embedded?: boolean;
} = {}) {
  const { patients, rememberPatient } = useRcm();
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState("");
  const [folderLabel, setFolderLabel] = useState("");
  const [packets, setPackets] = useState<BulkImportPacket[]>([]);
  const [extractIndex, setExtractIndex] = useState(0);
  const [cards, setCards] = useState<BulkImportCard[]>([]);
  const [activeIndex, setActiveIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [applyResult, setApplyResult] = useState<ApplyResult | null>(null);
  const [unreadAckChecked, setUnreadAckChecked] = useState(false);

  const pendingCards = useMemo(
    () => cards.filter((card) => card.status === "pending" || card.status === "failed"),
    [cards],
  );
  const approvedCards = useMemo(() => cards.filter((card) => card.status === "approved"), [cards]);
  const deniedCount = useMemo(() => cards.filter((card) => card.status === "denied").length, [cards]);
  const approvedCreates = useMemo(
    () => approvedCards.filter((card) => card.intent === "create").length,
    [approvedCards],
  );
  const approvedUpdates = useMemo(
    () => approvedCards.filter((card) => card.intent === "update").length,
    [approvedCards],
  );

  const activeCard = pendingCards[activeIndex] ?? null;
  const needsUnreadAck = Boolean(
    activeCard &&
      ((activeCard.ocr?.partial ?? false) ||
        (activeCard.ocr?.failed_pages?.length ?? 0) > 0 ||
        (activeCard.draft?.warnings ?? []).some((warning) => /OCR truncated/i.test(warning))),
  );
  const canApprove =
    Boolean(activeCard?.draft) &&
    !bulkCardNeedsName(activeCard?.draft ?? null) &&
    phase === "review" &&
    (!needsUnreadAck || unreadAckChecked);

  function resetAll() {
    setPhase("idle");
    setError("");
    setFolderLabel("");
    setPackets([]);
    setExtractIndex(0);
    setCards([]);
    setActiveIndex(0);
    setFlipped(false);
    setApplyResult(null);
    setUnreadAckChecked(false);
  }

  function onFolderChange(event: ChangeEvent<HTMLInputElement>) {
    const list = event.target.files;
    setError("");
    setApplyResult(null);
    if (!list?.length) {
      setPackets([]);
      setFolderLabel("");
      return;
    }
    const files = Array.from(list);
    const firstRel = (files[0] as File & { webkitRelativePath?: string }).webkitRelativePath || "";
    const root = firstRel.split("/")[0] || "folder";
    setFolderLabel(root);
    const grouped = groupBulkImportFiles(files);
    setPackets(grouped);
    if (!grouped.length) {
      setError("That folder has no PDF or image patient records.");
    }
  }

  async function onExtract() {
    if (!packets.length) {
      setError("Choose a folder with patient records first.");
      return;
    }
    setPhase("extracting");
    setError("");
    setCards([]);
    setActiveIndex(0);
    setFlipped(false);
    const nextCards: BulkImportCard[] = [];

    for (let i = 0; i < packets.length; i += 1) {
      const packet = packets[i]!;
      setExtractIndex(i + 1);
      const result = await extractOnboardFromFiles(packet.files);
      if (!result.ok) {
        nextCards.push({
          id: packet.id,
          packet,
          draft: null,
          fingerprints: [],
          ocr: null,
          error: result.message,
          status: "failed",
          intent: "create",
          match: null,
          forceCreate: false,
        });
        continue;
      }
      const resolved = resolveBulkCardMatch(patients, result.draft, result.fingerprints, false);
      const acceptFields =
        resolved.intent === "update"
          ? onboardDraftAcceptKeys(result.draft).filter((key) =>
              UPDATE_COMPARE_FIELDS.some((field) => field.key === key),
            )
          : undefined;
      nextCards.push({
        id: packet.id,
        packet,
        draft: result.draft,
        fingerprints: result.fingerprints,
        ocr: result.ocr,
        status: "pending",
        intent: resolved.intent,
        match: resolved.match,
        forceCreate: false,
        acceptFields,
      });
    }

    setCards(nextCards);
    setPhase("review");
    setActiveIndex(0);
  }

  function patchActiveDraft<K extends keyof OnboardDraft>(key: K, value: OnboardDraft[K]) {
    if (!activeCard?.draft) return;
    const cardId = activeCard.id;
    setCards((current) =>
      current.map((card) => {
        if (card.id !== cardId || !card.draft) return card;
        const draft = updateDraftField(card.draft, key, value);
        const resolved = resolveBulkCardMatch(patients, draft, card.fingerprints, card.forceCreate);
        const acceptFields =
          resolved.intent === "update"
            ? (card.acceptFields ??
                onboardDraftAcceptKeys(draft).filter((field) =>
                  UPDATE_COMPARE_FIELDS.some((row) => row.key === field),
                ))
            : undefined;
        return { ...card, draft, intent: resolved.intent, match: resolved.match, acceptFields };
      }),
    );
  }

  function toggleAcceptField(key: OnboardMergeOverwriteKey, checked: boolean) {
    if (!activeCard) return;
    const cardId = activeCard.id;
    setCards((current) =>
      current.map((card) => {
        if (card.id !== cardId) return card;
        const currentKeys = card.acceptFields ?? [];
        const acceptFields = checked
          ? [...new Set([...currentKeys, key])]
          : currentKeys.filter((item) => item !== key);
        return { ...card, acceptFields };
      }),
    );
  }

  function setActiveForceCreate(forceCreate: boolean) {
    if (!activeCard) return;
    const cardId = activeCard.id;
    setCards((current) =>
      current.map((card) => {
        if (card.id !== cardId) return card;
        // Fingerprint means these exact files are already on that chart — stay on update.
        if (card.match?.reason === "fingerprint") {
          const resolved = resolveBulkCardMatch(patients, card.draft, card.fingerprints, false);
          return { ...card, forceCreate: false, intent: resolved.intent, match: resolved.match };
        }
        const resolved = resolveBulkCardMatch(patients, card.draft, card.fingerprints, forceCreate);
        return { ...card, forceCreate, intent: resolved.intent, match: resolved.match };
      }),
    );
  }

  function decide(cardId: string, status: "approved" | "denied") {
    setFlipped(false);
    setUnreadAckChecked(false);
    const updated = cards.map((card) => (card.id === cardId ? { ...card, status } : card));
    const stillPending = updated.filter((card) => card.status === "pending" || card.status === "failed");
    setCards(updated);
    setActiveIndex((index) => (stillPending.length ? Math.min(index, stillPending.length - 1) : 0));
  }

  function onDeny() {
    if (!activeCard) return;
    decide(activeCard.id, "denied");
  }

  function onApprove() {
    if (!activeCard?.draft || !canApprove) return;
    decide(activeCard.id, "approved");
  }

  async function onApplyApproved() {
    if (!approvedCards.length) {
      setError("Approve at least one draft before applying.");
      return;
    }
    setPhase("creating");
    setError("");
    const created: ApplyResult["created"] = [];
    const updated: ApplyResult["updated"] = [];
    const fileNotes: string[] = [];
    const errors: string[] = [];

    for (const card of approvedCards) {
      if (!card.draft) continue;
      const label =
        `${card.draft.firstName} ${card.draft.lastName}`.trim() || card.packet.label;
      const accepted =
        card.intent === "update" && card.acceptFields
          ? card.acceptFields
          : onboardDraftAcceptKeys(card.draft);
      let patient =
        card.intent === "update" && card.match
          ? (() => {
              const existing = patients.find((row) => row.id === card.match!.patientId);
              if (!existing) return null;
              return mergeOnboardIntoPatient(existing, card.draft!, card.fingerprints, {
                accept: accepted,
                overwrite: accepted,
              });
            })()
          : patientFromOnboardDraftWithHashes(
              card.draft,
              `p_${crypto.randomUUID().slice(0, 8)}`,
              card.fingerprints,
            );

      if (!patient) {
        errors.push(`${label}: matched chart is no longer in the desk — re-extract or create as new.`);
        continue;
      }

      const isUpdate = card.intent === "update";
      const result = await pushPortalChartsAction({ patients: [patient], appointments: [] });
      if (!result.ok) {
        errors.push(`${patientName(patient)}: ${result.error || "Could not save chart."}`);
        continue;
      }

      let saved = patient;
      if (card.packet.files.length) {
        const filed = await fileOnboardPacketToChart({
          patientId: patient.id,
          files: card.packet.files,
          hints: card.draft.documentHints,
          pageLabels: card.ocr?.page_labels ?? [],
        });
        if (filed.uploaded.length) {
          saved = {
            ...patient,
            documents: markSlotsFromUploads(patient.documents, filed.uploaded),
          };
          await pushPortalChartsAction({ patients: [saved], appointments: [] });
        }
        if (filed.errors.length) {
          fileNotes.push(`${patientName(patient)}: ${filed.errors.slice(0, 2).join("; ")}`);
        }
      }

      rememberPatient(saved);
      const entry = { id: saved.id, name: patientName(saved) };
      if (isUpdate) updated.push(entry);
      else created.push(entry);
    }

    setApplyResult({ created, updated, fileNotes, errors });
    setPhase("done");
  }

  const reviewDone = pendingCards.length === 0 && (phase === "review" || phase === "creating");
  const isCreating = phase === "creating";

  const body = (
    <>
      {!embedded ? (
        <div>
          <p className="kicker text-oxide-deep">Bulk</p>
          <h2 className="mt-2 font-display text-3xl tracking-tight text-ink sm:text-4xl">
            Bulk folder import
          </h2>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-muted sm:text-base">
            Choose a folder of patient records. Subfolders become one draft each; loose PDFs and images at
            the root become one draft per file. After OCR we detect existing charts (fingerprint or
            name + date of birth) and put matches in the queue as updates — not duplicate patients.
            Flip, edit, Approve, or Deny each card, then apply only what you approved.
          </p>
        </div>
      ) : null}

      {phase === "idle" || phase === "extracting" ? (
        <div className="grid gap-3">
          <Field label="Folder">
            <input
              className={fieldClass}
              type="file"
              multiple
              disabled={phase === "extracting"}
              onChange={onFolderChange}
              {...({ webkitdirectory: "", directory: "" } as InputHTMLAttributes<HTMLInputElement>)}
            />
          </Field>
          {folderLabel ? (
            <p className="text-sm text-muted">
              {folderLabel} · {packets.length} patient packet{packets.length === 1 ? "" : "s"}
              {packets.length
                ? ` · ${packets.reduce((sum, packet) => sum + packet.files.length, 0)} file${packets.reduce((sum, packet) => sum + packet.files.length, 0) === 1 ? "" : "s"}`
                : ""}
            </p>
          ) : null}
          <Button type="button" variant="secondary" disabled={phase === "extracting" || !packets.length} onClick={() => void onExtract()}>
            {phase === "extracting"
              ? `Reading ${extractIndex} of ${packets.length}…`
              : "Extract drafts"}
          </Button>
        </div>
      ) : null}

      {phase === "extracting" ? (
        <div className="h-2 overflow-hidden rounded-full bg-black/5">
          <div
            className="h-full rounded-full bg-oxide transition-[width] duration-300"
            style={{ width: `${packets.length ? Math.round((extractIndex / packets.length) * 100) : 0}%` }}
          />
        </div>
      ) : null}

      {phase === "review" || phase === "creating" ? (
        <div className="grid gap-4">
          <div className="flex flex-wrap items-center gap-3 text-sm text-muted">
            <span>
              {pendingCards.length} left · {approvedCards.length} approved · {deniedCount} denied
            </span>
            {folderLabel ? <span className="text-ink/50">· {folderLabel}</span> : null}
          </div>

          {activeCard ? (
            <div className="grid gap-3">
              <div className="[perspective:1200px]">
                <div
                  className={cn(
                    "relative h-[36rem] transition-transform duration-500 [transform-style:preserve-3d]",
                    flipped && "[transform:rotateY(180deg)]",
                  )}
                >
                  <div
                    aria-hidden={flipped}
                    className={cn(
                      "absolute inset-0 grid auto-rows-min content-start gap-3 overflow-y-auto rounded-2xl border border-line bg-card p-5 [backface-visibility:hidden] sm:p-6",
                      flipped && "pointer-events-none invisible",
                    )}
                  >
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="text-xs uppercase tracking-[0.14em] text-muted">
                          {activeCard.intent === "update" ? "Update existing" : "New chart"}
                        </p>
                        <h3 className="mt-1 font-display text-2xl tracking-tight text-ink">
                          {activeCard.draft
                            ? `${activeCard.draft.firstName || "—"} ${activeCard.draft.lastName || ""}`.trim()
                            : activeCard.packet.label}
                        </h3>
                        <p className="mt-1 text-sm text-muted">
                          {activeCard.packet.files.length} file
                          {activeCard.packet.files.length === 1 ? "" : "s"} · {activeCard.packet.label}
                        </p>
                      </div>
                      <div className="grid justify-items-end gap-1">
                        <span
                          className={cn(
                            "rounded-full px-2.5 py-0.5 text-xs font-medium",
                            activeCard.intent === "update"
                              ? "bg-oxide/15 text-oxide-deep"
                              : "bg-black/[0.06] text-ink",
                          )}
                        >
                          {activeCard.intent === "update" ? "Update" : "New"}
                        </span>
                        {activeCard.ocr ? (
                          <p className="text-xs text-muted">
                            {activeCard.ocr.method_used} · {activeCard.ocr.page_count} pages
                            {activeCard.ocr.partial ? (
                              <span className="text-amber-800"> · partial extraction</span>
                            ) : null}
                            {(activeCard.ocr.failed_pages?.length ?? 0) > 0 ? (
                              <span className="text-amber-800">
                                {" "}
                                · {activeCard.ocr.failed_pages!.length} page
                                {activeCard.ocr.failed_pages!.length === 1 ? "" : "s"} unread
                              </span>
                            ) : null}
                          </p>
                        ) : null}
                      </div>
                    </div>

                    {activeCard.error ? (
                      <p className="rounded-md bg-emergency/10 px-3 py-2 text-sm text-emergency">
                        {activeCard.error}
                      </p>
                    ) : null}

                    {activeCard.match ? (
                      <div className="grid gap-2 rounded-md bg-black/[0.04] px-3 py-2 text-sm leading-relaxed">
                        <p>
                          {activeCard.match.reason === "fingerprint"
                            ? `These exact files were already imported for ${activeCard.match.name}. Approve merges reviewed fields and files into that chart.`
                            : activeCard.match.reason === "name_dob_fuzzy"
                              ? `Possible match: a chart for ${activeCard.match.name} has the same date of birth and a similar name. Verify before approving an update.`
                              : activeCard.match.reason === "member_id"
                                ? `Possible match: a chart for ${activeCard.match.name} has the same date of birth and member id. Verify before approving an update.`
                                : activeCard.match.reason === "phone"
                                  ? `Possible match: a chart for ${activeCard.match.name} has the same date of birth and phone. Verify before approving an update.`
                                  : `A chart already exists for ${activeCard.match.name} (same name and date of birth). Approve updates that chart instead of creating a duplicate.`}
                          {activeCard.match.reason === "name_dob_fuzzy" ||
                          activeCard.match.reason === "member_id" ||
                          activeCard.match.reason === "phone" ? (
                            <span className="ml-1 text-amber-800">(possible match — verify)</span>
                          ) : null}
                        </p>
                        <dl className="grid gap-1 text-muted sm:grid-cols-2">
                          <div>
                            <dt className="text-xs uppercase tracking-[0.12em]">On chart now</dt>
                            <dd className="text-ink">{activeCard.match.name}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-[0.12em]">Date of birth</dt>
                            <dd className="text-ink">{activeCard.match.dateOfBirth || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-[0.12em]">Payer</dt>
                            <dd className="text-ink">{activeCard.match.payerName || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-[0.12em]">Member id</dt>
                            <dd className="text-ink">{activeCard.match.memberId || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-[0.12em]">Phone</dt>
                            <dd className="text-ink">{activeCard.match.phone || "—"}</dd>
                          </div>
                          <div>
                            <dt className="text-xs uppercase tracking-[0.12em]">Email</dt>
                            <dd className="text-ink">{activeCard.match.email || "—"}</dd>
                          </div>
                        </dl>
                        {activeCard.match.reason === "name_dob" ||
                        activeCard.match.reason === "name_dob_fuzzy" ||
                        activeCard.match.reason === "member_id" ||
                        activeCard.match.reason === "phone" ? (
                          <label className="mt-1 flex items-start gap-2 text-sm text-ink">
                            <input
                              type="checkbox"
                              className="mt-1"
                              checked={activeCard.forceCreate}
                              onChange={(event) => setActiveForceCreate(event.target.checked)}
                            />
                            <span>Create a separate chart anyway (ignore this match)</span>
                          </label>
                        ) : null}
                      </div>
                    ) : null}

                    {activeCard.intent === "update" && activeCard.match && activeCard.draft ? (
                      <div className="grid gap-2 rounded-md border border-line bg-card/60 px-3 py-2">
                        <p className="text-xs uppercase tracking-[0.12em] text-muted">
                          Select fields to update
                        </p>
                        <div className="grid gap-1.5">
                          {UPDATE_COMPARE_FIELDS.map(({ key, label }) => {
                            const chartValue = matchFieldValue(activeCard.match!, key);
                            const draftValue = draftFieldValue(activeCard.draft!, key);
                            const isDifferent = Boolean(draftValue) && draftValue !== chartValue;
                            const confidence = activeCard.draft?.fieldConfidence?.[key];
                            if (!draftValue && !chartValue) return null;
                            return (
                              <label key={key} className="flex flex-wrap items-center gap-2 text-sm text-ink">
                                <input
                                  type="checkbox"
                                  checked={activeCard.acceptFields?.includes(key) ?? false}
                                  disabled={!draftValue}
                                  onChange={(event) => toggleAcceptField(key, event.target.checked)}
                                />
                                <span className="min-w-[5.5rem] font-medium">{label}</span>
                                <span className="text-muted">{chartValue || "—"}</span>
                                {isDifferent ? (
                                  <>
                                    <span aria-hidden="true">→</span>
                                    <span className="text-oxide-deep">{draftValue}</span>
                                  </>
                                ) : null}
                                {confidence && confidence !== "missing" ? (
                                  <span
                                    className={
                                      confidence === "high"
                                        ? "text-xs uppercase tracking-[0.08em] text-muted"
                                        : confidence === "medium"
                                          ? "text-xs uppercase tracking-[0.08em] text-amber-800"
                                          : "text-xs uppercase tracking-[0.08em] text-oxide-deep"
                                    }
                                  >
                                    {confidence}
                                  </span>
                                ) : null}
                              </label>
                            );
                          })}
                        </div>
                      </div>
                    ) : null}

                    {activeCard.draft?.warnings.length ? (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                        {activeCard.draft.warnings.slice(0, 4).map((warning) => (
                          <li key={warning}>{warning}</li>
                        ))}
                      </ul>
                    ) : null}

                    {activeCard.draft ? (
                      <div className="grid gap-3 sm:grid-cols-2">
                        <Field label="First name">
                          <input
                            className={fieldClass}
                            value={activeCard.draft.firstName}
                            onChange={(event) => patchActiveDraft("firstName", event.target.value)}
                          />
                        </Field>
                        <Field label="Last name">
                          <input
                            className={fieldClass}
                            value={activeCard.draft.lastName}
                            onChange={(event) => patchActiveDraft("lastName", event.target.value)}
                          />
                        </Field>
                        <Field label="Date of birth">
                          <input
                            className={fieldClass}
                            type="date"
                            value={activeCard.draft.dateOfBirth}
                            onChange={(event) => patchActiveDraft("dateOfBirth", event.target.value)}
                          />
                        </Field>
                        <Field label="Sex">
                          <select
                            className={fieldClass}
                            value={activeCard.draft.sex}
                            onChange={(event) => patchActiveDraft("sex", event.target.value as Sex)}
                          >
                            <option value="female">Female</option>
                            <option value="male">Male</option>
                            <option value="other">Other</option>
                            <option value="unknown">Unknown</option>
                          </select>
                        </Field>
                        <Field label="Phone">
                          <input
                            className={fieldClass}
                            value={activeCard.draft.phone}
                            onChange={(event) => patchActiveDraft("phone", event.target.value)}
                          />
                        </Field>
                        <Field label="Email">
                          <input
                            className={fieldClass}
                            type="email"
                            value={activeCard.draft.email}
                            onChange={(event) => patchActiveDraft("email", event.target.value)}
                          />
                        </Field>
                        <Field label="Payer">
                          <input
                            className={fieldClass}
                            value={activeCard.draft.payerName}
                            onChange={(event) => patchActiveDraft("payerName", event.target.value)}
                          />
                        </Field>
                        <Field label="Member id">
                          <input
                            className={fieldClass}
                            value={activeCard.draft.memberId}
                            onChange={(event) => patchActiveDraft("memberId", event.target.value)}
                          />
                        </Field>
                      </div>
                    ) : (
                      <p className="text-sm text-muted">No draft extracted — deny this packet or flip for file names.</p>
                    )}
                  </div>

                  <div
                    aria-hidden={!flipped}
                    className={cn(
                      "absolute inset-0 grid auto-rows-min content-start gap-3 overflow-y-auto rounded-2xl border border-line bg-card p-5 [backface-visibility:hidden] [transform:rotateY(180deg)] sm:p-6",
                      !flipped && "pointer-events-none invisible",
                    )}
                  >
                    <p className="text-xs uppercase tracking-[0.14em] text-muted">Clinical extract</p>
                    {activeCard.draft ? (
                      <>
                        <p className="text-sm leading-relaxed text-ink">
                          {activeCard.draft.reasonForVisit || "No reason for visit extracted."}
                        </p>
                        <p className="text-sm text-muted">
                          {[
                            activeCard.draft.address,
                            activeCard.draft.city,
                            activeCard.draft.state,
                            activeCard.draft.postalCode,
                          ]
                            .filter(Boolean)
                            .join(", ") || "No address extracted."}
                        </p>
                        <p className="text-sm text-muted">
                          Problems ({activeCard.draft.problems.length}):{" "}
                          {activeCard.draft.problems
                            .slice(0, 6)
                            .map((problem) => `${problem.name}${problem.icd ? ` (${problem.icd})` : ""}`)
                            .join("; ") || "none"}
                        </p>
                        <p className="text-sm text-muted">
                          Medications ({activeCard.draft.medications.length}):{" "}
                          {activeCard.draft.medications
                            .slice(0, 6)
                            .map((med) => med.name)
                            .join("; ") || "none"}
                        </p>
                        <p className="text-sm text-muted">
                          Allergies ({activeCard.draft.allergies.length}):{" "}
                          {activeCard.draft.allergies
                            .slice(0, 6)
                            .map((allergy) => allergy.substance)
                            .join("; ") || "none"}
                        </p>
                        {activeCard.draft.sourceSummary ? (
                          <p className="text-xs leading-relaxed text-muted">{activeCard.draft.sourceSummary}</p>
                        ) : null}
                      </>
                    ) : (
                      <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                        {activeCard.packet.files.map((file) => (
                          <li key={file.name + file.size}>{file.name}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
              </div>

              {needsUnreadAck ? (
                <label className="flex items-start gap-2 text-sm text-ink">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={unreadAckChecked}
                    onChange={(event) => setUnreadAckChecked(event.target.checked)}
                  />
                  <span>
                    I reviewed unread / truncated pages (or will fill missing fields manually).
                  </span>
                </label>
              ) : null}

              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={() => setFlipped((value) => !value)}>
                  {flipped ? "Show front" : "Flip card"}
                </Button>
                <Button type="button" variant="secondary" onClick={onDeny}>
                  Deny
                </Button>
                <Button type="button" disabled={!canApprove} onClick={onApprove}>
                  {activeCard.intent === "update" ? "Approve update" : "Approve new"}
                </Button>
              </div>
            </div>
          ) : null}

          {reviewDone ? (
            <div className="grid gap-3 rounded-2xl border border-line bg-card/80 p-5">
              <p className="font-display text-2xl tracking-tight text-ink">
                {approvedCards.length
                  ? `${approvedCards.length} draft${approvedCards.length === 1 ? "" : "s"} ready · ${approvedCreates} new · ${approvedUpdates} update${approvedUpdates === 1 ? "" : "s"}`
                  : "No drafts approved"}
              </p>
              {approvedCards.length ? (
                <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
                  {approvedCards.map((card) => (
                    <li key={card.id}>
                      {card.intent === "update" ? "Update · " : "New · "}
                      {card.draft
                        ? `${card.draft.firstName} ${card.draft.lastName}`.trim()
                        : card.packet.label}
                      {card.match ? ` → ${card.match.name}` : ""}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted">
                  Deny finished the deck with nothing to apply. Start over with another folder if needed.
                </p>
              )}
              <div className="flex flex-wrap gap-2">
                {approvedCards.length ? (
                  <Button type="button" disabled={isCreating} onClick={() => void onApplyApproved()}>
                    {isCreating
                      ? "Applying…"
                      : `Apply ${approvedCards.length} approved`}
                  </Button>
                ) : null}
                <Button type="button" variant="secondary" disabled={isCreating} onClick={resetAll}>
                  Start over
                </Button>
              </div>
            </div>
          ) : null}
        </div>
      ) : null}

      {phase === "done" && applyResult ? (
        <div className="grid gap-3 rounded-2xl border border-line bg-card p-5">
          <p className="font-display text-2xl tracking-tight text-ink">
            {[
              applyResult.created.length
                ? `Created ${applyResult.created.length} chart${applyResult.created.length === 1 ? "" : "s"}`
                : "",
              applyResult.updated.length ? `Updated ${applyResult.updated.length}` : "",
            ]
              .filter(Boolean)
              .join(" · ") || "Nothing applied"}
          </p>
          {applyResult.created.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {applyResult.created.map((item) => (
                <li key={item.id}>
                  New ·{" "}
                  <Link className="underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900" href={`/admin/operations/patients/${item.id}`}>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {applyResult.updated.length ? (
            <ul className="list-disc space-y-1 pl-5 text-sm text-muted">
              {applyResult.updated.map((item) => (
                <li key={item.id}>
                  Updated ·{" "}
                  <Link className="underline decoration-neutral-300 underline-offset-4 hover:decoration-neutral-900" href={`/admin/operations/patients/${item.id}`}>
                    {item.name}
                  </Link>
                </li>
              ))}
            </ul>
          ) : null}
          {applyResult.errors.length ? (
            <div className="text-sm text-emergency">
              {applyResult.errors.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : null}
          {applyResult.fileNotes.length ? (
            <div className="text-sm text-muted">
              {applyResult.fileNotes.map((item) => (
                <p key={item}>{item}</p>
              ))}
            </div>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button asChild variant="secondary">
              <Link href="/admin/operations/patients">Open patients</Link>
            </Button>
            <Button type="button" variant="secondary" onClick={resetAll}>
              Import another folder
            </Button>
          </div>
        </div>
      ) : null}

      {error ? <p className="text-sm text-emergency">{error}</p> : null}
    </>
  );

  if (embedded) return <div className="grid gap-4">{body}</div>;

  return (
    <section className="relative grid gap-4 overflow-hidden rounded-3xl border border-oxide/25 bg-gradient-to-br from-mint/80 via-card to-paper p-5 shadow-[0_22px_50px_-36px_rgb(10_110_102_/_0.55)] sm:p-6">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-1.5 bg-oxide" aria-hidden="true" />
      {body}
    </section>
  );
}
