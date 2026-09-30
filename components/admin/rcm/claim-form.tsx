"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { patientName } from "@/lib/rcm/format";
import { Field, LoadingDesk, PageHeader, fieldClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

type LineDraft = { cpt: string; description: string; modifier: string; units: string; charge: string; icd: string };

const emptyLine = (): LineDraft => ({
  cpt: "99213",
  description: "Office visit, low",
  modifier: "",
  units: "1",
  charge: "145",
  icd: "M54.5",
});

export function ClaimForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { ready, patients, practice, addClaim } = useRcm();
  const requestedPatient = params.get("patient") ?? "";
  const [patientId, setPatientId] = useState(requestedPatient);
  const [dateOfService, setDateOfService] = useState("2026-09-30");
  const [placeOfService, setPlaceOfService] = useState(practice.posCode || "11");
  const [lines, setLines] = useState<LineDraft[]>([emptyLine()]);
  const [error, setError] = useState("");

  const selected = patients.find((patient) => patient.id === patientId) ?? patients[0];
  const resolvedPatientId = patientId || selected?.id || "";

  const options = useMemo(
    () => patients.map((patient) => ({ id: patient.id, label: `${patientName(patient)} · ${patient.payerName}` })),
    [patients],
  );

  if (!ready) return <LoadingDesk />;

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((current) => current.map((line, position) => (position === index ? { ...line, ...patch } : line)));
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const patient = patients.find((item) => item.id === resolvedPatientId);
    if (!patient) {
      setError("Add a patient before creating a claim.");
      return;
    }
    const parsed = lines.map((line) => ({
      cpt: line.cpt.trim(),
      description: line.description.trim() || "Service",
      modifier: line.modifier.trim(),
      units: Number(line.units),
      charge: Number(line.charge),
      icd: line.icd.trim(),
    }));
    if (parsed.some((line) => !line.cpt || !Number.isFinite(line.units) || !Number.isFinite(line.charge))) {
      setError("Each line needs a CPT, units, and charge.");
      return;
    }
    const claim = addClaim({
      patientId: patient.id,
      payerName: patient.payerName,
      dateOfService,
      placeOfService,
      lines: parsed,
      status: "draft",
      source: "manual",
    });
    router.push(`/admin/operations/claims/${claim.id}`);
  }

  return (
    <main>
      <PageHeader kicker="Claims" title="New claim" lede="Saves a draft on this desk. It is not submitted to a payer." />
      <form onSubmit={onSubmit} className="mt-8 grid max-w-3xl gap-4">
        <Field label="Patient">
          <select className={fieldClass} value={resolvedPatientId} onChange={(event) => setPatientId(event.target.value)} required>
            {options.map((option) => (
              <option key={option.id} value={option.id}>
                {option.label}
              </option>
            ))}
          </select>
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Date of service">
            <input className={fieldClass} type="date" value={dateOfService} onChange={(event) => setDateOfService(event.target.value)} required />
          </Field>
          <Field label="Place of service">
            <input className={fieldClass} value={placeOfService} onChange={(event) => setPlaceOfService(event.target.value)} />
          </Field>
        </div>
        {lines.map((line, index) => (
          <fieldset key={index} className="grid gap-3 border border-line bg-card p-4 sm:grid-cols-3">
            <legend className="px-1 text-sm">Line {index + 1}</legend>
            <Field label="CPT">
              <input className={fieldClass} value={line.cpt} onChange={(event) => updateLine(index, { cpt: event.target.value })} required />
            </Field>
            <Field label="ICD-10">
              <input className={fieldClass} value={line.icd} onChange={(event) => updateLine(index, { icd: event.target.value })} />
            </Field>
            <Field label="Modifier">
              <input className={fieldClass} value={line.modifier} onChange={(event) => updateLine(index, { modifier: event.target.value })} />
            </Field>
            <Field label="Description" className="sm:col-span-3">
              <input className={fieldClass} value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} />
            </Field>
            <Field label="Units">
              <input className={fieldClass} value={line.units} onChange={(event) => updateLine(index, { units: event.target.value })} required />
            </Field>
            <Field label="Charge">
              <input className={fieldClass} value={line.charge} onChange={(event) => updateLine(index, { charge: event.target.value })} required />
            </Field>
          </fieldset>
        ))}
        <button
          type="button"
          className="justify-self-start text-sm underline"
          onClick={() => setLines((current) => [...current, emptyLine()])}
        >
          Add a line
        </button>
        {error ? <p className="text-sm text-emergency">{error}</p> : null}
        <Button type="submit" className="justify-self-start">
          Save draft
        </Button>
      </form>
    </main>
  );
}
