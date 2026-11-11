"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { CodeSearch } from "@/components/admin/code-search";
import { Button } from "@/components/ui/button";
import type { CodeMatch } from "@/lib/coding/codes";
import { formatDay, patientName } from "@/lib/rcm/format";
import { useProcedureFees } from "@/components/admin/rcm/procedure-fees";
import { medicareCharge } from "@/lib/coding/fees";
import {
  claimDraftFromClinicVisit,
  type ClinicVisitClaimDraft,
} from "@/lib/encounters/claim-from-visit";
import type { Encounter } from "@/lib/encounters/types";
import {
  claimFrequencyCodes,
  claimLineProblems,
  diagnosisLimit,
  filingCodes,
  isClaimFrequencyCode,
  isFilingCode,
  pointerLimit,
  type ClaimFrequencyCode,
} from "@/lib/rcm/claim-rules";
import { officeSurgeryPosWarning, placeOfServiceOptions } from "@/lib/rcm/place-of-service";
import { AccountNoteDialog } from "@/components/admin/rcm/account-note";
import { attachmentEvent, claimFileAccept, storeClaimFiles } from "@/components/admin/rcm/claim-files";
import { FilePicker } from "@/components/admin/rcm/file-picker";
import { ChartExtractReview } from "@/components/ocr/chart-extract-review";
import { PayerSearch } from "@/components/admin/rcm/payer-search";
import { Field, LoadingDesk, PageHeader, fieldClass, useClinicToday } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";
import { pushPortalChartsAction } from "@/app/portal/actions";
import { isOcrExtractableFile } from "@/lib/ocr/extractable-file";

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

type VisitFill = "idle" | "loading" | "filled" | "none";

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

function linesFromDraft(draft: ClinicVisitClaimDraft | null, physician: string): LineDraft[] | null {
  if (!draft?.lines.length) return null;
  return draft.lines.map((line) => ({
    ...emptyLine(physician),
    cpt: line.code,
    description: line.description,
    modifiers: [...line.modifiers, "", "", "", ""].slice(0, 4),
    units: String(line.units),
    diagnoses: line.diagnoses,
  }));
}

function draftFromEncounter(encounter: Encounter | null) {
  return encounter ? claimDraftFromClinicVisit(encounter) : null;
}

