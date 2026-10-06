"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { parsePracticeCsv } from "@/lib/rcm/import";
import {
  Field,
  LoadingDesk,
  PageHeader,
  Stat,
  fieldClass,
  panelClass,
} from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

export function UploadDesk() {
  const { ready, patients, addPatient, addClaim } = useRcm();
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");
  const [dragOver, setDragOver] = useState(false);

  if (!ready) return <LoadingDesk />;

  function importText(source: string) {
    const parsed = parsePracticeCsv(source);
    if (!parsed.ok) {
      setMessage(parsed.error);
      return;
    }
    let createdPatients = 0;
    let createdClaims = 0;
    const known = [...patients];
    for (const row of parsed.rows) {
      let patient = known.find(
        (item) =>
          item.firstName.toLowerCase() === row.firstName.toLowerCase() &&
          item.lastName.toLowerCase() === row.lastName.toLowerCase(),
      );
      if (!patient) {
        patient = addPatient({
          firstName: row.firstName,
          lastName: row.lastName,
          dateOfBirth: row.dateOfBirth,
          sex: "unknown",
          memberId: row.memberId,
          payerName: row.payerName,
          phone: "",
          email: "",
          address: "",
          city: "",
          state: "",
          postalCode: "",
        });
        known.push(patient);
        createdPatients += 1;
      }
      addClaim({
        patientId: patient.id,
        payerName: row.payerName || patient.payerName,
        dateOfService: row.dateOfService || new Date().toISOString().slice(0, 10),
        placeOfService: "11",
        status: "draft",
        source: "upload",
        lines: [
          {
            cpt: row.cpt,
            description: row.description || "",
            modifier: "",
            units: 1,
            charge: row.charge || 0,
            icd: row.icd || "",
          },
        ],
      });
      createdClaims += 1;
    }
    setMessage(`Imported ${createdClaims} claims and ${createdPatients} new patients.`);
    setText("");
  }

  function handleFileDrop(event: React.DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDragOver(false);
    const file = event.dataTransfer.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      const content = e.target?.result;
      if (typeof content === "string") {
        importText(content);
      }
    };
    reader.readAsText(file);
  }

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Upload"
        lede="Import claims and patients from a CSV file or paste CSV text directly."
      />
      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[24rem_minmax(0,1fr)]">
        {/* Left column — import UI */}
        <div className={`${panelClass} grid gap-5`}>
          {/* Drop zone */}
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleFileDrop}
            className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-2xl border-2 border-dashed p-8 text-center transition ${
              dragOver
                ? "border-oxide bg-oxide/5"
                : "border-line hover:border-oxide/50 hover:bg-mist/50"
            }`}
          >
            <svg
              className="h-8 w-8 text-muted"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M12 16V4m0 0L8 8m4-4l4 4M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2"
              />
            </svg>
            <p className="text-sm font-medium text-muted">
              Drop a CSV file here
            </p>
            <p className="text-xs text-muted/60">or paste CSV text below</p>
          </div>

          <Field label="CSV text">
            <textarea
              className={`${fieldClass} min-h-32 resize-y font-mono text-xs leading-relaxed`}
              placeholder={`firstName,lastName,dateOfBirth,payerName,cpt,charge\nJane,Doe,1990-05-14,Aetna,99213,210`}
              value={text}
              onChange={(event) => setText(event.target.value)}
            />
          </Field>

          <Button
            onClick={() => importText(text)}
            disabled={!text.trim()}
          >
            Import CSV
          </Button>

          {message ? (
            <p className="rounded-xl bg-mint/50 p-3 text-sm text-oxide-deep">
              {message}
            </p>
          ) : null}
        </div>

        {/* Right column — preview & stats */}
        <div className="grid gap-4">
          <Stat label="Patients on file" value={String(patients.length)} />
          <div className={`${panelClass} grid gap-3`}>
            <h3 className="text-sm font-semibold text-ink">CSV format</h3>
            <p className="text-xs leading-relaxed text-muted">
              Header row:{" "}
              <code className="rounded bg-mist px-1 py-0.5 font-mono text-ink">
                firstName,lastName,dateOfBirth,payerName,cpt,charge
              </code>
            </p>
            <p className="text-xs leading-relaxed text-muted">
              Optional columns: <code className="rounded bg-mist px-1 py-0.5 font-mono text-ink">memberId,dateOfService,description,icd</code>
            </p>
            <p className="text-xs leading-relaxed text-muted">
              Existing patients are matched by first + last name. New patients are created automatically.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}