"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { fieldClass, PageHeader, panelClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";
import { Button } from "@/components/ui/button";
import {
  acceptedAudioType,
  activeEncounter,
  audioByteLimit,
  audioContentType,
  audioExtension,
  type Encounter,
  type EncounterStatus,
  type VisitCode,
} from "@/lib/encounters/types";
import { formatClinicDay, formatTime, patientName } from "@/lib/rcm/format";
import { claimsHref } from "@/lib/encounters/approve";
import { rememberedVisit, rememberVisit, subscribeVisitMemory } from "@/lib/rcm/record-visit";
import { useVisitRecorder } from "@/components/admin/use-visit-recorder";

const statusLabel: Record<EncounterStatus, string> = {
  uploaded: "Recording stored",
  transcribing: "Transcribing",
  generating: "Writing the note",
  generating_icd10: "Finding diagnosis codes",
  generating_cpt: "Finding procedure codes",
  review: "Ready for review",
  approved: "Approved",
  error: "Needs another try",
};

function when(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function CodeList({
  title,
  codes,
  picked,
  onToggle,
}: {
  title: string;
  codes: VisitCode[];
  picked?: (code: string, approved: boolean) => boolean;
  onToggle?: (code: string, approved: boolean) => void;
}) {
  return (
    <section>
      <h3 className="text-sm font-medium text-neutral-900">{title}</h3>
      {codes.length === 0 ? (
        <p className="mt-2 text-sm text-muted">None suggested.</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {codes.map((code) => {
            const approved = picked ? picked(code.code, code.approved) : code.approved;
            return (
              <li key={`${title}-${code.code}`} className="text-sm">
                {onToggle ? (
                  <label className="flex items-start gap-2">
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={approved}
                      onChange={(event) => onToggle(code.code, event.target.checked)}
                    />
                    <span>
                      <span className="font-medium">{code.code}</span>
                      <span className="text-muted"> · {code.description}</span>
                      <span className="text-muted"> · level {code.level}</span>
                    </span>
                  </label>
                ) : (
                  <>
                    <span className="font-medium">{code.code}</span>
                    <span className="text-muted"> · {code.description}</span>
                    <span className="text-muted"> · level {code.level}</span>
                    {approved ? <span className="text-muted"> · approved</span> : null}
                  </>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}

type ApprovalDraft = {
  id: string;
  note: boolean;
  icd: Record<string, boolean>;
  cpt: Record<string, boolean>;
};

export function VisitDesk({
  ready,
  initialEncounters,
  storageError,
}: {
  ready: boolean;
  initialEncounters: Encounter[];
  storageError: string;
}) {
  const search = useSearchParams();
  const appointmentId = search.get("appointment") ?? "";
  const requestedLabel = search.get("label") ?? "";
  const scheduledWhen = search.get("when") ?? "";
  const scheduledReason = search.get("reason") ?? "";
  const [encounters, setEncounters] = useState(initialEncounters);
  const storedId = useSyncExternalStore(subscribeVisitMemory, () => rememberedVisit(appointmentId), () => "");
  const [pickedId, setPickedId] = useState("");
  const selectedId =
    pickedId ||
    (storedId && encounters.some((encounter) => encounter.id === storedId) ? storedId : "") ||
    encounters[0]?.id ||
    "";
  const [patientLabel, setPatientLabel] = useState(requestedLabel);
  const [message, setMessage] = useState(storageError);
  const [phase, setPhase] = useState<"uploading" | "working" | null>(null);
  const [approval, setApproval] = useState<ApprovalDraft | null>(null);
  const [savingApproval, setSavingApproval] = useState(false);
  const { patients, appointments } = useRcm();
  const recorder = useVisitRecorder({ patientLabel, appointmentId });
  const selected = encounters.find((encounter) => encounter.id === selectedId) ?? null;
  const poll =
    phase === "working" || phase === "uploading" || (selected ? activeEncounter(selected.status) : false);

  useEffect(() => {
    if (!selectedId || !poll) return;
    let cancelled = false;
    const timer = setInterval(async () => {
      const response = await fetch(`/api/encounters/${selectedId}`);
      if (!response.ok) return;
      const payload = (await response.json()) as { encounter?: Encounter };
      if (cancelled || !payload.encounter) return;
      const next = payload.encounter;
      setEncounters((current) => [next, ...current.filter((item) => item.id !== next.id)]);
      setPickedId(next.id);
    }, 2000);
    return () => {
      cancelled = true;
      clearInterval(timer);
    };
  }, [selectedId, poll]);

  function apply(encounter: Encounter) {
    setEncounters((current) => [encounter, ...current.filter((item) => item.id !== encounter.id)]);
    setPickedId(encounter.id);
  }

  async function processVisit(id: string, retry: boolean) {
    setPhase("working");
    setMessage("");
    try {
      const response = await fetch(`/api/encounters/${id}/process`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ retry }),
      });
      const payload = (await response.json()) as { message?: string; encounter?: Encounter | null };
      if (payload.encounter) {
        apply(payload.encounter);
        if (appointmentId) rememberVisit(appointmentId, payload.encounter.id);
      }
      if (!response.ok) setMessage(payload.message || "The visit could not be processed.");
    } catch {
      setMessage("The visit could not be processed. Use Try again when you have service.");
    }
    setPhase(null);
  }

  async function putAudio(signedUrl: string, file: File) {
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anon) throw new Error("The practice database is not connected.");
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    const uploaded = await fetch(signedUrl, {
      method: "PUT",
      headers: { apikey: anon, authorization: `Bearer ${anon}` },
      body,
    });
    if (!uploaded.ok) throw new Error("That recording could not be stored.");
  }

  async function storeRecording(file: File) {
    const contentType = audioContentType(file.type || "audio/webm");
    if (!acceptedAudioType(contentType)) {
      setMessage("Record or choose a webm, mp3, m4a, wav, or mp4 file.");
      return;
    }
    if (file.size < 1 || file.size > audioByteLimit) {
      setMessage("Each recording has to be 25 MB or smaller.");
      return;
    }
    setPhase("uploading");
    setMessage("");
    const created = await fetch("/api/encounters", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ patientLabel, appointmentId, contentType, byteSize: file.size }),
    });
    const payload = (await created.json()) as { message?: string; encounter?: Encounter; signedUrl?: string };
    if (!created.ok || !payload.encounter || !payload.signedUrl) {
      setMessage(payload.message || "That visit could not be started.");
      setPhase(null);
      return;
    }
    try {
      await putAudio(payload.signedUrl, new File([file], `visit.${audioExtension(contentType)}`, { type: contentType }));
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "That recording could not be stored.");
      setPhase(null);
      return;
    }
    apply(payload.encounter);
    if (appointmentId) rememberVisit(appointmentId, payload.encounter.id);
    await processVisit(payload.encounter.id, false);
  }

  async function generateNotes() {
    setMessage("");
    const files = await recorder.finish();
    if (files.length === 0) {
      setMessage("That recording is too short to transcribe.");
      return;
    }
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      setMessage("Saved on this phone. Generate notes and codes again when you have service.");
      return;
    }
    setPhase("uploading");
    const parts = files.map((file) => ({ contentType: audioContentType(file.type || "audio/webm"), byteSize: file.size }));
    let encounterId = recorder.encounterId;
    let uploads: { signedUrl: string }[] = [];
    const savedHere = "The audio is still saved on this phone.";
    try {
      if (!encounterId) {
        const created = await fetch("/api/encounters", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ patientLabel, appointmentId, parts }),
        });
        const payload = (await created.json()) as {
          message?: string;
          encounter?: Encounter;
          uploads?: { signedUrl: string }[];
        };
        if (!created.ok || !payload.encounter || !payload.uploads?.length) {
          setMessage(payload.message || `That visit could not be started. ${savedHere}`);
          setPhase(null);
          return;
        }
        encounterId = payload.encounter.id;
        uploads = payload.uploads;
        await recorder.rememberEncounter(encounterId);
        apply(payload.encounter);
        if (appointmentId) rememberVisit(appointmentId, encounterId);
      } else {
        const resigned = await fetch(`/api/encounters/${encounterId}/uploads`, { method: "POST" });
        const payload = (await resigned.json()) as { message?: string; uploads?: { signedUrl: string }[]; encounter?: Encounter };
        if (!resigned.ok || !payload.uploads?.length) {
          setMessage(payload.message || `That recording could not be stored. ${savedHere}`);
          setPhase(null);
          return;
        }
        uploads = payload.uploads;
        if (payload.encounter) apply(payload.encounter);
      }
    } catch {
      setMessage(`Saved on this phone. Generate notes and codes again when you have service.`);
      setPhase(null);
      return;
    }
    if (uploads.length !== files.length) {
      setMessage("That recording could not be stored. The audio is still saved on this phone.");
      setPhase(null);
      return;
    }
    try {
      for (let index = 0; index < files.length; index += 1) {
        const file = files[index];
        const upload = uploads[index];
        if (!file || !upload) throw new Error("That recording could not be stored.");
        await putAudio(upload.signedUrl, file);
      }
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `${error.message} The audio is still saved on this phone.`
          : "That recording could not be stored. The audio is still saved on this phone.",
      );
      setPhase(null);
      return;
    }
    await recorder.clear();
    await processVisit(encounterId, false);
  }

  async function discardRecording() {
    const encounterId = recorder.encounterId;
    if (!window.confirm("Discard this recording? The audio saved on this phone will be deleted.")) return;
    await recorder.discard();
    if (!encounterId) return;
    await fetch(`/api/encounters/${encounterId}`, { method: "DELETE" });
  }

  const busy = phase !== null || savingApproval;
  const draft = approval?.id === selected?.id ? approval : null;
  const canReview = selected?.status === "review" || selected?.status === "approved";

  function checked(kind: "icd" | "cpt", code: string, saved: boolean) {
    const map = draft?.[kind];
    return map && code in map ? map[code] : saved;
  }

  function noteChecked() {
    if (!selected) return false;
    return draft ? draft.note : selected.noteApproved;
  }

  function ensureDraft(encounter: Encounter): ApprovalDraft {
    if (approval?.id === encounter.id) return approval;
    return {
      id: encounter.id,
      note: encounter.noteApproved,
      icd: Object.fromEntries(encounter.icd10.map((code) => [code.code, code.approved])),
      cpt: Object.fromEntries(encounter.billingCodes.map((code) => [code.code, code.approved])),
    };
  }

  function toggleNote(value: boolean) {
    if (!selected) return;
    setApproval({ ...ensureDraft(selected), note: value });
  }

  function toggleCode(kind: "icd" | "cpt", code: string, value: boolean) {
    if (!selected) return;
    const next = ensureDraft(selected);
    setApproval({ ...next, [kind]: { ...next[kind], [code]: value } });
  }

  const approvedIcd = selected?.icd10.filter((code) => checked("icd", code.code, code.approved)).map((code) => code.code) ?? [];
  const approvedCpt = selected?.billingCodes.filter((code) => checked("cpt", code.code, code.approved)).map((code) => code.code) ?? [];
  const approvalReady = Boolean(selected && noteChecked() && approvedIcd.length > 0 && approvedCpt.length > 0);
  const approvalDirty = Boolean(
    selected &&
      (noteChecked() !== selected.noteApproved ||
        selected.icd10.some((code) => checked("icd", code.code, code.approved) !== code.approved) ||
        selected.billingCodes.some((code) => checked("cpt", code.code, code.approved) !== code.approved)),
  );

  async function saveApproval() {
    if (!selected || !approvalReady) return;
    setSavingApproval(true);
    setMessage("");
    const response = await fetch(`/api/encounters/${selected.id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ noteApproved: true, icd10: approvedIcd, billingCodes: approvedCpt }),
    });
    const payload = (await response.json()) as { message?: string; encounter?: Encounter };
    if (payload.encounter) {
      apply(payload.encounter);
      setApproval(null);
    }
    if (!response.ok) setMessage(payload.message || "The approval could not be saved.");
    setSavingApproval(false);
  }

  const matchedPatientId = (() => {
    if (!selected) return "";
    const visit = appointments.find((appointment) => appointment.id === (selected.appointmentId || appointmentId));
    if (visit) return visit.patientId;
    const label = (selected.patientLabel || requestedLabel).trim().toLowerCase();
    return patients.find((patient) => patientName(patient).trim().toLowerCase() === label)?.id ?? "";
  })();
  const claimLink = selected
    ? claimsHref({
        encounterId: selected.id,
        patientId: matchedPatientId,
        appointmentId: selected.appointmentId || appointmentId,
      })
    : "";

  return (
    <div className="grid gap-8">
      <PageHeader
        kicker="Clinic"
        title="Visits"
        lede="Record a visit on this phone. Pause keeps the same visit open, and Record adds to it. Generate notes and codes when the visit is over."
      />
      {appointmentId ? (
        <p className={`${panelClass} text-sm`}>
          <span className="font-medium">{requestedLabel || "Scheduled visit"}</span>
          {scheduledWhen ? (
            <span className="text-muted">
              {" "}
              · {formatClinicDay(scheduledWhen.slice(0, 10))} · {formatTime(scheduledWhen)}
            </span>
          ) : null}
          {scheduledReason && scheduledReason !== "n/a" ? <span className="text-muted"> · {scheduledReason}</span> : null}
        </p>
      ) : null}
      {message ? (
        <p role="alert" className="text-sm text-emergency">
          {message}
        </p>
      ) : null}
      {ready ? (
        <form
          className={panelClass}
          onSubmit={(event) => {
            event.preventDefault();
          }}
        >
          <label className="grid gap-2 text-sm">
            <span className="font-medium">Visit label</span>
            <input
              className={fieldClass}
              value={patientLabel}
              onChange={(event) => setPatientLabel(event.target.value)}
              maxLength={120}
              placeholder="Patient name, optional"
              disabled={busy}
            />
          </label>
          <div className="mt-4 grid gap-3 sm:flex sm:flex-wrap sm:items-center">
            {recorder.mode === "recording" ? (
              <Button type="button" onClick={() => void recorder.pause()} disabled={busy}>
                Pause
              </Button>
            ) : (
              <Button type="button" onClick={() => void recorder.start()} disabled={busy || !recorder.ready}>
                Record
              </Button>
            )}
            {recorder.mode !== "idle" || recorder.savedOnPhone ? (
              <Button type="button" variant="secondary" onClick={() => void generateNotes()} disabled={busy}>
                Generate notes and codes
              </Button>
            ) : null}
            {recorder.mode === "paused" && recorder.savedOnPhone ? (
              <Button type="button" variant="ghost" onClick={() => void discardRecording()} disabled={busy}>
                Discard
              </Button>
            ) : null}
            {recorder.mode === "idle" ? (
              <label className="text-sm">
                <span className="sr-only">Choose an audio file</span>
                <input
                  type="file"
                  accept="audio/*,video/webm,video/mp4,.webm,.mp3,.m4a,.wav,.mp4"
                  disabled={busy}
                  className="text-sm"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    event.target.value = "";
                    if (file) void storeRecording(file);
                  }}
                />
              </label>
            ) : null}
          </div>
          <p className="mt-3 text-sm text-muted" aria-live="polite">
            {recorder.mode === "recording"
              ? `Recording ${recorder.elapsedLabel}. This screen stays awake. Audio is saved on this phone as you go, even if service drops. Pause keeps this visit open. If the phone locks, press Record to continue.`
              : recorder.mode === "paused"
                ? `Paused ${recorder.elapsedLabel}. Saved on this phone. Record adds to this visit. Generate notes and codes when the visit is over.`
                : phase === "uploading"
                  ? "Storing the recording. It stays on this phone until the upload finishes."
                  : phase === "working"
                    ? "Working through the transcript, note, and codes."
                    : "Webm, mp3, m4a, wav, or mp4. 25 MB or smaller for each segment."}
          </p>
          {recorder.notice ? <p className="mt-2 text-sm text-neutral-900">{recorder.notice}</p> : null}
        </form>
      ) : (
        <p className={`${panelClass} text-sm text-muted`}>
          Connect Supabase and run the encounters migration to record visits. Google Cloud is not required.
        </p>
      )}
      {selected ? (
        <article className={panelClass}>
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="text-xl font-medium text-neutral-900">{selected.patientLabel || "Untitled visit"}</h2>
              <p className="mt-1 text-sm text-muted">
                {when(selected.createdAt)} · {statusLabel[selected.status]}
                {selected.medicalPractice ? ` · ${selected.medicalPractice}` : ""}
              </p>
            </div>
            {selected.status === "error" || (activeEncounter(selected.status) && phase === null) ? (
              <Button type="button" variant="secondary" onClick={() => void processVisit(selected.id, true)} disabled={busy}>
                Try again
              </Button>
            ) : null}
          </div>
          {selected.error ? <p className="mt-4 text-sm text-emergency">{selected.error}</p> : null}
          {selected.transcript ? (
            <section className="mt-6">
              <h3 className="text-sm font-medium text-neutral-900">Transcript</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{selected.transcript}</p>
            </section>
          ) : null}
          {selected.noteClinical ? (
            <section className="mt-6">
              <h3 className="text-sm font-medium text-neutral-900">Note</h3>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed">{selected.noteClinical}</p>
              {canReview ? (
                <label className="mt-4 flex items-center gap-2 text-sm">
                  <input type="checkbox" checked={noteChecked()} onChange={(event) => toggleNote(event.target.checked)} />
                  Approve this note
                </label>
              ) : null}
            </section>
          ) : null}
          {selected.status === "review" || selected.status === "approved" || selected.icd10.length > 0 || selected.billingCodes.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <CodeList
                title="ICD-10"
                codes={selected.icd10}
                picked={canReview ? (code, saved) => checked("icd", code, saved) : undefined}
                onToggle={canReview ? (code, value) => toggleCode("icd", code, value) : undefined}
              />
              <CodeList
                title="CPT"
                codes={selected.billingCodes}
                picked={canReview ? (code, saved) => checked("cpt", code, saved) : undefined}
                onToggle={canReview ? (code, value) => toggleCode("cpt", code, value) : undefined}
              />
            </div>
          ) : null}
          {canReview ? (
            <div className="mt-6 flex flex-wrap items-center gap-3">
              {selected.status !== "approved" || approvalDirty ? (
                <Button type="button" onClick={() => void saveApproval()} disabled={busy || !approvalReady || !approvalDirty}>
                  Approve note and codes
                </Button>
              ) : null}
              {selected.status === "approved" && !approvalDirty ? (
                <Button asChild>
                  <Link href={claimLink}>Open in claims</Link>
                </Button>
              ) : (
                <p className="text-sm text-muted">Approve the note and at least one diagnosis and one procedure code. Then this visit can open in claims.</p>
              )}
            </div>
          ) : null}
        </article>
      ) : null}
      {encounters.length > 0 ? (
        <ul className="grid gap-2">
          {encounters.map((encounter) => (
            <li key={encounter.id}>
              <button
                type="button"
                onClick={() => setPickedId(encounter.id)}
                className={`${panelClass} w-full text-left ${encounter.id === selectedId ? "border-neutral-900" : ""}`}
              >
                <span className="font-medium">{encounter.patientLabel || "Untitled visit"}</span>
                <span className="mt-1 block text-sm text-muted">
                  {when(encounter.createdAt)} · {statusLabel[encounter.status]}
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
