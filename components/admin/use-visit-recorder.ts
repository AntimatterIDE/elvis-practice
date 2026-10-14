"use client";

import { useEffect, useRef, useState } from "react";
import {
  chunksForSession,
  deleteLocalSession,
  enqueueAudioWrite,
  filesFromChunks,
  flushAudioWrites,
  matchingSession,
  preferredRecorderMime,
  rotateAudioBytes,
  saveAudioChunk,
  saveLocalSession,
  type AudioChunk,
  type LocalSession,
} from "@/lib/encounters/local-audio";
import { audioExtension } from "@/lib/encounters/types";

export type RecorderMode = "idle" | "recording" | "paused";

type Intent = "record" | "pause" | "finish" | "rotate";

function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function micMessage(error: unknown) {
  if (error instanceof DOMException && (error.name === "NotAllowedError" || error.name === "SecurityError")) {
    return "Allow the microphone for this site, then press Record again.";
  }
  return "The microphone is unavailable. Choose an audio file instead.";
}

export function useVisitRecorder(input: { patientLabel: string; appointmentId: string }) {
  const [mode, setMode] = useState<RecorderMode>("idle");
  const [notice, setNotice] = useState("");
  const [elapsedMs, setElapsedMs] = useState(0);
  const [bytes, setBytes] = useState(0);
  const [screenAwake, setScreenAwake] = useState(false);
  const [savedOnPhone, setSavedOnPhone] = useState(false);
  const [encounterId, setEncounterId] = useState("");
  const [ready, setReady] = useState(false);
  const sessionRef = useRef<LocalSession | null>(null);
  const chunksRef = useRef<AudioChunk[]>([]);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intentRef = useRef<Intent>("pause");
  const partRef = useRef(0);
  const seqRef = useRef(0);
  const partBytesRef = useRef(0);
  const elapsedBaseRef = useRef(0);
  const segmentStartRef = useRef<number | null>(null);
  const wakeLockRef = useRef<WakeLockSentinel | null>(null);
  const audioRef = useRef<AudioContext | null>(null);
  const finishWaitRef = useRef<(() => void) | null>(null);
  const patientLabelRef = useRef(input.patientLabel);
  const appointmentRef = useRef(input.appointmentId);
  patientLabelRef.current = input.patientLabel;
  appointmentRef.current = input.appointmentId;

  function snapshot(status: LocalSession["status"]): LocalSession {
    const current = sessionRef.current;
    const now = Date.now();
    const session: LocalSession = {
      id: current?.id ?? crypto.randomUUID(),
      patientLabel: patientLabelRef.current.trim().slice(0, 120),
      appointmentId: appointmentRef.current,
      mimeType: current?.mimeType || preferredRecorderMime() || "audio/webm",
      createdAt: current?.createdAt ?? now,
      updatedAt: now,
      status,
      bytes: chunksRef.current.reduce((total, chunk) => total + chunk.blob.size, 0),
      elapsedMs: elapsedBaseRef.current,
      encounterId: current?.encounterId ?? "",
    };
    sessionRef.current = session;
    return session;
  }

  async function persist(status: LocalSession["status"]) {
    const session = snapshot(status);
    setBytes(session.bytes);
    setSavedOnPhone(session.bytes > 0);
    setEncounterId(session.encounterId);
    try {
      await saveLocalSession(session);
    } catch {
      setNotice("The recording is still in this tab. Leave this page open until you generate the note.");
    }
  }

  function bankElapsed() {
    if (segmentStartRef.current == null) return;
    elapsedBaseRef.current += Date.now() - segmentStartRef.current;
    segmentStartRef.current = null;
    setElapsedMs(elapsedBaseRef.current);
  }

  async function holdAwake() {
    const previous = wakeLockRef.current;
    wakeLockRef.current = null;
    previous?.release();
    try {
      const lock = await navigator.wakeLock?.request("screen");
      if (!lock) {
        setScreenAwake(false);
      } else {
        wakeLockRef.current = lock;
        setScreenAwake(true);
        lock.addEventListener("release", () => {
          if (wakeLockRef.current !== lock) return;
          wakeLockRef.current = null;
          setScreenAwake(false);
          if (document.visibilityState === "visible" && sessionRef.current && intentRef.current !== "finish") {
            void holdAwake();
          }
        });
      }
    } catch {
      setScreenAwake(false);
    }
    if (!audioRef.current) {
      try {
        const context = new AudioContext();
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        gain.gain.value = 0.0001;
        oscillator.connect(gain);
        gain.connect(context.destination);
        oscillator.start();
        if (context.state === "suspended") await context.resume();
        audioRef.current = context;
      } catch {
        audioRef.current = null;
      }
    }
  }

  function releaseAwake() {
    wakeLockRef.current?.release();
    wakeLockRef.current = null;
    setScreenAwake(false);
    const context = audioRef.current;
    audioRef.current = null;
    if (context) void context.close();
  }

  function stopStream() {
    for (const track of streamRef.current?.getTracks() ?? []) track.stop();
    streamRef.current = null;
  }

  function attachRecorder(stream: MediaStream, mimeType: string) {
    const media = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 32_000 });
    recorderRef.current = media;
    media.ondataavailable = (event) => {
      if (event.data.size < 1) return;
      const chunk = { part: partRef.current, seq: seqRef.current, blob: event.data };
      seqRef.current += 1;
      partBytesRef.current += event.data.size;
      chunksRef.current.push(chunk);
      setBytes(chunksRef.current.reduce((total, item) => total + item.blob.size, 0));
      setSavedOnPhone(true);
      const sessionId = sessionRef.current?.id;
      if (sessionId) {
        void enqueueAudioWrite(async () => {
          await saveAudioChunk(sessionId, chunk);
          await persist(intentRef.current === "record" ? "recording" : "paused");
        });
      }
      if (partBytesRef.current >= rotateAudioBytes && intentRef.current === "record" && media.state === "recording") {
        intentRef.current = "rotate";
        media.stop();
      }
    };
    media.onerror = () => {
      intentRef.current = "pause";
      bankElapsed();
      setMode("paused");
      setNotice("Recording paused. The audio so far is saved on this phone. Press Record to continue this visit.");
      void persist("paused");
    };
    media.onstop = () => {
      const intent = intentRef.current;
      if (intent === "rotate") {
        intentRef.current = "record";
        partRef.current += 1;
        seqRef.current = 0;
        partBytesRef.current = 0;
        const live = streamRef.current;
        if (live && live.getTracks().some((track) => track.readyState === "live")) {
          attachRecorder(live, mimeType);
          recorderRef.current?.start(1000);
          return;
        }
      }
      if (intent === "finish") {
        finishWaitRef.current?.();
        finishWaitRef.current = null;
        return;
      }
      bankElapsed();
      partRef.current += 1;
      seqRef.current = 0;
      partBytesRef.current = 0;
      intentRef.current = "pause";
      setMode("paused");
      if (intent === "record") {
        setNotice("Recording paused because this phone interrupted the microphone. The audio so far is saved on this phone. Press Record to continue this visit.");
      }
      void persist("paused");
    };
    return media;
  }

  async function ensureStream() {
    const current = streamRef.current;
    if (current && current.getTracks().some((track) => track.readyState === "live")) return current;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: { channelCount: 1, echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      streamRef.current = stream;
      return stream;
    } catch {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      return stream;
    }
  }

  async function start() {
    setNotice("");
    try {
      const mimeType = sessionRef.current?.mimeType || preferredRecorderMime();
      if (!mimeType) {
        setNotice("This browser cannot record audio. Choose an audio file instead.");
        return;
      }
      if (!sessionRef.current) {
        snapshot("recording");
        await persist("recording");
      }
      const stream = await ensureStream();
      const existing = recorderRef.current;
      if (existing?.state === "paused") {
        existing.resume();
      } else if (existing?.state === "recording") {
        return;
      } else {
        attachRecorder(stream, mimeType);
        recorderRef.current?.start(1000);
      }
      intentRef.current = "record";
      segmentStartRef.current = Date.now();
      setMode("recording");
      await holdAwake();
      await persist("recording");
    } catch (error) {
      setNotice(micMessage(error));
      setMode(chunksRef.current.length > 0 ? "paused" : "idle");
    }
  }

  async function pause() {
    const media = recorderRef.current;
    bankElapsed();
    if (media?.state === "recording" && typeof media.pause === "function") {
      media.requestData();
      media.pause();
      intentRef.current = "pause";
      setMode("paused");
      await persist("paused");
      return;
    }
    if (media && media.state !== "inactive") {
      intentRef.current = "pause";
      media.stop();
    }
    intentRef.current = "pause";
    setMode("paused");
    await persist("paused");
  }

  async function finish() {
    const media = recorderRef.current;
    bankElapsed();
    intentRef.current = "finish";
    if (media && media.state !== "inactive") {
      await new Promise<void>((resolve) => {
        finishWaitRef.current = resolve;
        media.stop();
      });
    }
    recorderRef.current = null;
    stopStream();
    releaseAwake();
    await flushAudioWrites();
    if (chunksRef.current.length === 0 && sessionRef.current) {
      try {
        chunksRef.current = await chunksForSession(sessionRef.current.id);
      } catch {
        chunksRef.current = [];
      }
    }
    const mimeType = sessionRef.current?.mimeType || "audio/webm";
    const files = filesFromChunks(chunksRef.current, mimeType).map(
      (file) => new File([file.blob], `part-${file.part}.${audioExtension(file.type)}`, { type: file.type }),
    );
    setMode(files.length > 0 ? "paused" : "idle");
    if (files.length > 0) await persist("paused");
    return files;
  }

  async function discard() {
    intentRef.current = "finish";
    const media = recorderRef.current;
    if (media && media.state !== "inactive") media.stop();
    recorderRef.current = null;
    stopStream();
    releaseAwake();
    const id = sessionRef.current?.id;
    sessionRef.current = null;
    chunksRef.current = [];
    partRef.current = 0;
    seqRef.current = 0;
    partBytesRef.current = 0;
    elapsedBaseRef.current = 0;
    segmentStartRef.current = null;
    setElapsedMs(0);
    setBytes(0);
    setSavedOnPhone(false);
    setEncounterId("");
    setMode("idle");
    setNotice("");
    if (id) {
      try {
        await deleteLocalSession(id);
      } catch {
        setNotice("The recording could not be removed from this phone.");
      }
    }
  }

  async function rememberEncounter(id: string) {
    if (!sessionRef.current) return;
    sessionRef.current = { ...sessionRef.current, encounterId: id };
    setEncounterId(id);
    await persist("paused");
  }

  async function clear() {
    const id = sessionRef.current?.id;
    sessionRef.current = null;
    chunksRef.current = [];
    partRef.current = 0;
    seqRef.current = 0;
    partBytesRef.current = 0;
    elapsedBaseRef.current = 0;
    setElapsedMs(0);
    setBytes(0);
    setSavedOnPhone(false);
    setEncounterId("");
    setMode("idle");
    setNotice("");
    releaseAwake();
    if (id) await deleteLocalSession(id).catch(() => undefined);
  }

  useEffect(() => {
    let cancelled = false;
    void matchingSession(input.appointmentId)
      .then(async (session) => {
        if (cancelled || !session || sessionRef.current) return;
        const chunks = await chunksForSession(session.id);
        if (cancelled || sessionRef.current) return;
        sessionRef.current = { ...session, status: "paused" };
        chunksRef.current = chunks;
        const maxPart = chunks.reduce((max, chunk) => Math.max(max, chunk.part), -1);
        partRef.current = maxPart + 1;
        seqRef.current = 0;
        elapsedBaseRef.current = session.elapsedMs;
        setElapsedMs(session.elapsedMs);
        setBytes(session.bytes);
        setSavedOnPhone(chunks.length > 0);
        setEncounterId(session.encounterId);
        setMode(chunks.length > 0 ? "paused" : "idle");
        if (chunks.length > 0) {
          setNotice("A recording for this visit is saved on this phone. Press Record to continue, or generate notes and codes.");
        }
      })
      .catch(() => undefined)
      .finally(() => {
        if (!cancelled) setReady(true);
      });
    return () => {
      cancelled = true;
    };
  }, [input.appointmentId]);

  useEffect(() => {
    if (mode !== "recording") return;
    const timer = setInterval(() => {
      if (segmentStartRef.current != null) {
        setElapsedMs(elapsedBaseRef.current + (Date.now() - segmentStartRef.current));
      }
    }, 500);
    return () => clearInterval(timer);
  }, [mode]);

  useEffect(() => {
    const session = sessionRef.current;
    if (!session) return;
    if (session.patientLabel === input.patientLabel.trim()) return;
    void persist(mode === "recording" ? "recording" : "paused");
  }, [input.patientLabel, mode]);

  useEffect(() => {
    function onVisibility() {
      const media = recorderRef.current;
      if (document.visibilityState === "hidden") {
        if (media?.state === "recording") media.requestData();
        return;
      }
      if (mode === "recording" || mode === "paused") void holdAwake();
      const tracksEnded = streamRef.current?.getTracks().some((track) => track.readyState === "ended") ?? false;
      if (mode === "recording" && (tracksEnded || media?.state === "inactive")) {
        bankElapsed();
        intentRef.current = "pause";
        partRef.current += 1;
        setMode("paused");
        setNotice("Recording paused because the screen locked. The audio so far is saved on this phone. Press Record to continue this visit.");
        void persist("paused");
      }
    }
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, [mode]);

  useEffect(() => {
    if (mode !== "recording") return;
    const onLeave = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", onLeave);
    return () => window.removeEventListener("beforeunload", onLeave);
  }, [mode]);

  useEffect(() => {
    return () => {
      const media = recorderRef.current;
      if (media?.state === "recording") media.requestData();
      if (media && media.state !== "inactive") {
        if (typeof media.pause === "function") media.pause();
        else media.stop();
      }
      for (const track of streamRef.current?.getTracks() ?? []) track.stop();
      wakeLockRef.current?.release();
      void audioRef.current?.close();
    };
  }, []);

  return {
    ready,
    mode,
    notice,
    elapsedLabel: formatElapsed(elapsedMs),
    bytes,
    screenAwake,
    savedOnPhone,
    encounterId,
    start,
    pause,
    finish,
    discard,
    rememberEncounter,
    clear,
  };
}
