"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CodeSearch } from "@/components/admin/code-search";
import { Button } from "@/components/ui/button";
import type { CodeMatch } from "@/lib/coding/codes";
import { patientName } from "@/lib/rcm/format";
import { claimLinesFromEncounter } from "@/lib/encounters/approve";
import type { Encounter } from "@/lib/encounters/types";
import { claimLineProblems, diagnosisLimit, filingCodes, isFilingCode, pointerLimit } from "@/lib/rcm/claim-rules";
import { AccountNoteDialog } from "@/components/admin/rcm/account-note";
import { attachmentEvent, claimFileAccept, storeClaimFiles } from "@/components/admin/rcm/claim-files";
import { Field, LoadingDesk, PageHeader, fieldClass, useClinicToday } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

type ClaimDiagnosis = { code: string; description: string };

type LineDraft = {
  cpt: string;
  description: string;
  modifiers: string[];
  units: string;
  charge: string;
  diagnoses: string[];
  includeOnBill: boolean;
  physician: string;
};

const emptyLine = (physician = ""): LineDraft => ({
  cpt: "",
  description: "",
  modifiers: ["", "", "", ""],
  units: "1",
  charge: "",
  diagnoses: [],
  includeOnBill: true,
  physician,
});

function uniqueDiagnoses(codes: ClaimDiagnosis[]) {
  const seen = new Set<string>();
  const out: ClaimDiagnosis[] = [];
  for (const item of codes) {
    if (!item.code || seen.has(item.code)) continue;
    seen.add(item.code);
    out.push(item);
  }
  return out;
}

function linesFromEncounter(encounter: Encounter | null, physician: string): LineDraft[] | null {
  if (!encounter || encounter.status !== "approved") return null;
  const procedures = claimLinesFromEncounter(encounter);
  if (!procedures.length) return null;
  return procedures.map((line) => ({
    ...emptyLine(physician),
    cpt: line.code,
    description: line.description,
    modifiers: [...line.modifiers, "", "", "", ""].slice(0, 4),
    units: String(line.units),
    diagnoses: line.diagnoses,
  }));
}

function diagnosesFromEncounter(encounter: Encounter | null): ClaimDiagnosis[] {
  if (!encounter || encounter.status !== "approved") return [];
  return uniqueDiagnoses(
    encounter.icd10.filter((code) => code.approved).map((code) => ({ code: code.code, description: code.description })),
  );
}

