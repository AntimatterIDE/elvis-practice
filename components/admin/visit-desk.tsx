"use client";

import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { useSearchParams } from "next/navigation";
import { fieldClass, PageHeader, panelClass } from "@/components/admin/rcm/ui";
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
import { formatClinicDay, formatTime } from "@/lib/rcm/format";
import { rememberedVisit, rememberVisit, subscribeVisitMemory } from "@/lib/rcm/record-visit";

const statusLabel: Record<EncounterStatus, string> = {
  uploaded: "Recording stored",
  transcribing: "Transcribing",
  generating: "Writing the note",
  generating_icd10: "Finding diagnosis codes",
  generating_cpt: "Finding procedure codes",
  review: "Ready for review",
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

function CodeList({ title, codes }: { title: string; codes: VisitCode[] }) {
  return (
    <section>
      <h3 className="text-sm font-medium text-neutral-900">{title}</h3>
      {codes.length === 0 ? (
        <p className="mt-2 text-sm text-muted">None suggested.</p>
      ) : (
        <ul className="mt-2 grid gap-2">
          {codes.map((code) => (
            <li key={`${title}-${code.code}`} className="text-sm">
              <span className="font-medium">{code.code}</span>
              <span className="text-muted"> · {code.description}</span>
              <span className="text-muted"> · level {code.level}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

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
  const [phase, setPhase] = useState<"idle" | "recording" | "uploading" | "working">("idle");
  const recorder = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
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
    setPhase("idle");
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
      body: JSON.stringify({ patientLabel, contentType, byteSize: file.size }),
    });
    const payload = (await created.json()) as { message?: string; encounter?: Encounter; signedUrl?: string };
    if (!created.ok || !payload.encounter || !payload.signedUrl) {
      setMessage(payload.message || "That visit could not be started.");
      setPhase("idle");
      return;
    }
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anon) {
      setMessage("The practice database is not connected.");
      setPhase("idle");
      return;
    }
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", new File([file], `visit.${audioExtension(contentType)}`, { type: contentType }));
    const uploaded = await fetch(payload.signedUrl, {
      method: "PUT",
      headers: { apikey: anon, authorization: `Bearer ${anon}` },
      body,
    });
    apply(payload.encounter);
    if (appointmentId) rememberVisit(appointmentId, payload.encounter.id);
    if (!uploaded.ok) {
      setMessage("That recording could not be stored.");
      setPhase("idle");
      return;
    }
    await processVisit(payload.encounter.id, false);
  }

  async function startRecording() {
    setMessage("");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "video/webm";
      const media = new MediaRecorder(stream, { mimeType });
      chunks.current = [];
      media.ondataavailable = (event) => {
        if (event.data.size > 0) chunks.current.push(event.data);
      };
      media.onstop = () => {
        for (const track of stream.getTracks()) track.stop();
        const blob = new Blob(chunks.current, { type: mimeType });
        const file = new File([blob], `visit.${audioExtension(mimeType)}`, { type: mimeType });
        void storeRecording(file);
      };
      recorder.current = media;
      media.start();
      setPhase("recording");
    } catch {
      setMessage("The microphone is unavailable. Choose an audio file instead.");
    }
  }

  function stopRecording() {
    recorder.current?.stop();
    recorder.current = null;
    setPhase("uploading");
  }

  const busy = phase !== "idle";

  return (
    <div className="grid gap-8">
      <PageHeader
        kicker="Clinic"
        title="Visits"
        lede="Record a visit. The recording stays in private storage, then this desk writes a transcript, a SOAP note, and suggested ICD-10 and CPT codes."
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
          <div className="mt-4 flex flex-wrap items-center gap-3">
            {phase === "recording" ? (
              <Button type="button" onClick={stopRecording}>
                Stop and transcribe
              </Button>
            ) : (
              <Button type="button" onClick={startRecording} disabled={busy}>
                Record
              </Button>
            )}
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
          </div>
          <p className="mt-3 text-sm text-muted" aria-live="polite">
            {phase === "recording"
              ? "Recording. Leave this page open."
              : phase === "uploading"
                ? "Storing the recording."
                : phase === "working"
                  ? "Working through the transcript, note, and codes."
                  : "Webm, mp3, m4a, wav, or mp4. 25 MB or smaller."}
          </p>
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
            {selected.status === "error" || (activeEncounter(selected.status) && phase === "idle") ? (
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
            </section>
          ) : null}
          {selected.status === "review" || selected.icd10.length > 0 || selected.billingCodes.length > 0 ? (
            <div className="mt-6 grid gap-6 sm:grid-cols-2">
              <CodeList title="ICD-10" codes={selected.icd10} />
              <CodeList title="CPT" codes={selected.billingCodes} />
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