export function ClaimForm({ initialEncounter = null }: { initialEncounter?: Encounter | null }) {
  const router = useRouter();
  const params = useSearchParams();
  const today = useClinicToday();
  const { ready, patients, appointments, claims, practice, addClaim, updateClaim, patchPatient } = useRcm();
  const requestedPatient = params.get("patient") ?? "";
  const visitId = params.get("visit") || initialEncounter?.appointmentId || "";
  const claimId = params.get("claim") ?? "";
  const savedId = useRef(claimId);
  const existing = claims.find((claim) => claim.id === (claimId || savedId.current));
  const visit = appointments.find((appointment) => appointment.id === visitId);
  const physicianName = visit?.providerName || practice.physicianName;
  const openingDraft = draftFromEncounter(initialEncounter);
  const [patientId, setPatientId] = useState(existing?.patientId || requestedPatient);
  const [payerName, setPayerName] = useState(existing?.payerName ?? "");
  const [tradingPartnerId, setTradingPartnerId] = useState(existing?.tradingPartnerId ?? "");
  const [filingCode, setFilingCode] = useState<string>(existing?.filingCode ?? "");
  const [dateOverride, setDateOverride] = useState<string | null>(
    existing?.dateOfService ?? openingDraft?.dateOfService ?? null,
  );
  const dateOfService = dateOverride || visit?.start.slice(0, 10) || initialEncounter?.createdAt.slice(0, 10) || today;
  const [placeOfService, setPlaceOfService] = useState(existing?.placeOfService || practice.posCode || "11");
  const [claimFrequencyCode, setClaimFrequencyCode] = useState<ClaimFrequencyCode>(
    existing?.claimFrequencyCode === "7" || existing?.claimFrequencyCode === "8"
      ? existing.claimFrequencyCode
      : "1",
  );
  const [payerClaimControlNumber, setPayerClaimControlNumber] = useState(
    existing?.payerClaimControlNumber ?? "",
  );
  const [clinicalNote, setClinicalNote] = useState(existing?.clinicalNote ?? openingDraft?.clinicalNote ?? "");
  const [picked, setPicked] = useState<File[]>([]);
  const [extractFiles, setExtractFiles] = useState<File[] | null>(null);
  const [pending, setPending] = useState(false);
  const [sourceEncounterId, setSourceEncounterId] = useState(
    existing?.encounterId || openingDraft?.encounterId || params.get("encounter") || "",
  );
  const [sourceAppointmentId, setSourceAppointmentId] = useState(
    existing?.appointmentId || openingDraft?.appointmentId || visitId || "",
  );
  const [visitFill, setVisitFill] = useState<VisitFill>(openingDraft ? "filled" : "idle");
  const [visitFillSource, setVisitFillSource] = useState<"approved" | "review" | null>(openingDraft?.source ?? null);
  const [clinicVisits, setClinicVisits] = useState<ClinicVisitClaimDraft[]>(openingDraft ? [openingDraft] : []);
  const [clinicVisitIndex, setClinicVisitIndex] = useState(0);
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
    return linesFromDraft(openingDraft, physicianName) ?? [emptyLine(physicianName)];
  });
  const [claimDiagnoses, setClaimDiagnoses] = useState<ClaimDiagnosis[]>(() => {
    if (existing?.lines.length) {
      return uniqueDiagnoses(existing.lines.flatMap((line) => line.diagnoses.map((code) => ({ code, description: "" }))));
    }
    return openingDraft?.diagnoses ?? [];
  });
  const [holdReason, setHoldReason] = useState(existing?.holdReason ?? "");
  const [assignmentOfBenefits, setAssignmentOfBenefits] = useState(existing?.assignmentOfBenefits !== false);
  const [priorAuthNumber, setPriorAuthNumber] = useState(existing?.priorAuthNumber ?? "");
  const [selectedProcedures, setSelectedProcedures] = useState<string[]>([]);
  const [noteOpen, setNoteOpen] = useState(true);
  const [error, setError] = useState("");
  const hydrated = useRef(false);
  const autofillPatientRef = useRef(openingDraft ? requestedPatient || existing?.patientId || "" : "");
  const filledFromVisitRef = useRef(Boolean(openingDraft));

  useEffect(() => {
    if (hydrated.current || !existing) return;
    hydrated.current = true;
    setPatientId(existing.patientId);
    setPayerName(existing.payerName);
    setTradingPartnerId(existing.tradingPartnerId ?? "");
    setFilingCode(existing.filingCode ?? "");
    setDateOverride(existing.dateOfService);
    setPlaceOfService(existing.placeOfService || practice.posCode || "11");
    setClaimFrequencyCode(
      existing.claimFrequencyCode === "7" || existing.claimFrequencyCode === "8"
        ? existing.claimFrequencyCode
        : "1",
    );
    setPayerClaimControlNumber(existing.payerClaimControlNumber ?? "");
    setClinicalNote(existing.clinicalNote);
    setHoldReason(existing.holdReason ?? "");
    setAssignmentOfBenefits(existing.assignmentOfBenefits !== false);
    setPriorAuthNumber(existing.priorAuthNumber ?? "");
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

  const coded = lines.map((line) => line.cpt).filter(Boolean).join(",");
  const procedureFees = useProcedureFees(coded ? coded.split(",") : []);

  useEffect(() => {
    setLines((current) => {
      let changed = false;
      const next = current.map((line) => {
        const amounts = procedureFees[line.cpt.trim().toUpperCase()];
        if (!amounts) return line;
        const amount = medicareCharge(amounts, placeOfService);
        if (!(amount > 0)) return line;
        const currentCharge = Number(line.charge);
        const blank = !(currentCharge > 0);
        const schedulePrice = currentCharge === amounts.nonFacility || currentCharge === amounts.facility;
        if (!blank && !schedulePrice) return line;
        if (currentCharge === amount) return line;
        changed = true;
        return { ...line, charge: amount.toFixed(2) };
      });
      return changed ? next : current;
    });
  }, [procedureFees, placeOfService, coded]);

  const patient = patients.find((item) => item.id === patientId);
  const primaryCoverage = patient?.coverages.find((coverage) => coverage.rank === "primary");
  const shownPayer = payerName || patient?.payerName || "";
  const shownPayerId = tradingPartnerId || primaryCoverage?.tradingPartnerId || "";
  const options = useMemo(
    () => patients.map((item) => ({ id: item.id, label: `${patientName(item)} · ${item.payerName}` })),
    [patients],
  );

  useEffect(() => {
    if (existing || !patient) return;
    if (!payerName && patient.payerName) setPayerName(patient.payerName);
    if (!tradingPartnerId && primaryCoverage?.tradingPartnerId) setTradingPartnerId(primaryCoverage.tradingPartnerId);
  }, [existing, patient, payerName, tradingPartnerId, primaryCoverage?.tradingPartnerId]);

  function applyClinicDraft(draft: ClinicVisitClaimDraft, index = 0, visits?: ClinicVisitClaimDraft[]) {
    const nextLines = linesFromDraft(draft, physicianName);
    if (!nextLines) return false;
    if (visits) setClinicVisits(visits);
    setClinicVisitIndex(index);
    setSourceEncounterId(draft.encounterId);
    setSourceAppointmentId(draft.appointmentId || "");
    setDateOverride(draft.dateOfService);
    setClinicalNote(draft.clinicalNote);
    setClaimDiagnoses(draft.diagnoses);
    setLines(nextLines);
    setVisitFill("filled");
    setVisitFillSource(draft.source);
    filledFromVisitRef.current = true;
    setError("");
    return true;
  }

  function clearClinicDraft() {
    setClinicVisits([]);
    setClinicVisitIndex(0);
    setSourceEncounterId("");
    setSourceAppointmentId("");
    setDateOverride(null);
    setClinicalNote("");
    setClaimDiagnoses([]);
    setLines([emptyLine(physicianName)]);
    setVisitFill("none");
    setVisitFillSource(null);
    filledFromVisitRef.current = false;
  }

  function selectClinicVisit(index: number) {
    const draft = clinicVisits[index];
    if (!draft || index === clinicVisitIndex) return;
    applyClinicDraft(draft, index);
  }

  useEffect(() => {
    if (!ready || existing || initialEncounter || !patientId || !patient) return;
    if (autofillPatientRef.current === patientId) return;
    autofillPatientRef.current = patientId;

    let cancelled = false;
    setVisitFill("loading");
    setClinicVisits([]);
    setClinicVisitIndex(0);

    void (async () => {
      try {
        const appointmentIds = appointments
          .filter((appointment) => appointment.patientId === patientId)
          .map((appointment) => appointment.id);
        const response = await fetch("/api/encounters/latest-for-patient", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({
            patientId,
            patientName: patientName(patient),
            appointmentIds,
          }),
        });
        const payload = (await response.json()) as {
          visits?: { draft?: ClinicVisitClaimDraft | null }[];
          draft?: ClinicVisitClaimDraft | null;
          message?: string;
        };
        if (cancelled) return;
        const drafts = (payload.visits ?? [])
          .map((item) => item.draft)
          .filter((draft): draft is ClinicVisitClaimDraft => Boolean(draft));
        const first = drafts[0] ?? payload.draft ?? null;
        if (!response.ok || !first) {
          if (filledFromVisitRef.current) clearClinicDraft();
          else setVisitFill("none");
          return;
        }
        applyClinicDraft(first, 0, drafts.length ? drafts : [first]);
      } catch {
        if (cancelled) return;
        if (filledFromVisitRef.current) clearClinicDraft();
        else setVisitFill("none");
      }
    })();

    return () => {
      cancelled = true;
    };
    // Autofill once per selected patient for a blank new claim — not while editing or opening ?encounter=.
    // eslint-disable-next-line react-hooks/exhaustive-deps -- patientId drives the fetch; helpers close over latest physician/appointments.
  }, [ready, existing, initialEncounter, patientId, patient?.id]);

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
    if (status !== "held" && nextLines.some((line) => !line.cpt || !Number.isFinite(line.units) || !(line.charge > 0))) {
      setError("Each line needs a CPT, units, and a charge above $0. The fee schedule fills the charge when Medicare prices that code. Enter one when it does not.");
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
    if (status === "ready" && !(tradingPartnerId || primaryCoverage?.tradingPartnerId || "").trim()) {
      setError("Search and pick the payer from the Stedi list. A typed payer name alone cannot be marked ready for bill.");
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
    const nextPayerId = (tradingPartnerId || primaryCoverage?.tradingPartnerId || "").trim();
    const payload = {
      patientId: patient.id,
      payerName: shownPayer,
      filingCode: isFilingCode(filingCode) ? filingCode : undefined,
      tradingPartnerId: nextPayerId || undefined,
      dateOfService,
      placeOfService,
      appointmentId: visit?.id || sourceAppointmentId || undefined,
      encounterId: sourceEncounterId || params.get("encounter") || initialEncounter?.id || undefined,
      lines: nextLines,
      status,
      holdReason: status === "held" ? holdReason.trim() : "",
      source: "manual" as const,
      clinicalNote: clinicalNote.trim(),
      assignmentOfBenefits,
      priorAuthNumber: priorAuthNumber.trim(),
      claimFrequencyCode: isClaimFrequencyCode(claimFrequencyCode) ? claimFrequencyCode : "1",
      payerClaimControlNumber: payerClaimControlNumber.trim(),
    };
    if (nextPayerId && shownPayer) {
      const coverages = patient.coverages.length
        ? patient.coverages.map((coverage) =>
            coverage.rank === "primary"
              ? { ...coverage, payerName: shownPayer, tradingPartnerId: nextPayerId, memberId: coverage.memberId || patient.memberId }
              : coverage,
          )
        : [
            {
              id: `cov_${crypto.randomUUID().slice(0, 8)}`,
              rank: "primary" as const,
              payerName: shownPayer,
              planName: "",
              memberId: patient.memberId,
              groupNumber: "",
              subscriberName: patientName(patient),
              relationship: "self" as const,
              effectiveDate: "",
              copay: 0,
              tradingPartnerId: nextPayerId,
            },
          ];
      patchPatient(patient.id, { payerName: shownPayer, coverages });
    }
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
  const knownPlaceOfService = placeOfServiceOptions.some((option) => option.code === placeOfService);
  const posWarning = officeSurgeryPosWarning(
    placeOfService,
    lines.filter((line) => line.includeOnBill).map((line) => line.cpt),
  );

  return (
    <main>
      {noteOpen && patient ? <AccountNoteDialog notes={patient.accountNotes} onClose={() => setNoteOpen(false)} /> : null}
      <PageHeader
        kicker="Billing"
        title={existing ? "Edit claim" : manual ? "New claim" : "Charge entry"}
        lede={
          manual
            ? "Choose the patient, then enter the date and codes. The charge fills from the Medicare fee schedule. Add the visit note and any papers. This is for a visit that was not written in the scribe. Saving keeps it as a draft until you mark it ready for bill. Ready for bill does not send the claim to Stedi."
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
                const coverage = next?.coverages.find((item) => item.rank === "primary");
                setPayerName(next?.payerName ?? "");
                setTradingPartnerId(coverage?.tradingPartnerId ?? "");
                if (!id) {
                  autofillPatientRef.current = "";
                  if (filledFromVisitRef.current && !initialEncounter) clearClinicDraft();
                  else if (!initialEncounter) setVisitFill("idle");
                }
              }}
              required
            >
              <option value="">Select a patient</option>
              {options.map((option) => (
                <option key={option.id} value={option.id}>{option.label}</option>
              ))}
            </select>
          </Field>
          {!initialEncounter && visitFill === "loading" ? (
            <p className="text-sm text-muted">Looking up Alignment Clinic visits for this patient…</p>
          ) : null}
          {!initialEncounter && visitFill === "filled" && clinicVisits.length ? (
            <div className="grid gap-3 rounded-xl border border-line bg-paper/60 p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="grid gap-1">
                  <p className="text-sm font-medium">
                    Alignment Clinic visit {clinicVisitIndex + 1} of {clinicVisits.length}
                  </p>
                  <p className="text-sm text-muted">
                    {formatDay(clinicVisits[clinicVisitIndex]?.dateOfService || dateOfService)}
                    {" · "}
                    {visitFillSource === "approved" ? "approved codes" : "review suggestions"}
                    {" · "}
                    {(clinicVisits[clinicVisitIndex]?.diagnoses.length ?? 0)} ICD
                    {" · "}
                    {(clinicVisits[clinicVisitIndex]?.lines.length ?? 0)} CPT
                  </p>
                  <p className="text-sm text-muted">
                    {clinicVisits[clinicVisitIndex]?.lines.map((line) => line.code).join(", ") || "No procedures"}
                    {" · "}
                    {clinicVisits[clinicVisitIndex]?.diagnoses.map((item) => item.code).join(", ") || "No diagnoses"}
                  </p>
                </div>
                {clinicVisits.length > 1 ? (
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pending || clinicVisitIndex >= clinicVisits.length - 1}
                      onClick={() => selectClinicVisit(clinicVisitIndex + 1)}
                    >
                      Earlier visit
                    </Button>
                    <Button
                      type="button"
                      variant="secondary"
                      disabled={pending || clinicVisitIndex <= 0}
                      onClick={() => selectClinicVisit(clinicVisitIndex - 1)}
                    >
                      Later visit
                    </Button>
                  </div>
                ) : null}
              </div>
              {clinicVisits.length > 1 ? (
                <Field label="Choose visit">
                  <select
                    className={fieldClass}
                    value={String(clinicVisitIndex)}
                    disabled={pending}
                    onChange={(event) => selectClinicVisit(Number(event.target.value))}
                  >
                    {clinicVisits.map((draft, index) => (
                      <option key={draft.encounterId} value={String(index)}>
                        {formatDay(draft.dateOfService)} · {draft.source} ·{" "}
                        {draft.lines.map((line) => line.code).join(", ") || "no CPT"} ·{" "}
                        {draft.diagnoses.map((item) => item.code).join(", ") || "no ICD"}
                      </option>
                    ))}
                  </select>
                </Field>
              ) : null}
              <p className="text-sm text-muted">
                {visitFillSource === "approved"
                  ? "Note, diagnoses, and procedures come from this Visit Desk encounter. Each CPT keeps the diagnosis pointers from coding. Charges fill from the Medicare fee schedule."
                  : "Note and suggested codes come from this Visit Desk encounter still under review. Confirm diagnoses and procedures before Ready for bill."}
              </p>
            </div>
          ) : null}
          {!initialEncounter && visitFill === "none" && patientId && !existing ? (
            <p className="text-sm text-muted">
              No Alignment Clinic visit with a note and codes was found for this patient. Enter the claim by hand, or finish the visit on the Visit Desk first.
            </p>
          ) : null}
          <Field label="Payer">
            <PayerSearch
              label="Payer"
              value={shownPayer}
              tradingPartnerId={shownPayerId}
              disabled={pending}
              onChange={(next) => {
                setPayerName(next.name);
                setTradingPartnerId(next.tradingPartnerId);
              }}
            />
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
              <select
                className={fieldClass}
                value={knownPlaceOfService ? placeOfService : "other"}
                onChange={(event) => {
                  const next = event.target.value;
                  if (next === "other") {
                    setPlaceOfService(knownPlaceOfService ? "" : placeOfService);
                    return;
                  }
                  setPlaceOfService(next);
                }}
              >
                {placeOfServiceOptions.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
                <option value="other">Other CMS code…</option>
              </select>
            </Field>
          </div>
          {!knownPlaceOfService ? (
            <Field label="Other place of service code">
              <input
                className={fieldClass}
                value={placeOfService}
                onChange={(event) => setPlaceOfService(event.target.value.replace(/\D/g, "").slice(0, 2))}
                inputMode="numeric"
                maxLength={2}
                placeholder="Two-digit CMS code"
              />
            </Field>
          ) : null}
          {posWarning ? (
            <p className="rounded-md bg-black/[0.04] px-3 py-2 text-sm leading-relaxed text-ink">{posWarning}</p>
          ) : null}
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Claim frequency">
              <select
                className={fieldClass}
                value={claimFrequencyCode}
                onChange={(event) => {
                  const next = event.target.value;
                  setClaimFrequencyCode(isClaimFrequencyCode(next) ? next : "1");
                  if (next === "1") setPayerClaimControlNumber("");
                }}
              >
                {claimFrequencyCodes.map((option) => (
                  <option key={option.code} value={option.code}>
                    {option.label}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Payer claim control number">
              <input
                className={fieldClass}
                value={payerClaimControlNumber}
                onChange={(event) => setPayerClaimControlNumber(event.target.value)}
                disabled={claimFrequencyCode === "1"}
                placeholder={claimFrequencyCode === "1" ? "Only for replacement or void" : "From the original remittance"}
              />
            </Field>
          </div>
          {claimFrequencyCode !== "1" && filingCode === "MB" ? (
            <p className="rounded-md bg-emergency/10 px-3 py-2 text-sm text-emergency">
              Medicare Part B does not accept replacement or void frequency codes on professional claims. Use original (1) and omit the payer claim control number.
            </p>
          ) : null}
          <Field label="Prior authorization number">
            <input
              className={fieldClass}
              value={priorAuthNumber}
              onChange={(event) => setPriorAuthNumber(event.target.value)}
              placeholder="Leave blank if none"
            />
          </Field>
          <label className="flex items-start gap-2 text-sm">
            <input
              type="checkbox"
              className="mt-1"
              checked={assignmentOfBenefits}
              onChange={(event) => setAssignmentOfBenefits(event.target.checked)}
            />
            <span>
              Assignment of benefits — payer pays the practice. Uncheck when the patient already paid and the payer should reimburse the patient.
            </span>
          </label>
          {initialEncounter && openingDraft ? (
            <p className="text-sm text-muted">
              {initialEncounter.patientLabel || "This visit"}{" "}
              {openingDraft.source === "approved"
                ? "was approved with these diagnosis and procedure codes."
                : "is under review — these are the suggested diagnosis and procedure codes."}{" "}
              The charge fills from the Medicare fee schedule.
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
          <div className="grid gap-2">
            <span className="text-sm font-medium">Files</span>
            <FilePicker
              label="Upload a file"
              busy={pending}
              variant="secondary"
              accept={claimFileAccept}
              onFiles={(files) => {
                setPicked((current) => [...current, ...files]);
                const extractable = files.filter((file) => isOcrExtractableFile(file));
                if (extractable.length) setExtractFiles(extractable);
              }}
            />
          </div>
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
          {extractFiles && patient ? (
            <ChartExtractReview
              patient={patient}
              files={extractFiles}
              onDismiss={() => setExtractFiles(null)}
              onApplied={async (merged) => {
                const result = await pushPortalChartsAction({ patients: [merged], appointments: [] });
                if (!result.ok) throw new Error(result.error || "Could not save extracted chart fields.");
                const { id, ...patch } = merged;
                patchPatient(id, patch);
                setExtractFiles(null);
              }}
            />
          ) : null}
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
            <div className="sm:col-span-2 grid gap-2">
              <label htmlFor={`line-cpt-${index}`} className="text-sm font-medium">
                CPT / HCPCS
              </label>
              <CodeSearch
                id={`line-cpt-${index}`}
                kind="procedure"
                label={`Line ${index + 1} procedure code`}
                placeholder="Type a CPT or HCPCS code, such as 99204 or 63047"
                disabled={pending}
                className="grid gap-2"
                value={line.cpt}
                onValueChange={(cpt) => {
                  const next = cpt.toUpperCase().replace(/[^A-Z0-9]/g, "").slice(0, 10);
                  updateLine(index, next === line.cpt ? { cpt: next } : { cpt: next, charge: "" });
                }}
                onPick={(match) => {
                  const amount = medicareCharge({ nonFacility: match.nonFacility ?? 0, facility: match.facility ?? 0 }, placeOfService);
                  updateLine(index, {
                    cpt: match.code,
                    description: line.description.trim() ? line.description : match.description || match.note || "",
                    charge: amount > 0 ? amount.toFixed(2) : "",
                  });
                }}
              />
            </div>
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
              <input
                className={fieldClass}
                value={line.charge}
                placeholder={line.cpt && !(Number(line.charge) > 0) ? "No Medicare price for this code" : "Fee schedule"}
                onChange={(event) => updateLine(index, { charge: event.target.value })}
              />
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