export function ClaimForm({ initialEncounter = null }: { initialEncounter?: Encounter | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const today = useClinicToday();
  const { ready, patients, appointments, claims, practice, addClaim, updateClaim } = useRcm();
  const requestedPatient = params.get("patient") ?? "";
  const visitId = params.get("visit") || initialEncounter?.appointmentId || "";
  const claimId = params.get("claim") ?? "";
  const savedId = useRef(claimId);
  const existing = claims.find((claim) => claim.id === (claimId || savedId.current));
  const visit = appointments.find((appointment) => appointment.id === visitId);
  const [patientId, setPatientId] = useState(existing?.patientId || requestedPatient);
  const [payerName, setPayerName] = useState(existing?.payerName ?? "");
  const [filingCode, setFilingCode] = useState<string>(existing?.filingCode ?? "");
  const [dateOverride, setDateOverride] = useState<string | null>(existing?.dateOfService ?? null);
  const dateOfService = dateOverride || visit?.start.slice(0, 10) || initialEncounter?.createdAt.slice(0, 10) || today;
  const [placeOfService, setPlaceOfService] = useState(existing?.placeOfService || practice.posCode || "11");
  const [clinicalNote, setClinicalNote] = useState(existing?.clinicalNote ?? "");
  const [picked, setPicked] = useState<File[]>([]);
  const [pending, setPending] = useState(false);
  const [lines, setLines] = useState<LineDraft[]>(() => {
    if (existing?.lines.length) {
      return existing.lines.map((line) => ({
        cpt: line.cpt,
        description: line.description,
        modifiers: [...line.modifiers, "", "", "", ""].slice(0, 4),
        units: String(line.units),
        charge: String(line.charge),
        diagnoses: line.diagnoses,
        includeOnBill: line.includeOnBill,
        physician: line.physician,
      }));
    }
    return linesFromEncounter(initialEncounter, visit?.providerName || practice.physicianName) ?? [emptyLine(visit?.providerName || practice.physicianName)];
  });
  const [claimDiagnoses, setClaimDiagnoses] = useState<ClaimDiagnosis[]>(() => {
    if (existing?.lines.length) {
      return uniqueDiagnoses(existing.lines.flatMap((line) => line.diagnoses.map((code) => ({ code, description: "" }))));
    }
    return diagnosesFromEncounter(initialEncounter);
  });
  const [holdReason, setHoldReason] = useState(existing?.holdReason ?? "");
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [noteOpen, setNoteOpen] = useState(true);
  const [error, setError] = useState("");
  const hydrated = useRef(false);

  useEffect(() => {
    if (hydrated.current || !existing) return;
    hydrated.current = true;
    setPatientId(existing.patientId);
    setPayerName(existing.payerName);
    setFilingCode(existing.filingCode ?? "");
    setDateOverride(existing.dateOfService);
    setPlaceOfService(existing.placeOfService || practice.posCode || "11");
    setClinicalNote(existing.clinicalNote);
    setHoldReason(existing.holdReason ?? "");
    if (existing.lines.length) {
      setLines(
        existing.lines.map((line) => ({
          cpt: line.cpt,
          description: line.description,
          modifiers: [...line.modifiers, "", "", "", ""].slice(0, 4),
          units: String(line.units),
          charge: String(line.charge),
          diagnoses: line.diagnoses,
          includeOnBill: line.includeOnBill,
          physician: line.physician,
        })),
      );
      setClaimDiagnoses(uniqueDiagnoses(existing.lines.flatMap((line) => line.diagnoses.map((code) => ({ code, description: "" })))));
    }
  }, [existing, practice.posCode]);

  const patient = patients.find((item) => item.id === patientId);
  const shownPayer = payerName || patient?.payerName || "";
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
    const fromChart = uniqueDiagnoses(
      patient.problems
        .filter((problem) => problem.status === "active" && problem.icd.trim())
        .map((problem) => ({ code: problem.icd.trim().toUpperCase(), description: problem.name })),
    );
    if (!fromChart.length) {
      setError("This chart has no active problem with an ICD code.");
      return;
    }
    setClaimDiagnoses((current) => uniqueDiagnoses([...current, ...fromChart]).slice(0, diagnosisLimit));
    setError("");
  }

  function addDiagnosis(match: CodeMatch) {
    setClaimDiagnoses((current) => {
      if (current.some((item) => item.code === match.code) || current.length >= diagnosisLimit) return current;
      return [...current, { code: match.code, description: match.description }];
    });
    setError("");
  }

  function removeDiagnosis(code: string) {
    setClaimDiagnoses((current) => current.filter((item) => item.code !== code));
    setLines((current) => current.map((line) => ({ ...line, diagnoses: line.diagnoses.filter((item) => item !== code) })));
  }

  function moveDiagnosisUp(index: number) {
    if (index < 1) return;
    setClaimDiagnoses((current) => {
      const next = [...current];
      [next[index - 1], next[index]] = [next[index], next[index - 1]];
      return next;
    });
  }

  function addProcedure(match: CodeMatch) {
    const first = claimDiagnoses[0]?.code;
    setLines((current) => [
      ...current.filter((line) => line.cpt || line.charge),
      {
        ...emptyLine(practice.physicianName),
        cpt: match.code,
        description: match.description || match.note || "",
        diagnoses: first ? [first] : [],
      },
    ]);
    setError("");
  }

  function linkDiagnosis(index: number, code: string, linked: boolean) {
    setLines((current) =>
      current.map((line, position) => {
        if (position !== index) return line;
        if (linked) {
          if (line.diagnoses.includes(code) || line.diagnoses.length >= pointerLimit) return line;
          return { ...line, diagnoses: [...line.diagnoses, code] };
        }
        return { ...line, diagnoses: line.diagnoses.filter((item) => item !== code) };
      }),
    );
  }

  function addPerformed() {
    if (!visit || !patient) return;
    const chosen = visit.scheduledProcedures.filter((procedure) => selectedProcedures.includes(procedure.id));
    if (!chosen.length) {
      setError("Select a scheduled procedure before adding it to the bill.");
      return;
    }
    const fromChart = uniqueDiagnoses(
      patient.problems
        .filter((problem) => problem.status === "active" && problem.icd.trim())
        .map((problem) => ({ code: problem.icd.trim().toUpperCase(), description: problem.name })),
    );
    if (fromChart.length) {
      setClaimDiagnoses((current) => uniqueDiagnoses([...current, ...fromChart]).slice(0, diagnosisLimit));
    }
    const pointers = (fromChart.length ? fromChart : claimDiagnoses).map((item) => item.code).slice(0, pointerLimit);
    setLines((current) => [
      ...current.filter((line) => line.cpt || line.charge),
      ...chosen.map((procedure) => ({
        ...emptyLine(procedure.physician),
        cpt: procedure.cpt,
        description: procedure.description,
        diagnoses: pointers,
      })),
    ]);
    setSelectedProcedures([]);
    setError("");
  }

  function parsedLines() {
    return lines.map((line) => {
      const modifiers = line.modifiers.map((modifier) => modifier.trim()).filter(Boolean);
      const diagnoses = line.diagnoses.map((code) => code.trim()).filter(Boolean);
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

  async function save(status: "draft" | "ready" | "held") {
    if (pending) return;
    if (!patient) {
      setError("Choose a patient before creating a claim.");
      return;
    }
    if (status === "held" && !holdReason.trim()) {
      setError("Unable to code needs a reason.");
      return;
    }
    const parsed = parsedLines();
    const nextLines = parsed.filter((line) => line.cpt || status === "held");
    if (status !== "held" && nextLines.some((line) => !line.cpt || !Number.isFinite(line.units) || !Number.isFinite(line.charge))) {
      setError("Each line needs a CPT, units, and a charge you enter. This desk does not invent a fee.");
      return;
    }
    if (status === "ready" && !nextLines.some((line) => line.includeOnBill)) {
      setError("Include at least one line on the bill.");
      return;
    }
    if (status === "ready" && !isFilingCode(filingCode)) {
      setError("Choose the payer type. It tells the payer which kind of plan this claim is billed to.");
      return;
    }
    const lineProblems = status === "ready" ? claimLineProblems(parsed) : [];
    if (lineProblems.length) {
      setError(lineProblems.join(" "));
      return;
    }
    if (status === "ready") {
      setPending(true);
      setError("");
      try {
        const response = await fetch("/api/coding/check", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            dateOfService,
            lines: parsed.map((line) => ({
              cpt: line.cpt,
              modifiers: line.modifiers,
              diagnoses: line.diagnoses,
              includeOnBill: line.includeOnBill,
              units: line.units,
            })),
          }),
        });
        const payload = (await response.json()) as { problems?: string[]; message?: string };
        if (!response.ok) {
          setPending(false);
          setError(payload.message || "Code check is not available. Sign in again and try Ready for bill.");
          return;
        }
        if (payload.problems?.length) {
          setPending(false);
          setError(payload.problems.join(" "));
          return;
        }
      } catch {
        setPending(false);
        setError("Code check is not available. Check the connection and try Ready for bill again.");
        return;
      }
    }
    const payload = {
      patientId: patient.id,
      payerName: shownPayer,
      filingCode: isFilingCode(filingCode) ? filingCode : undefined,
      tradingPartnerId: patient.coverages.find((coverage) => coverage.rank === "primary")?.tradingPartnerId,
      dateOfService,
      placeOfService,
      appointmentId: visit?.id,
      encounterId: params.get("encounter") || initialEncounter?.id,
      lines: nextLines,
      status,
      holdReason: status === "held" ? holdReason.trim() : "",
      source: "manual" as const,
      clinicalNote: clinicalNote.trim(),
    };
    setPending(true);
    setError("");
    const editing = existing && existing.status !== "submitted" && existing.status !== "paid" ? existing : null;
    let id = "";
    let priorAttachments = editing?.attachments ?? [];
    let priorEvents = editing?.events ?? [];
    if (editing) {
      id = editing.id;
      updateClaim(editing.id, {
        ...payload,
        lines: nextLines.map((line, index) => ({ ...line, id: editing.lines[index]?.id || `line-${index + 1}` })),
      });
    } else {
      const created = addClaim(payload);
      id = created.id;
      priorAttachments = created.attachments;
      priorEvents = created.events;
    }
    savedId.current = id;
    if (picked.length) {
      const stored = await storeClaimFiles(patient.id, id, picked);
      if (stored.files.length) {
        updateClaim(id, {
          attachments: [...priorAttachments, ...stored.files],
          events: [...priorEvents, attachmentEvent(stored.files.map((file) => file.name))],
        });
      }
      if (!stored.ok) {
        setPicked([]);
        setPending(false);
        setError(`${stored.message} The claim is saved. Add the remaining files again, or open the claim and add them there.`);
        const visitQuery = visit ? `&visit=${visit.id}` : "";
        router.replace(`/admin/operations/claims/new?patient=${patient.id}&claim=${id}${visitQuery}`);
        return;
      }
    }
    setPending(false);
    router.push(`/admin/operations/claims/${id}`);
  }

  const manual = !initialEncounter && !visit;

  return (
    <main>
      {noteOpen && patient ? <AccountNoteDialog notes={patient.accountNotes} onClose={() => setNoteOpen(false)} /> : null}
      <PageHeader
        kicker="Billing"
        title={existing ? "Edit claim" : manual ? "New claim" : "Charge entry"}
        lede={
          manual
            ? "Choose the patient, enter the date, codes, and charge, then add the visit note and any papers. This is for a visit that was not written in the scribe. Saving keeps it as a draft until you mark it ready for bill."
            : "Scheduled procedures stay off the bill until you move them. Ready for Bill only sends the case to review."
        }
      />
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
            <select
              className={fieldClass}
              value={patientId}
              onChange={(event) => {
                const id = event.target.value;
                setPatientId(id);
                const next = patients.find((item) => item.id === id);
                setPayerName(next?.payerName ?? "");
              }}
              required
            >
              <option value="">Select a patient</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </Field>
          <Field label="Payer">
            <input className={fieldClass} value={shownPayer} onChange={(event) => setPayerName(event.target.value)} placeholder="Payer on this claim" />
          </Field>
          <Field label="Payer type">
            <select className={fieldClass} value={filingCode} onChange={(event) => setFilingCode(event.target.value)}>
              <option value="">Choose the kind of plan</option>
              {filingCodes.map((option) => (
                <option key={option.code} value={option.code}>{option.label}</option>
              ))}
            </select>
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Date of service">
              <input className={fieldClass} type="date" value={dateOfService} onChange={(event) => setDateOverride(event.target.value)} required />
            </Field>
            <Field label="Place of service">
              <input className={fieldClass} value={placeOfService} onChange={(event) => setPlaceOfService(event.target.value)} />
            </Field>
          </div>
          {initialEncounter?.status === "approved" ? (
            <p className="text-sm text-muted">
              {initialEncounter.patientLabel || "This visit"} was approved with these diagnosis and procedure codes. Enter the charge for each line.
            </p>
          ) : null}
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
        <section className="grid gap-4 rounded-2xl border border-line bg-card p-5 shadow-[0_16px_36px_-28px_rgb(7_30_54_/_0.45)]">
          <h2 className="font-display text-2xl">Note and papers</h2>
          <p className="text-sm text-muted">
            Paste the visit note and add the PDF or photos when this visit was not written in the scribe. They stay on the claim.
          </p>
          <Field label="Visit note">
            <textarea
              className={`${fieldClass} min-h-32`}
              value={clinicalNote}
              onChange={(event) => setClinicalNote(event.target.value)}
              placeholder="What was seen, what was done, and anything the biller needs from the outside note."
            />
          </Field>
          <Field label="Files">
            <input
              className={fieldClass}
              type="file"
              accept={claimFileAccept}
              multiple
              disabled={pending}
              aria-label="Add note or papers to this claim"
              onChange={(event) => {
                const list = event.target.files;
                if (list?.length) setPicked((current) => [...current, ...list]);
                event.target.value = "";
              }}
            />
          </Field>
          {picked.length ? (
            <ul className="grid gap-2 text-sm">
              {picked.map((file, index) => (
                <li key={`${file.name}-${index}`} className="flex items-center justify-between gap-3">
                  <span>{file.name}</span>
                  <button
                    type="button"
                    className="underline"
                    onClick={() => setPicked((current) => current.filter((_, position) => position !== index))}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted">No files selected yet. A PDF, photo, or video can be added before you save.</p>
          )}
        </section>
        <section className="grid gap-4 rounded-2xl border border-line bg-card p-5 shadow-[0_16px_36px_-28px_rgb(7_30_54_/_0.45)]">
          <h2 className="font-display text-2xl">Diagnoses</h2>
          <p className="text-sm text-muted">
            Put the main diagnosis first. Only billable ICD-10-CM codes from the clinic library are offered. A claim carries up to {diagnosisLimit}.
          </p>
          {claimDiagnoses.length ? (
            <ol className="grid gap-2 text-sm">
              {claimDiagnoses.map((item, index) => (
                <li key={item.code} className="flex flex-wrap items-baseline justify-between gap-2">
                  <span>
                    <span className="font-medium">
                      {index + 1}. {item.code}
                    </span>
                    {item.description ? <span className="text-muted"> · {item.description}</span> : null}
                  </span>
                  <span className="flex gap-3">
                    {index > 0 ? (
                      <button type="button" className="underline" onClick={() => moveDiagnosisUp(index)} disabled={pending}>
                        Move up
                      </button>
                    ) : null}
                    <button type="button" className="underline" onClick={() => removeDiagnosis(item.code)} disabled={pending}>
                      Remove
                    </button>
                  </span>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm text-muted">No diagnoses yet.</p>
          )}
          {claimDiagnoses.length < diagnosisLimit ? (
            <CodeSearch
              kind="diagnosis"
              label="Add a diagnosis"
              placeholder="Add a diagnosis: type a code or words, such as M48.062 or stenosis"
              disabled={pending}
              onPick={addDiagnosis}
            />
          ) : null}
        </section>
        {lines.map((line, index) => (
          <fieldset key={index} className="grid gap-3 rounded-2xl border border-line bg-card p-4 shadow-[0_16px_36px_-28px_rgb(7_30_54_/_0.45)] sm:grid-cols-2">
            <legend className="px-1 font-display text-xl">
              Line {index + 1}
              {line.cpt ? ` · ${line.cpt}` : ""}
            </legend>
            <Field label="CPT / HCPCS" className="sm:col-span-2">
              <input className={fieldClass} value={line.cpt} readOnly aria-label={`Line ${index + 1} procedure code`} />
              <p className="mt-1 text-sm text-muted">Pick the code with search below, or remove this line and add another.</p>
            </Field>
            {line.modifiers.map((modifier, modifierIndex) => (
              <Field key={modifierIndex} label={`Modifier ${modifierIndex + 1}`}>
                <input
                  className={fieldClass}
                  maxLength={2}
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
            <fieldset className="sm:col-span-2 flex flex-wrap gap-x-4 gap-y-2">
              <legend className="mb-2 text-sm font-medium">Diagnoses for this line</legend>
              {claimDiagnoses.length ? (
                claimDiagnoses.map((item, position) => {
                  const linked = line.diagnoses.includes(item.code);
                  return (
                    <label key={item.code} className="flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={linked}
                        onChange={(event) => linkDiagnosis(index, item.code, event.target.checked)}
                        disabled={pending || (!linked && line.diagnoses.length >= pointerLimit)}
                      />
                      {position + 1}. {item.code}
                    </label>
                  );
                })
              ) : (
                <p className="text-sm text-muted">Add a diagnosis above first.</p>
              )}
            </fieldset>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={line.includeOnBill} onChange={(event) => updateLine(index, { includeOnBill: event.target.checked })} />
              Include on bill
            </label>
            <button
              type="button"
              className="justify-self-start text-sm underline"
              onClick={() => setLines((current) => current.filter((_, position) => position !== index))}
              disabled={pending}
            >
              Remove line
            </button>
          </fieldset>
        ))}
        <section className="grid gap-2 rounded-2xl border border-line bg-card p-5 shadow-[0_16px_36px_-28px_rgb(7_30_54_/_0.45)]">
          <h2 className="font-display text-2xl">Add a procedure</h2>
          <p className="text-sm text-muted">
            CPT codes show the number only. Confirm each one against the note. HCPCS descriptions come from CMS.
          </p>
          <CodeSearch
            kind="procedure"
            label="Add a procedure"
            placeholder="Add a procedure: type a CPT or HCPCS code, such as 63047 or J1010"
            disabled={pending}
            onPick={addProcedure}
          />
        </section>
        <Field label="Unable to code reason">
          <input className={fieldClass} value={holdReason} onChange={(event) => setHoldReason(event.target.value)} placeholder="Only if this case cannot be coded yet" />
        </Field>
        {error ? <p className="text-sm text-emergency">{error}</p> : null}
        <div className="sticky bottom-0 z-10 flex flex-wrap items-center gap-3 border-t border-line bg-paper/95 py-3 backdrop-blur">
          <Button type="submit" variant="secondary" disabled={pending}>{pending ? "Saving…" : "Save draft"}</Button>
          <Button type="button" disabled={pending} onClick={() => void save("ready")}>Ready for bill</Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => void save("held")}>Unable to code</Button>
        </div>
      </form>
    </main>
  );
}
