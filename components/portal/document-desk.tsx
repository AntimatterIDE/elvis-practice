"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { beginPortalUploadAction, notePortalUploadAction } from "@/app/portal/actions";
import type { ChartFile } from "@/lib/chart-files/types";
import { documentName } from "@/lib/rcm/chart";
import { portalUploadSlots } from "@/lib/portal/uploads";

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

export function DocumentDesk({ files, storageNote }: { files: ChartFile[]; storageNote: string }) {
  const router = useRouter();
  const [slotId, setSlotId] = useState<string>(portalUploadSlots[0].id);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function upload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const input = form.elements.namedItem("file");
    const file = input instanceof HTMLInputElement ? input.files?.[0] : undefined;
    if (!file) {
      setError("Choose a file to upload.");
      return;
    }
    const contentType = typeOf(file);
    setPending(true);
    setError("");
    const prepared = await beginPortalUploadAction({ slotId, contentType, byteSize: file.size });
    if (!prepared.ok) {
      setPending(false);
      setError(prepared.message);
      return;
    }
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!anon) {
      setPending(false);
      setError("The practice database is not connected, so the file was not stored.");
      return;
    }
    const body = new FormData();
    body.append("cacheControl", "3600");
    body.append("", file);
    const response = await fetch(prepared.signedUrl, {
      method: "PUT",
      headers: { apikey: anon, Authorization: `Bearer ${anon}` },
      body,
    });
    if (!response.ok) {
      setPending(false);
      setError(`${file.name} could not be stored.`);
      return;
    }
    const noted = await notePortalUploadAction(slotId);
    setPending(false);
    if ("error" in noted && noted.error) {
      setError(noted.error);
      return;
    }
    form.reset();
    router.refresh();
  }

  return (
    <div className="grid gap-4">
      <section className="rounded-3xl border border-line bg-card p-6">
        <h2 className="font-display text-2xl font-medium leading-tight">On your profile</h2>
        {files.length ? (
          <ul className="mt-4 divide-y divide-line">
            {files.map((file) => (
              <li key={file.path} className="flex flex-wrap items-center justify-between gap-3 py-3 text-sm">
                <span>
                  <span className="block font-medium">{documentName(file.slotId)}</span>
                  <span className="text-muted">
                    {file.label}
                    {file.size ? ` · ${sizeLabel(file.size)}` : ""}
                  </span>
                </span>
                {file.url ? (
                  <a className="font-medium text-oxide-deep underline decoration-oxide-deep/30 underline-offset-4" href={file.url} target="_blank" rel="noreferrer">
                    Open
                  </a>
                ) : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm leading-relaxed text-muted">No files are on your profile yet.</p>
        )}
        {storageNote ? <p className="mt-3 text-sm text-muted">{storageNote}</p> : null}
      </section>
      <form onSubmit={(event) => void upload(event)} className="rounded-3xl border border-line bg-card p-6">
        <h2 className="font-display text-2xl font-medium leading-tight">Upload a document</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">A photo of your ID or insurance card, or a PDF the practice asked for.</p>
        <label className="kicker mt-4 block text-muted" htmlFor="portal-slot">
          What is this
        </label>
        <select
          id="portal-slot"
          value={slotId}
          onChange={(event) => setSlotId(event.target.value)}
          className="mt-2 w-full rounded-2xl border border-line bg-paper px-4 py-3 text-sm"
        >
          {portalUploadSlots.map((slot) => (
            <option key={slot.id} value={slot.id}>
              {slot.label}
            </option>
          ))}
        </select>
        <label className="kicker mt-4 block text-muted" htmlFor="portal-file">
          File
        </label>
        <input id="portal-file" name="file" type="file" accept={accept} required className="mt-2 block w-full text-sm" />
        {error ? <p className="mt-3 text-sm text-emergency">{error}</p> : null}
        <button
          type="submit"
          disabled={pending}
          className="mt-4 inline-flex min-h-11 items-center rounded-full bg-pine px-5 text-sm font-medium text-paper disabled:opacity-50"
        >
          {pending ? "Uploading…" : "Upload a document to your profile"}
        </button>
      </form>
    </div>
  );
}
