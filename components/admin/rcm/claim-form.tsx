"use client";

import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Button } from "@/components/ui/button";
import { patientName } from "@/lib/rcm/format";
import { AccountNoteDialog } from "@/components/admin/rcm/account-note";
import { Field, LoadingDesk, PageHeader, fieldClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

type LineDraft = {
  cpt: string;
  description: string;
  modifiers: string[];
  units: string;
  charge: string;
  diagnoses: string;
  includeOnBill: boolean;
  physician: string;
};

const emptyLine = (physician = ""): LineDraft => ({
  cpt: "",
  description: "",
  modifiers: ["", "", "", ""],
  units: "1",
  charge: "",
  diagnoses: "",
  includeOnBill: true,
  physician,
});

export function ClaimForm() {
  const router = useRouter();
  const params = useSearchParams();
  const { ready, patients, appointments, claims, practice, addClaim, updateClaim } = useRcm();
  const requestedPatient = params.get("patient") ?? "";
  const visitId = params.get("visit") ?? "";
  const claimId = params.get("claim") ?? "";
  const existing = claims.find((claim) => claim.id === claimId);
  const visit = appointments.find((appointment) => appointment.id === visitId);
  const [patientId, setPatientId] = useState(existing?.patientId || requestedPatient);
  const [dateOfService, setDateOfService] = useState(existing?.dateOfService || visit?.start.slice(0, 10) || "2026-09-30");
  const [placeOfService, setPlaceOfService] = useState(existing?.placeOfService || practice.posCode || "11");
  const [lines, setLines] = useState<LineDraft[]>(() =>
    existing?.lines.length
      ? existing.lines.map((line) => ({
          cpt: line.cpt,
          description: line.description,
          modifiers: [...line.modifiers, "", "", "", ""].slice(0, 4),
          units: String(line.units),
          charge: String(line.charge),
          diagnoses: line.diagnoses.join(", "),
          includeOnBill: line.includeOnBill,
          physician: line.physician,
        }))
      : [emptyLine(visit?.providerName || practice.physicianName)],
  );
  const [holdReason, setHoldReason] = useState(existing?.holdReason ?? "");
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [noteOpen, setNoteOpen] = useState(true);
  const [error, setError] = useState("");

  const selected = patients.find((patient) => patient.id === patientId) ?? patients[0];
  const resolvedPatientId = patientId || selected?.id || "";
  const patient = patients.find((item) => item.id === resolvedPatientId);
  const options = useMemo(
    () => patients.map((item) => ({ id: item.id, label: `${patientName(item)} · ${item.payerName}` })),
    [patients],
  );

  if (!ready) return <LoadingDesk />;

  function updateLine(index: number, patch: Partial<LineDraft>) {
    setLines((current) => current.map((line, position) => (position === index ? { ...line, ...patch } : line)));
  }

  function carryDiagnoses() {
    if (!patient) return;
    const codes = patient.problems.filter((problem) => problem.status === "active").map((problem) => problem.icd).join(", ");
    setLines((current) => current.map((line) => ({ ...line, diagnoses: line.diagnoses || codes })));
  }

  function addPerformed() {
    if (!visit || !patient) return;
    const chosen = visit.scheduledProcedures.filter((procedure) => selectedProcedures.includes(procedure.id));
    if (!chosen.length) {
      setError("Select a scheduled procedure before adding it to the bill.");
      return;
    }
    const codes = patient.problems.filter((problem) => problem.status === "active").map((problem) => problem.icd).join(", ");
    setLines((current) => [
      ...current.filter((line) => line.cpt || line.charge),
      ...chosen.map((procedure) => ({
        ...emptyLine(procedure.physician),
        cpt: procedure.cpt,
        description: procedure.description,
        diagnoses: codes,
      })),
    ]);
    setSelectedProcedures([]);
    setError("");
  }

  function parsedLines() {
    return lines.map((line) => {
      const modifiers = line.modifiers.map((modifier) => modifier.trim()).filter(Boolean);
      const diagnoses = line.diagnoses.split(/[\s,]+/).map((code) => code.trim()).filter(Boolean);
      return {
        cpt: line.cpt.trim(),
        description: line.description.trim() || "Service",
        modifiers,
        modifier: modifiers.join(" "),
        units: Number(line.units),
        charge: Number(line.charge),
        diagnoses,
        icd: diagnoses[0] ?? "",
        includeOnBill: line.includeOnBill,
        physician: line.physician.trim(),
      };
    });
  }

  function save(status: "draft" | "ready" | "held") {
    if (!patient) {
      setError("Add a patient before creating a claim.");
      return;
    }
    if (status === "held" && !holdReason.trim()) {
      setError("Unable to code needs a reason.");
      return;
    }
    const nextLines = parsedLines().filter((line) => line.cpt || status === "held");
    if (status !== "held" && nextLines.some((line) => !line.cpt || !Number.isFinite(line.units) || !Number.isFinite(line.charge))) {
      setError("Each line needs a CPT, units, and a charge you enter. This desk does not invent a fee.");
      return;
    }
    if (status === "ready" && !nextLines.some((line) => line.includeOnBill)) {
      setError("Include at least one line on the bill.");
      return;
    }
    const payload = {
      patientId: patient.id,
      payerName: patient.payerName,
      tradingPartnerId: patient.coverages.find((coverage) => coverage.rank === "primary")?.tradingPartnerId,
      dateOfService,
      placeOfService,
      appointmentId: visit?.id,
      lines: nextLines,
      status,
      holdReason: status === "held" ? holdReason.trim() : "",
      source: "manual" as const,
    };
    if (existing && existing.status !== "submitted" && existing.status !== "paid") {
      updateClaim(existing.id, {
        ...payload,
        lines: nextLines.map((line, index) => ({ ...line, id: existing.lines[index]?.id || `line-${index + 1}` })),
      });
      router.push(`/admin/operations/claims/${existing.id}`);
      return;
    }
    const claim = addClaim(payload);
    router.push(`/admin/operations/claims/${claim.id}`);
  }

  return (
    <main>
      {noteOpen && patient ? <AccountNoteDialog notes={patient.accountNotes} onClose={() => setNoteOpen(false)} /> : null}
      <PageHeader kicker="Coding" title="Charge entry" lede="Scheduled procedures stay off the bill until you move them. Ready for Bill only sends the case to review." />
      <form
        className="mt-8 grid max-w-3xl gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          save("draft");
        }}
      >
        <section className="grid gap-4 rounded-2xl border border-line bg-card p-5 shadow-[0_16px_36px_-28px_rgb(7_30_54_/_0.45)]">
          <h2 className="font-display text-2xl">Visit</h2>
          <Field label="Patient">
            <select className={fieldClass} value={resolvedPatientId} onChange={(event) => setPatientId(event.target.value)} required>
              {options.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
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
          {visit?.opNoteStatus === "missing" ? <p className="text-sm text-muted">Op note is missing. That is visible here and does not block Ready for Bill.</p> : null}
          {visit && visit.scheduledProcedures.length > 0 ? (
            <fieldset className="grid gap-2">
              <legend className="text-sm font-medium">Scheduled, not yet performed</legend>
              {visit.scheduledProcedures.map((procedure) => (
                <label key={procedure.id} className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={selectedProcedures.includes(procedure.id)}
                    onChange={(event) =>
                      setSelectedProcedures((current) =>
                        event.target.checked ? [...current, procedure.id] : current.filter((id) => id !== procedure.id),
                      )
                    }
                  />
                  {procedure.cpt} · {procedure.description} · {procedure.physician}
                </label>
              ))}
              <div className="mt-2 flex flex-wrap gap-2">
                <Button type="button" variant="secondary" onClick={addPerformed}>Add selected to the bill</Button>
                <Button type="button" variant="secondary" onClick={carryDiagnoses}>Copy diagnoses from the chart</Button>
              </div>
            </fieldset>
          ) : (
            <Button type="button" variant="secondary" onClick={carryDiagnoses} className="justify-self-start">Copy diagnoses from the chart</Button>
          )}
        </section>
        {lines.map((line, index) => (
          <fieldset key={index} className="grid gap-3 rounded-2xl border border-line bg-card p-4 shadow-[0_16px_36px_-28px_rgb(7_30_54_/_0.45)] sm:grid-cols-2">
            <legend className="px-1 font-display text-xl">Line {index + 1}</legend>
            <Field label="CPT">
              <input className={fieldClass} value={line.cpt} onChange={(event) => updateLine(index, { cpt: event.target.value })} />
            </Field>
            <Field label="Diagnoses">
              <input className={fieldClass} value={line.diagnoses} onChange={(event) => updateLine(index, { diagnoses: event.target.value })} placeholder="M54.50" />
            </Field>
            {line.modifiers.map((modifier, modifierIndex) => (
              <Field key={modifierIndex} label={`Modifier ${modifierIndex + 1}`}>
                <input
                  className={fieldClass}
                  value={modifier}
                  onChange={(event) => {
                    const modifiers = [...line.modifiers];
                    modifiers[modifierIndex] = event.target.value.toUpperCase();
                    updateLine(index, { modifiers });
                  }}
                />
              </Field>
            ))}
            <Field label="Description" className="sm:col-span-2">
              <input className={fieldClass} value={line.description} onChange={(event) => updateLine(index, { description: event.target.value })} />
            </Field>
            <Field label="Physician">
              <input className={fieldClass} value={line.physician} onChange={(event) => updateLine(index, { physician: event.target.value })} />
            </Field>
            <Field label="Units">
              <input className={fieldClass} value={line.units} onChange={(event) => updateLine(index, { units: event.target.value })} />
            </Field>
            <Field label="Charge">
              <input className={fieldClass} value={line.charge} onChange={(event) => updateLine(index, { charge: event.target.value })} />
            </Field>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={line.includeOnBill} onChange={(event) => updateLine(index, { includeOnBill: event.target.checked })} />
              Include on bill
            </label>
          </fieldset>
        ))}
        <Field label="Unable to code reason">
          <input className={fieldClass} value={holdReason} onChange={(event) => setHoldReason(event.target.value)} placeholder="Only if this case cannot be coded yet" />
        </Field>
        {error ? <p className="text-sm text-emergency">{error}</p> : null}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 py-3 backdrop-blur">
          <Button type="button" variant="secondary" onClick={() => setLines((current) => [...current, emptyLine(practice.physicianName)])}>Add a line</Button>
          <Button type="submit" variant="secondary">Save draft</Button>
          <Button type="button" onClick={() => save("ready")}>Ready for bill</Button>
          <Button type="button" variant="secondary" onClick={() => save("held")}>Unable to code</Button>
        </div>
      </form>
    </main>
  );
}
