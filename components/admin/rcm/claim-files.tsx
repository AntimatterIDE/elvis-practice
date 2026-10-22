"use client";

import { useEffect, useState } from "react";
import { beginChartUpload, chartFiles, deleteChartFile } from "@/app/admin/chart-files/actions";
import { claimFileSlot } from "@/lib/rcm/claim-files";
import type { ChartFile } from "@/lib/chart-files/types";
import type { Claim, ClaimAttachment, ClaimEvent } from "@/lib/rcm/types";
import { fieldClass } from "@/components/admin/rcm/ui";

const accept =
  "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,application/pdf,video/mp4,video/quicktime,video/webm,.heic,.pdf,.mp4,.mov";

function typeOf(file: File) {
  if (file.type) return file.type;
  const ext = file.name.split(".").pop()?.toLowerCase();
  if (ext === "heic" || ext === "heif") return "image/heic";
  if (ext === "pdf") return "application/pdf";
  if (ext === "mp4") return "video/mp4";
  if (ext === "mov") return "video/quicktime";
  if (ext === "webm") return "video/webm";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "png") return "image/png";
  return "";
}

function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export async function storeClaimFiles(patientId: string, claimId: string, files: File[]) {
  const slotId = claimFileSlot(claimId);
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  const stored: ClaimAttachment[] = [];
  if (!anon) {
    return { ok: false as const, message: "The practice database is not connected, so the files were not stored.", files: stored };
  }
  for (const file of files) {
    const contentType = typeOf(file);
    const prepared = await beginChartUpload({
      patientId,
      slotId,
      contentType,
      byteSize: file.size,
    });
    if (!prepared.ok) return { ok: false as const, message: prepared.message, files: stored };
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    const response = await fetch(prepared.signedUrl, {
      method: "PUT",
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      body,
    });
    if (!response.ok) return { ok: false as const, message: `${file.name} could not be stored.`, files: stored };
    stored.push({ path: prepared.path, name: file.name, contentType, size: file.size });
  }
  return { ok: true as const, message: "", files: stored };
}

export function attachmentEvent(names: string[]): ClaimEvent {
  const label = names.length === 1 ? names[0] : `${names.length} files`;
  return {
    id: crypto.randomUUID(),
    at: new Date().toISOString(),
    kind: "attachment",
    summary: names.length === 1 ? `Added ${label}.` : `Added ${label}: ${names.join(", ")}.`,
  };
}

export function ClaimPapers({
  patientId,
  claim,
  onChange,
}: {
  patientId: string;
  claim: Claim;
  onChange: (patch: Partial<Claim>) => void;
}) {
  const [live, setLive] = useState<ChartFile[]>([]);
  const [loaded, setLoaded] = useState(false);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);
  const slot = claimFileSlot(claim.id);

  function reload() {
    void chartFiles(patientId).then((result) => {
      setLoaded(true);
      if (!result.ok) return;
      setLive(result.files.filter((file) => file.slotId === slot));
    });
  }

  useEffect(() => {
    reload();
    // Reload when this claim's papers change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, claim.id, claim.attachments.length]);

  async function upload(list: FileList | null) {
    if (!list?.length) return;
    setPending(true);
    setMessage("");
    const stored = await storeClaimFiles(patientId, claim.id, [...list]);
    if (stored.files.length) {
      onChange({
        attachments: [...claim.attachments, ...stored.files],
        events: [...claim.events, attachmentEvent(stored.files.map((file) => file.name))],
      });
    }
    setMessage(stored.ok ? "Those files are on the claim." : stored.message);
    setPending(false);
    reload();
  }

  async function remove(path: string, name: string) {
    setPending(true);
    setMessage("");
    const result = await deleteChartFile(patientId, path);
    if (!result.ok) {
      setMessage(result.message);
      setPending(false);
      return;
    }
    onChange({
      attachments: claim.attachments.filter((file) => file.path !== path),
      events: [...claim.events, { ...attachmentEvent([name]), summary: `Removed ${name}.` }],
    });
    setPending(false);
    reload();
  }

  const listed = new Map(live.map((file) => [file.path, file]));
  const rows = claim.attachments.map((file) => ({
    path: file.path,
    name: file.name,
    size: file.size,
    url: listed.get(file.path)?.url ?? "",
  }));
  const known = new Set(claim.attachments.map((file) => file.path));
  if (loaded) {
    for (const file of live) {
      if (known.has(file.path)) continue;
      rows.push({ path: file.path, name: file.label, size: file.size, url: file.url });
    }
  }

  return (
    <section className="mt-8 grid max-w-3xl gap-3 rounded-2xl border border-line bg-card p-5">
      <h2 className="font-display text-2xl">Note and papers</h2>
      <p className="text-sm text-muted">
        The visit note and any files added because this visit was not written in the scribe.
      </p>
      {claim.clinicalNote ? (
        <pre className="whitespace-pre-wrap rounded-xl border border-line bg-paper p-4 text-sm">{claim.clinicalNote}</pre>
      ) : (
        <p className="text-sm text-muted">No visit note on this claim yet. Edit charges to add one.</p>
      )}
      <ul className="grid gap-2">
        {rows.length === 0 ? <li className="text-sm text-muted">No files on this claim.</li> : null}
        {rows.map((file) => (
          <li key={file.path} className="flex flex-wrap items-center justify-between gap-3 text-sm">
            <span>
              {file.name}
              {file.size ? ` · ${sizeLabel(file.size)}` : ""}
            </span>
            <span className="flex gap-2">
              {file.url ? (
                <a className="underline" href={file.url} target="_blank" rel="noreferrer">
                  Open
                </a>
              ) : null}
              <button type="button" className="underline disabled:opacity-50" disabled={pending} onClick={() => void remove(file.path, file.name)}>
                Remove
              </button>
            </span>
          </li>
        ))}
      </ul>
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Add a PDF, photo, or video</span>
        <input
          className={fieldClass}
          type="file"
          accept={accept}
          multiple
          disabled={pending}
          aria-label="Add files to this claim"
          onChange={(event) => {
            const list = event.target.files;
            event.target.value = "";
            void upload(list);
          }}
        />
      </label>
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      {pending ? <p className="text-sm text-muted">Saving the file…</p> : null}
    </section>
  );
}

export { accept as claimFileAccept };
