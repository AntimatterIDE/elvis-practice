"use client";

import { useEffect, useState } from "react";
import { beginChartUpload, chartFiles, deleteChartFile } from "@/app/admin/chart-files/actions";
import type { ChartFile } from "@/lib/chart-files/types";
import type { ChartDocument, DocumentStatus, Patient } from "@/lib/rcm/types";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/admin/rcm/ui";

const hints: Record<string, string> = {
  "photo-id": "A photo of the identification card.",
  "insurance-card": "The front and the back of the card.",
  "new-patient-intake": "Answers from the intake link stay with this item.",
  referral: "The referral, or the plan's authorization, when one is required.",
  "outside-imaging": "A photo, a video, or a PDF of films or a report from another office.",
  "outside-records": "Records another office sent for this patient.",
  "no-fault-comp": "The carrier's no-fault or workers' compensation papers. This page does not file with the carrier.",
  "medicare-form": "A completed Medicare form, such as an ABN. This page does not generate the CMS form.",
  "hospital-records": "Discharge papers, an operative note, or other hospital records.",
};

const accept = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,application/pdf,video/mp4,video/quicktime,video/webm,.heic,.pdf,.mp4,.mov";

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

export function ChartFiles({
  patient,
  onSave,
}: {
  patient: Patient;
  onSave: (id: string, patch: Partial<Patient>) => void;
}) {
  const [files, setFiles] = useState<ChartFile[]>([]);
  const [message, setMessage] = useState("");
  const [busySlot, setBusySlot] = useState("");
  const [customName, setCustomName] = useState("");

  function reload() {
    void chartFiles(patient.id).then((result) => {
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setFiles(result.files);
    });
  }

  useEffect(() => {
    reload();
    // Reload when the chart changes. reload closes over the current patient id.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patient.id]);

  async function upload(document: ChartDocument, list: FileList) {
    setBusySlot(document.id);
    setMessage("");
    const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    for (const file of [...list]) {
      const contentType = typeOf(file);
      const prepared = await beginChartUpload({
        patientId: patient.id,
        slotId: document.id,
        contentType,
        byteSize: file.size,
      });
      if (!prepared.ok) {
        setMessage(prepared.message);
        setBusySlot("");
        return;
      }
      if (!anon) {
        setMessage("The practice database is not connected.");
        setBusySlot("");
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
        setMessage("That file could not be stored.");
        setBusySlot("");
        return;
      }
    }
    if (document.status === "missing") {
      onSave(patient.id, {
        documents: patient.documents.map((item) =>
          item.id === document.id ? { ...item, status: "received" as const } : item,
        ),
      });
    }
    setBusySlot("");
    reload();
  }

  function addItem() {
    const name = customName.trim().slice(0, 80);
    if (name.length < 2) {
      setMessage("Name the item before adding it.");
      return;
    }
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 60);
    const slotId = id || `item-${crypto.randomUUID().slice(0, 8)}`;
    if (patient.documents.some((item) => item.id === slotId)) {
      setMessage("That item is already on the chart.");
      return;
    }
    onSave(patient.id, {
      documents: [...patient.documents, { id: slotId, name, status: "missing", note: "" }],
    });
    setCustomName("");
    setMessage("");
  }

  return (
    <div className="grid gap-6">
      <p className="max-w-2xl text-sm text-muted">
        Store the photo, video, or PDF on the item it belongs to. A status is not the file. Signed agreements stay on the Documents tab.
      </p>
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      {patient.documents.map((document) => {
        const stored = files.filter((file) => file.slotId === document.id);
        return (
          <section key={document.id} className="rounded-2xl border border-line bg-card p-4">
            <h2 className="font-display text-2xl">{document.name}</h2>
            {hints[document.id] ? <p className="mt-1 text-sm text-muted">{hints[document.id]}</p> : null}
            {document.id === "new-patient-intake" && patient.intakeAnswers?.length ? (
              <dl className="mt-3 grid gap-2">
                {patient.intakeAnswers.map((answer) => (
                  <div key={answer.label}>
                    <dt className="text-xs uppercase tracking-[0.14em] text-muted">{answer.label}</dt>
                    <dd className="text-sm">{answer.value}</dd>
                  </div>
                ))}
              </dl>
            ) : null}
            <ul className="mt-4 grid gap-4">
              {stored.length === 0 ? <li className="text-sm text-muted">Nothing stored on this item.</li> : null}
              {stored.map((file) => (
                <li key={file.path} className="grid gap-2">
                  {file.contentType.startsWith("image/") && file.url ? (
                    // Staff-only signed link to this chart's file.
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={file.url} alt={document.name} className="max-h-72 rounded-2xl border border-line bg-white object-contain" />
                  ) : null}
                  {file.contentType.startsWith("video/") && file.url ? (
                    <video controls preload="metadata" src={file.url} className="max-h-72 w-full rounded-2xl border border-line bg-black" />
                  ) : null}
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span>{file.label}{file.size ? ` · ${sizeLabel(file.size)}` : ""}</span>
                    {file.url && !file.contentType.startsWith("image/") && !file.contentType.startsWith("video/") ? (
                      <a className="underline" href={file.url} target="_blank" rel="noreferrer">Open</a>
                    ) : null}
                    <Button
                      type="button"
                      variant="ghost"
                      disabled={busySlot === document.id}
                      onClick={() => {
                        setBusySlot(document.id);
                        void deleteChartFile(patient.id, file.path).then((result) => {
                          setBusySlot("");
                          if (!result.ok) setMessage(result.message);
                          else reload();
                        });
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
            <div className="mt-4 flex flex-wrap items-end gap-3">
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Add a photo, video, or PDF</span>
                <input
                  className="text-sm"
                  type="file"
                  accept={accept}
                  multiple
                  disabled={busySlot === document.id}
                  aria-label={`Add a file to ${document.name}`}
                  onChange={(event) => {
                    const list = event.target.files;
                    event.target.value = "";
                    if (list?.length) void upload(document, list);
                  }}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Note</span>
                <input
                  className={fieldClass}
                  defaultValue={document.note}
                  aria-label={`${document.name} note`}
                  onBlur={(event) => {
                    const note = event.target.value.slice(0, 400);
                    if (note === document.note) return;
                    onSave(patient.id, {
                      documents: patient.documents.map((item) => (item.id === document.id ? { ...item, note } : item)),
                    });
                  }}
                />
              </label>
              <label className="grid gap-2 text-sm">
                <span className="font-medium">Paper status</span>
                <select
                  className={fieldClass}
                  value={document.status}
                  aria-label={`${document.name} status`}
                  onChange={(event) =>
                    onSave(patient.id, {
                      documents: patient.documents.map((item) =>
                        item.id === document.id ? { ...item, status: event.target.value as DocumentStatus } : item,
                      ),
                    })
                  }
                >
                  <option value="missing">Missing</option>
                  <option value="received">Received</option>
                  <option value="signed">Signed</option>
                </select>
              </label>
            </div>
          </section>
        );
      })}
      <form
        className="flex flex-wrap items-end gap-3"
        onSubmit={(event) => {
          event.preventDefault();
          addItem();
        }}
      >
        <label className="grid min-w-64 flex-1 gap-2 text-sm">
          <span className="font-medium">Add an item</span>
          <input className={fieldClass} value={customName} onChange={(event) => setCustomName(event.target.value)} placeholder="MRI report" />
        </label>
        <Button type="submit" variant="secondary">Add</Button>
      </form>
    </div>
  );
}
