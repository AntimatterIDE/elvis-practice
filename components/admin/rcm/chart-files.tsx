"use client";

import { useEffect, useRef, useState } from "react";
import { beginChartUpload, chartFiles, deleteChartFile } from "@/app/admin/chart-files/actions";
import { pushPortalChartsAction } from "@/app/portal/actions";
import { ChartExtractReview } from "@/components/ocr/chart-extract-review";
import { chartFileType, putSignedChartFile } from "@/lib/chart-files/put";
import type { ChartFile } from "@/lib/chart-files/types";
import { labResultSlot } from "@/lib/portal/uploads";
import type { ChartDocument, DocumentStatus, Patient } from "@/lib/rcm/types";
import { FilePicker } from "@/components/admin/rcm/file-picker";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/admin/rcm/ui";

const hints: Record<string, string> = {
  "photo-id": "A photo of the identification card.",
  "insurance-card": "The front and the back of the card.",
  "new-patient-intake": "Answers from the intake link stay with this item.",
  referral: "The referral, or the plan's authorization, when one is required.",
  "outside-imaging": "A photo, a video, or a PDF of films or a report from another office.",
  "outside-records": "Medical records from another doctor or office. PDF or Word. Save them here so they stay on this patient’s chart.",
  "consultation-report": "This practice’s consultation report. PDF or Word. It stays on this patient’s chart.",
  "follow-up-reports": "Follow-up reports from this practice. Add each new report here. Earlier reports stay on the chart.",
  "no-fault-comp": "The carrier's no-fault or workers' compensation papers. This page does not file with the carrier.",
  "medicare-form": "A completed Medicare form, such as an ABN. This page does not generate the CMS form.",
  "hospital-records": "Discharge papers, an operative note, or other hospital records.",
  "portal-files": "Files the patient uploaded from the portal.",
};

const accept = "image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document,video/mp4,video/quicktime,video/webm,.heic,.pdf,.doc,.docx,.mp4,.mov";

