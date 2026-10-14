export const rotateAudioBytes = 18 * 1024 * 1024;
export const minimumAudioBytes = 200;

export type AudioChunk = {
  part: number;
  seq: number;
  blob: Blob;
};

export type LocalSession = {
  id: string;
  patientLabel: string;
  appointmentId: string;
  mimeType: string;
  createdAt: number;
  updatedAt: number;
  status: "recording" | "paused";
  bytes: number;
  elapsedMs: number;
  encounterId: string;
};

type StoredChunk = AudioChunk & { id: string; sessionId: string };

const dbName = "alignment-visit-audio";
let writeQueue = Promise.resolve();

export function enqueueAudioWrite(task: () => Promise<void>) {
  writeQueue = writeQueue.then(task, task);
  return writeQueue;
}

export function flushAudioWrites() {
  return writeQueue;
}

export function filesFromChunks(chunks: AudioChunk[], mimeType: string) {
  const type = mimeType.split(";")[0] || "audio/webm";
  const groups = new Map<number, Blob[]>();
  for (const chunk of [...chunks].sort((left, right) => left.part - right.part || left.seq - right.seq)) {
    const list = groups.get(chunk.part) ?? [];
    list.push(chunk.blob);
    groups.set(chunk.part, list);
  }
  const files: { part: number; blob: Blob; type: string }[] = [];
  for (const [part, blobs] of groups) {
    const blob = new Blob(blobs, { type });
    if (blob.size < minimumAudioBytes) continue;
    files.push({ part, blob, type });
  }
  return files;
}

export function preferredRecorderMime() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4"];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) ?? "";
}

function openDb() {
  return new Promise<IDBDatabase>((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("This browser cannot store a recording on the phone."));
      return;
    }
    const request = indexedDB.open(dbName, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains("sessions")) db.createObjectStore("sessions", { keyPath: "id" });
      if (!db.objectStoreNames.contains("chunks")) {
        const store = db.createObjectStore("chunks", { keyPath: "id" });
        store.createIndex("session", "sessionId");
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("The recording could not be saved on this phone."));
  });
}

function requestToPromise<T>(request: IDBRequest<T>) {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("The recording could not be saved on this phone."));
  });
}

export async function listLocalSessions() {
  const db = await openDb();
  const sessions = await requestToPromise(db.transaction("sessions").objectStore("sessions").getAll() as IDBRequest<LocalSession[]>);
  return sessions.sort((left, right) => right.updatedAt - left.updatedAt);
}

export async function matchingSession(appointmentId: string) {
  const sessions = await listLocalSessions();
  if (appointmentId) return sessions.find((session) => session.appointmentId === appointmentId) ?? null;
  return sessions[0] ?? null;
}

export async function saveLocalSession(session: LocalSession) {
  const db = await openDb();
  const tx = db.transaction("sessions", "readwrite");
  tx.objectStore("sessions").put(session);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("The recording could not be saved on this phone."));
  });
}

export async function saveAudioChunk(sessionId: string, chunk: AudioChunk) {
  const db = await openDb();
  const record: StoredChunk = {
    id: `${sessionId}:${chunk.part}:${chunk.seq}`,
    sessionId,
    part: chunk.part,
    seq: chunk.seq,
    blob: chunk.blob,
  };
  const tx = db.transaction("chunks", "readwrite");
  tx.objectStore("chunks").put(record);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("The recording could not be saved on this phone."));
  });
}

export async function chunksForSession(sessionId: string) {
  const db = await openDb();
  const index = db.transaction("chunks").objectStore("chunks").index("session");
  const stored = await requestToPromise(index.getAll(sessionId) as IDBRequest<StoredChunk[]>);
  return stored
    .map((chunk) => ({ part: chunk.part, seq: chunk.seq, blob: chunk.blob }))
    .sort((left, right) => left.part - right.part || left.seq - right.seq);
}

export async function deleteLocalSession(sessionId: string) {
  const db = await openDb();
  const tx = db.transaction(["sessions", "chunks"], "readwrite");
  tx.objectStore("sessions").delete(sessionId);
  const request = tx.objectStore("chunks").index("session").openCursor(sessionId);
  request.onsuccess = () => {
    const cursor = request.result;
    if (!cursor) return;
    cursor.delete();
    cursor.continue();
  };
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error("The recording could not be removed from this phone."));
  });
}
