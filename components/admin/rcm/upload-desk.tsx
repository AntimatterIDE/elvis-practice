"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { parsePracticeCsv } from "@/lib/rcm/import";
import { Field, LoadingDesk, PageHeader, fieldClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

export function UploadDesk() {
  const { ready, patients, addPatient, addClaim } = useRcm();
  const [text, setText] = useState("");
  const [message, setMessage] = useState("");

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
            description: row.description,
            modifier: "",
            units: 1,
            charge: row.charge,
            icd: row.icd,
          },
        ],
      });
      createdClaims += 1;
    }
    setMessage(`Imported ${createdClaims} draft claims and ${createdPatients} new patients. Open Agent drafts to review them.`);
  }

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Upload"
        lede="Paste or drop a CSV. A matching name attaches to an existing chart. A new name opens a chart."
      />
      <form
        className="mt-8 grid max-w-3xl gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          importText(text);
        }}
      >
        <Field label="CSV">
          <textarea
            className={`${fieldClass} min-h-48 font-mono`}
            value={text}
            onChange={(event) => setText(event.target.value)}
            placeholder={"first,last,dob,payer,member,dos,cpt,description,charge,icd"}
          />
        </Field>
        <Field label="Or choose a file">
          <input
            className="text-sm"
            type="file"
            accept=".csv,text/csv"
            onChange={async (event) => {
              const file = event.target.files?.[0];
              if (!file) return;
              const contents = await file.text();
              setText(contents);
              importText(contents);
            }}
          />
        </Field>
        <p className="text-sm text-muted">
          Columns: first, last, dob, payer, member, dos, cpt, description, charge, icd. Each row becomes a draft claim. It is not sent to a payer.
        </p>
        {message ? <p className="text-sm">{message}</p> : null}
        <Button type="submit" className="justify-self-start">
          Import rows
        </Button>
      </form>
    </main>
  );
}