function sizeLabel(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isOcrExtractableFile(file: { name: string; type?: string; contentType?: string }) {
  const type = (file.type || file.contentType || "").toLowerCase();
  const name = file.name || "";
  return (
    type === "application/pdf" ||
    /\.pdf$/i.test(name) ||
    type.startsWith("image/") ||
    /\.(png|jpe?g|webp|gif|heic|heif)$/i.test(name)
  );
}

function isWordFile(file: { name: string; type?: string }) {
  const type = (file.type || "").toLowerCase();
  return (
    type.includes("word") ||
    type.includes("officedocument.wordprocessingml") ||
    /\.docx?$/i.test(file.name)
  );
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
  const [extractOffer, setExtractOffer] = useState<{ slotId: string; files: File[] } | null>(null);
  const extractOfferRef = useRef<HTMLDivElement | null>(null);

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

  useEffect(() => {
    if (!extractOffer) return;
    extractOfferRef.current?.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }, [extractOffer]);

  function renderExtractOffer(slotId: string) {
    if (!extractOffer || extractOffer.slotId !== slotId) return null;
    return (
      <div ref={extractOfferRef} className="mt-4">
        <ChartExtractReview
          patient={patient}
          files={extractOffer.files}
          onDismiss={() => setExtractOffer(null)}
          onApplied={async (merged) => {
            const result = await pushPortalChartsAction({ patients: [merged], appointments: [] });
            if (!result.ok) throw new Error(result.error || "Could not save extracted chart fields.");
            const { id, ...patch } = merged;
            onSave(id, patch);
            setExtractOffer(null);
            setMessage("Extracted fields were saved on this chart.");
          }}
        />
      </div>
    );
  }

  async function upload(document: ChartDocument, files: File[]) {
    setBusySlot(document.id);
    setMessage("");
    setExtractOffer(null);
    for (const file of files) {
      const contentType = chartFileType(file);
      const prepared = await beginChartUpload({
        patientId: patient.id,
        slotId: document.id,
        contentType,
        byteSize: file.size,
        fileName: file.name,
      });
      if (!prepared.ok) {
        setMessage(prepared.message);
        setBusySlot("");
        return;
      }
      const stored = await putSignedChartFile(prepared.signedUrl, file, contentType);
      if (!stored.ok) {
        setMessage(stored.message);
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
    const extractable = files.filter((file) => isOcrExtractableFile(file));
    const wordOnly = files.length > 0 && extractable.length === 0 && files.some((file) => isWordFile(file));
    setMessage(
      wordOnly
        ? `${files.length === 1 ? files[0].name : `${files.length} files`} saved. Word files cannot be OCR’d here — upload a PDF or photo to extract into the chart.`
        : files.length === 1
          ? `${files[0].name} is saved on this chart.`
          : `${files.length} files are saved on this chart.`,
    );
    setBusySlot("");
    reload();
    if (extractable.length) setExtractOffer({ slotId: document.id, files: extractable });
  }

  async function extractStored(document: ChartDocument, stored: ChartFile) {
    if (!stored.url || !isOcrExtractableFile({ name: stored.label, contentType: stored.contentType })) {
      setMessage("OCR needs a PDF or photo on this item.");
      return;
    }
    setBusySlot(document.id);
    setMessage("");
    setExtractOffer(null);
    try {
      const res = await fetch(stored.url);
      if (!res.ok) throw new Error(`Could not open ${stored.label} (${res.status}).`);
      const blob = await res.blob();
      const file = new File([blob], stored.label || "chart-file.pdf", {
        type: stored.contentType || blob.type || "application/pdf",
      });
      setExtractOffer({ slotId: document.id, files: [file] });
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Could not open that file for OCR.");
    } finally {
      setBusySlot("");
    }
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

  const leadSlots = ["outside-records", "consultation-report", "follow-up-reports"];
  const ordered = [
    ...leadSlots.flatMap((id) => patient.documents.filter((document) => document.id === id)),
    ...patient.documents.filter((document) => !leadSlots.includes(document.id)),
  ];

  return (
    <div className="grid gap-6">
      <p className="max-w-2xl text-sm text-muted">
        Doctor records from another office are first. This practice’s consultation report and later follow-up reports are next. Signed agreements stay on the Documents tab.
      </p>
      {message ? <p className="text-sm text-muted">{message}</p> : null}
      {ordered.map((document) => {
        const stored = files.filter((file) => file.slotId === document.id);
        const featured = leadSlots.includes(document.id);
        const uploadLabel =
          document.id === "outside-records"
            ? "Upload doctor records"
            : document.id === "consultation-report"
              ? "Upload consultation report"
              : document.id === "follow-up-reports"
                ? "Upload a follow-up report"
                : "Upload a file";
        return (
          <section
            key={document.id}
            className={featured ? "rounded-2xl border-2 border-oxide/40 bg-mint/40 p-5" : "rounded-2xl border border-line bg-card p-4"}
          >
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
                      <Button variant="secondary" asChild>
                        <a href={file.url} target="_blank" rel="noreferrer">Open</a>
                      </Button>
                    ) : null}
                    {file.url && isOcrExtractableFile({ name: file.label, contentType: file.contentType }) ? (
                      <Button
                        type="button"
                        variant="secondary"
                        disabled={busySlot === document.id}
                        onClick={() => void extractStored(document, file)}
                      >
                        Extract into chart
                      </Button>
                    ) : null}
                    <Button
                      type="button"
                      variant="secondary"
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
              <FilePicker
                label={uploadLabel}
                busy={busySlot === document.id}
                variant={featured ? "primary" : "secondary"}
                accept={accept}
                onFiles={(files) => void upload(document, files)}
              />
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
            {renderExtractOffer(document.id)}
          </section>
        );
      })}
      <section className="rounded-2xl border border-line bg-card p-4">
        <h2 className="font-display text-2xl">Lab results</h2>
        <p className="mt-1 text-sm text-muted">Files here show in the patient portal. The portal does not pull results from a lab.</p>
        <ul className="mt-4 grid gap-3 text-sm">
          {files.filter((file) => file.slotId === labResultSlot).length === 0 ? <li className="text-muted">No lab results stored.</li> : null}
          {files
            .filter((file) => file.slotId === labResultSlot)
            .map((file) => (
              <li key={file.path} className="flex flex-wrap items-center gap-3">
                <span>
                  {file.label}
                  {file.size ? ` · ${sizeLabel(file.size)}` : ""}
                </span>
                {file.url ? (
                  <Button variant="secondary" asChild>
                    <a href={file.url} target="_blank" rel="noreferrer">
                      Open
                    </a>
                  </Button>
                ) : null}
              </li>
            ))}
        </ul>
        <div className="mt-4">
          <FilePicker
            label="Upload a result"
            busy={busySlot === labResultSlot}
            variant="secondary"
            accept={accept}
            onFiles={(files) => void upload({ id: labResultSlot, name: "Lab results", status: "received", note: "" }, files)}
          />
        </div>
        {renderExtractOffer(labResultSlot)}
      </section>
      {files.some((file) => file.slotId !== labResultSlot && !patient.documents.some((document) => document.id === file.slotId) && !file.slotId.startsWith("claim-")) ? (
        <section className="rounded-2xl border border-line bg-card p-4">
          <h2 className="font-display text-2xl">Files from the patient portal</h2>
          <p className="mt-1 text-sm text-muted">Uploaded by the patient. Photo ID and insurance cards also land on those items above.</p>
          <ul className="mt-4 grid gap-3 text-sm">
            {files
              .filter((file) => file.slotId !== labResultSlot && !patient.documents.some((document) => document.id === file.slotId) && !file.slotId.startsWith("claim-"))
              .map((file) => (
                <li key={file.path} className="flex flex-wrap items-center gap-3">
                  <span>
                    {file.label}
                    {file.size ? ` · ${sizeLabel(file.size)}` : ""}
                  </span>
                  {file.url ? (
                    <Button variant="secondary" asChild>
                      <a href={file.url} target="_blank" rel="noreferrer">
                        Open
                      </a>
                    </Button>
                  ) : null}
                </li>
              ))}
          </ul>
        </section>
      ) : null}
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
