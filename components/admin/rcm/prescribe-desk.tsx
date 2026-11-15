"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
  cancelErxPrescription,
  createErxVendorDraft,
  erxStatus,
  fileErxSendProof,
  listErxInbox,
  queueErxForSignature,
  searchErxDrugs,
  searchErxPharmacies,
  sendErxPrescription,
  syncErxPatient,
} from "@/app/admin/erx/actions";
import { Button } from "@/components/ui/button";
import { PrescribeSignPanel } from "@/components/admin/rcm/prescribe-sign-panel";
import { Field, LoadingDesk, PageHeader, fieldClass, panelClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";
import { isControlledSchedule, scheduleLabel } from "@/lib/erx/client";
import type { ErxDrugHit, ErxInboxItem, ErxPharmacyHit } from "@/lib/erx/types";
import { formatWhen, patientName } from "@/lib/rcm/format";
import type { Prescription, PrescriptionSchedule } from "@/lib/rcm/types";

type Step = "list" | "draft" | "sign";

export function PrescribeDesk({ patientId }: { patientId: string }) {
  const {
    ready,
    patients,
    prescriptions,
    practice,
    addPrescription,
    updatePrescription,
    patchPatient,
  } = useRcm();
  const patient = patients.find((item) => item.id === patientId);
  const [step, setStep] = useState<Step>("list");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [modeLabel, setModeLabel] = useState("mock");
  const [pending, setPending] = useState(false);
  const [pin, setPin] = useState("");
  const [inbox, setInbox] = useState<ErxInboxItem[]>([]);

  const [drugQuery, setDrugQuery] = useState("");
  const [drugHits, setDrugHits] = useState<ErxDrugHit[]>([]);
  const [pharmacyQuery, setPharmacyQuery] = useState("");
  const [pharmacyHits, setPharmacyHits] = useState<ErxPharmacyHit[]>([]);

  const [drugName, setDrugName] = useState("");
  const [dose, setDose] = useState("");
  const [rxNorm, setRxNorm] = useState("");
  const [ndc, setNdc] = useState("");
  const [sig, setSig] = useState("");
  const [quantity, setQuantity] = useState("30");
  const [daysSupply, setDaysSupply] = useState("30");
  const [refills, setRefills] = useState(0);
  const [schedule, setSchedule] = useState<PrescriptionSchedule>("non_controlled");
  const [pharmacyName, setPharmacyName] = useState("");
  const [pharmacyPhone, setPharmacyPhone] = useState("");
  const [pharmacyNcpdpId, setPharmacyNcpdpId] = useState("");
  const [pharmacyAddress, setPharmacyAddress] = useState("");
  const [diagnosisNote, setDiagnosisNote] = useState("");
  const [pharmacyNote, setPharmacyNote] = useState("");
  const [istopChecked, setIstopChecked] = useState(false);

  const patientRx = useMemo(
    () =>
      (prescriptions ?? [])
        .filter((rx) => rx.patientId === patientId)
        .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)),
    [prescriptions, patientId],
  );
  const active = patientRx.find((rx) => rx.id === activeId) ?? null;

  useEffect(() => {
    void erxStatus().then((status) => {
      if (status.signedIn) setModeLabel(`${status.mode} · ${status.adapter}`);
    });
  }, []);

  useEffect(() => {
    if (!patient) return;
    setPharmacyName(patient.pharmacyName || "");
    setPharmacyPhone(patient.pharmacyPhone || "");
    setPharmacyNcpdpId(patient.pharmacyNcpdpId || "");
    setPharmacyAddress(patient.pharmacyAddress || "");
  }, [patient?.id]);

  useEffect(() => {
    if (!patient) return;
    void listErxInbox(patient.id).then((result) => {
      if (result.ok) setInbox(result.items);
    });
  }, [patient?.id]);

  if (!ready) return <LoadingDesk />;
  if (!patient) {
    return (
      <main>
        <h1 className="font-display text-4xl">Patient not found</h1>
        <Link href="/admin/operations/patients" className="mt-4 inline-block text-sm underline">
          Back to patients
        </Link>
      </main>
    );
  }

  const chart = patient;

  function resetDraftForm() {
    setDrugName("");
    setDose("");
    setRxNorm("");
    setNdc("");
    setSig("");
    setQuantity("30");
    setDaysSupply("30");
    setRefills(0);
    setSchedule("non_controlled");
    setDiagnosisNote("");
    setPharmacyNote("");
    setIstopChecked(false);
    setPin("");
    setDrugHits([]);
    setDrugQuery("");
  }

  function pickDrug(hit: ErxDrugHit) {
    setDrugName(hit.name);
    setDose(hit.dose);
    setRxNorm(hit.rxNorm || "");
    setNdc(hit.ndc || "");
    setSig(hit.defaultSig);
    setSchedule(hit.schedule);
    setDrugHits([]);
    setDrugQuery(hit.name);
  }

  function pickPharmacy(hit: ErxPharmacyHit) {
    setPharmacyName(hit.name);
    setPharmacyPhone(hit.phone);
    setPharmacyNcpdpId(hit.ncpdpId);
    setPharmacyAddress(`${hit.address}, ${hit.city}, ${hit.state} ${hit.zip}`);
    setPharmacyHits([]);
    setPharmacyQuery(hit.name);
    patchPatient(patientId, {
      pharmacyName: hit.name,
      pharmacyPhone: hit.phone,
      pharmacyNcpdpId: hit.ncpdpId,
      pharmacyAddress: `${hit.address}, ${hit.city}, ${hit.state} ${hit.zip}`,
    });
  }

  async function runDrugSearch() {
    setPending(true);
    const result = await searchErxDrugs(drugQuery);
    setDrugHits(result.drugs);
    setMessage(result.message);
    setPending(false);
  }

  async function runPharmacySearch() {
    setPending(true);
    const result = await searchErxPharmacies(pharmacyQuery);
    setPharmacyHits(result.pharmacies);
    setMessage(result.message);
    setPending(false);
  }

  async function prepareDraft() {
    if (!drugName.trim() || !sig.trim() || !pharmacyNcpdpId.trim()) {
      setMessage("Drug, sig, and a pharmacy with NCPDP id are required.");
      return;
    }
    setPending(true);
    setMessage("");
    const sync = await syncErxPatient({
      externalId: chart.id,
      firstName: chart.firstName,
      lastName: chart.lastName,
      dateOfBirth: chart.dateOfBirth,
      sex: chart.sex,
      address1: chart.address,
      city: chart.city,
      state: chart.state,
      zip: chart.postalCode,
      phone: chart.phone,
      allergies: chart.allergies.map((item) => item.substance).filter(Boolean),
    });
    if (!sync.ok) {
      setMessage(sync.message);
      setPending(false);
      return;
    }
    const vendor = await createErxVendorDraft({
      patientExternalId: chart.id,
      drugName: drugName.trim(),
      rxNorm: rxNorm.trim() || undefined,
      ndc: ndc.trim() || undefined,
      dose: dose.trim(),
      sig: sig.trim(),
      quantity: quantity.trim(),
      daysSupply: daysSupply.trim(),
      refills,
      schedule,
      pharmacyNcpdpId: pharmacyNcpdpId.trim(),
      diagnosisNote: diagnosisNote.trim() || undefined,
      pharmacyNote: pharmacyNote.trim() || undefined,
    });
    if (!vendor.ok || !vendor.vendorPrescriptionId) {
      setMessage(vendor.message);
      setPending(false);
      return;
    }
    const queued = await queueErxForSignature(vendor.vendorPrescriptionId);
    if (!queued.ok) {
      setMessage(queued.message);
      setPending(false);
      return;
    }
    const rx = addPrescription({
      patientId: chart.id,
      drugName: drugName.trim(),
      rxNorm: rxNorm.trim() || undefined,
      ndc: ndc.trim() || undefined,
      dose: dose.trim(),
      sig: sig.trim(),
      quantity: quantity.trim(),
      daysSupply: daysSupply.trim(),
      refills,
      schedule,
      pharmacyName: pharmacyName.trim(),
      pharmacyPhone: pharmacyPhone.trim(),
      pharmacyNcpdpId: pharmacyNcpdpId.trim(),
      pharmacyAddress: pharmacyAddress.trim() || undefined,
      diagnosisNote: diagnosisNote.trim() || undefined,
      pharmacyNote: pharmacyNote.trim() || undefined,
    });
    const now = new Date().toISOString();
    updatePrescription(rx.id, {
      status: "pending_signature",
      vendorPrescriptionId: vendor.vendorPrescriptionId,
      events: [
        ...rx.events,
        { id: crypto.randomUUID(), at: now, kind: "prepared", summary: "Prepared for signature" },
      ],
    });
    setActiveId(rx.id);
    setStep("sign");
    setMessage(queued.message);
    setPending(false);
  }

  function stampIstop(rx: Prescription) {
    const now = new Date().toISOString();
    updatePrescription(rx.id, {
      istopCheckedAt: now,
      istopCheckedBy: practice.physicianName || "prescriber",
      events: [
        ...rx.events,
        {
          id: crypto.randomUUID(),
          at: now,
          kind: "istop",
          summary: "NY I-STOP / PMP consult documented (manual)",
        },
      ],
    });
    setIstopChecked(true);
  }

  async function confirmSign() {
    if (!active?.vendorPrescriptionId) {
      setMessage("This draft has no vendor id yet.");
      return;
    }
    if (isControlledSchedule(active.schedule) && !active.istopCheckedAt && !istopChecked) {
      setMessage("Document the NY I-STOP consult before signing a controlled substance.");
      return;
    }
    setPending(true);
    const result = await sendErxPrescription({
      vendorPrescriptionId: active.vendorPrescriptionId,
      schedule: active.schedule,
      pin,
    });
    if (!result.ok) {
      updatePrescription(active.id, {
        status: "error",
        errorMessage: result.message,
        events: [
          ...active.events,
          { id: crypto.randomUUID(), at: new Date().toISOString(), kind: "error", summary: result.message },
        ],
      });
      setMessage(result.message);
      setPending(false);
      return;
    }
    const now = new Date().toISOString();
    updatePrescription(active.id, {
      status: "sent",
      sentAt: now,
      errorMessage: undefined,
      events: [
        ...active.events,
        { id: crypto.randomUUID(), at: now, kind: "signed", summary: "Signed in vendor panel" },
        { id: crypto.randomUUID(), at: now, kind: "sent", summary: result.message },
      ],
    });
    const existing = chart.medications.find(
      (med) => med.name.toLowerCase() === active.drugName.toLowerCase() && med.status === "active",
    );
    if (!existing) {
      patchPatient(chart.id, {
        medications: [
          ...chart.medications,
          {
            id: crypto.randomUUID(),
            name: active.drugName,
            dose: active.dose,
            frequency: active.sig,
            status: "active",
            rxNorm: active.rxNorm,
            ndc: active.ndc,
            quantity: active.quantity,
            daysSupply: active.daysSupply,
            refills: active.refills,
            sig: active.sig,
            pharmacyId: active.pharmacyNcpdpId,
          },
        ],
      });
    }
    const filed = await fileErxSendProof({
      patientId: chart.id,
      prescriptionId: active.id,
      drugName: `${active.drugName} ${active.dose}`.trim(),
      pharmacyName: active.pharmacyName,
      vendorPrescriptionId: result.vendorPrescriptionId || active.vendorPrescriptionId,
      message: result.message,
    });
    setMessage(
      filed.ok
        ? `${result.message} Proof filed on Files.`
        : `${result.message} Chart file: ${filed.message}`,
    );
    setStep("list");
    setActiveId(null);
    resetDraftForm();
    setPending(false);
  }

  async function cancelActive() {
    if (!active) return;
    setPending(true);
    if (active.vendorPrescriptionId) {
      await cancelErxPrescription(active.vendorPrescriptionId);
    }
    updatePrescription(active.id, {
      status: "cancelled",
      events: [
        ...active.events,
        {
          id: crypto.randomUUID(),
          at: new Date().toISOString(),
          kind: "cancelled",
          summary: "Cancelled before send",
        },
      ],
    });
    setMessage("Prescription cancelled.");
    setStep("list");
    setActiveId(null);
    setPending(false);
  }

  return (
    <main>
      <PageHeader
        kicker="e-Prescribing beta"
        title={patientName(patient)}
        lede={`Hybrid desk: prepare here, sign in the vendor slot. Adapter: ${modeLabel}. No live Surescripts until credentials are configured.`}
        action={
          <Link href={`/admin/operations/patients/${patient.id}`} className="text-sm underline">
            Back to chart
          </Link>
        }
      />

      {message ? <p className="mt-4 text-sm text-muted">{message}</p> : null}

      {step === "list" ? (
        <div className="mt-6 grid gap-6 lg:grid-cols-[1.2fr_0.8fr]">
          <section className={panelClass}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="font-display text-2xl">Prescriptions</h2>
              <Button
                type="button"
                onClick={() => {
                  resetDraftForm();
                  setStep("draft");
                }}
              >
                New prescription
              </Button>
            </div>
            {patientRx.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No prescriptions on this chart yet.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {patientRx.map((rx) => (
                  <li key={rx.id} className="rounded-xl border border-line px-4 py-3 text-sm">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div>
                        <p className="font-semibold">
                          {rx.drugName} {rx.dose}
                        </p>
                        <p className="text-muted">
                          {scheduleLabel(rx.schedule)} · {rx.status.replaceAll("_", " ")} ·{" "}
                          {formatWhen(rx.updatedAt)}
                        </p>
                        <p className="text-muted">{rx.pharmacyName || "No pharmacy"}</p>
                      </div>
                      {rx.status === "pending_signature" ? (
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={() => {
                            setActiveId(rx.id);
                            setIstopChecked(Boolean(rx.istopCheckedAt));
                            setStep("sign");
                          }}
                        >
                          Resume sign
                        </Button>
                      ) : null}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={panelClass}>
            <h2 className="font-display text-2xl">Pharmacy inbox</h2>
            <p className="mt-2 text-sm text-muted">Mock renewal / change requests from the adapter.</p>
            {inbox.length === 0 ? (
              <p className="mt-3 text-sm text-muted">No open requests.</p>
            ) : (
              <ul className="mt-4 grid gap-3">
                {inbox.map((item) => (
                  <li key={item.id} className="rounded-xl border border-line px-3 py-3 text-sm">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-oxide-deep">
                      {item.kind}
                    </p>
                    <p className="mt-1 font-semibold">{item.drugName}</p>
                    <p className="text-muted">{item.summary}</p>
                    <div className="mt-2 flex gap-2">
                      <Button type="button" variant="secondary" disabled>
                        Approve (soon)
                      </Button>
                      <Button type="button" variant="secondary" disabled>
                        Deny (soon)
                      </Button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      ) : null}

      {step === "draft" ? (
        <section className={`${panelClass} mt-6`}>
          <h2 className="font-display text-2xl">Prepare prescription</h2>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field label="Drug search">
              <div className="flex gap-2">
                <input
                  className={fieldClass}
                  value={drugQuery}
                  onChange={(event) => setDrugQuery(event.target.value)}
                  placeholder="Ibuprofen, gabapentin…"
                  aria-label="Drug search"
                />
                <Button type="button" variant="secondary" disabled={pending} onClick={() => void runDrugSearch()}>
                  Search
                </Button>
              </div>
              {drugHits.length ? (
                <ul className="mt-2 max-h-40 overflow-auto rounded-lg border border-line bg-white text-sm">
                  {drugHits.map((hit) => (
                    <li key={`${hit.name}-${hit.dose}`}>
                      <button
                        type="button"
                        className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-mist"
                        onClick={() => pickDrug(hit)}
                      >
                        <span className="font-semibold">
                          {hit.name} {hit.dose}
                        </span>
                        <span className="text-xs text-muted">{scheduleLabel(hit.schedule)}</span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Field>
            <Field label="Pharmacy search">
              <div className="flex gap-2">
                <input
                  className={fieldClass}
                  value={pharmacyQuery}
                  onChange={(event) => setPharmacyQuery(event.target.value)}
                  placeholder="Name or ZIP"
                  aria-label="Pharmacy search"
                />
                <Button type="button" variant="secondary" disabled={pending} onClick={() => void runPharmacySearch()}>
                  Search
                </Button>
              </div>
              {pharmacyHits.length ? (
                <ul className="mt-2 max-h-40 overflow-auto rounded-lg border border-line bg-white text-sm">
                  {pharmacyHits.map((hit) => (
                    <li key={hit.ncpdpId}>
                      <button
                        type="button"
                        className="flex w-full flex-col items-start px-3 py-2 text-left hover:bg-mist"
                        onClick={() => pickPharmacy(hit)}
                      >
                        <span className="font-semibold">{hit.name}</span>
                        <span className="text-xs text-muted">
                          {hit.address}, {hit.city} · NCPDP {hit.ncpdpId}
                        </span>
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
            </Field>
            <Field label="Drug name">
              <input className={fieldClass} value={drugName} onChange={(event) => setDrugName(event.target.value)} />
            </Field>
            <Field label="Dose">
              <input className={fieldClass} value={dose} onChange={(event) => setDose(event.target.value)} />
            </Field>
            <Field label="Sig">
              <input className={fieldClass} value={sig} onChange={(event) => setSig(event.target.value)} />
            </Field>
            <Field label="Schedule">
              <select
                className={fieldClass}
                value={schedule}
                onChange={(event) => setSchedule(event.target.value as PrescriptionSchedule)}
              >
                <option value="non_controlled">Non-controlled</option>
                <option value="II">Schedule II</option>
                <option value="III">Schedule III</option>
                <option value="IV">Schedule IV</option>
                <option value="V">Schedule V</option>
              </select>
            </Field>
            <Field label="Quantity">
              <input className={fieldClass} value={quantity} onChange={(event) => setQuantity(event.target.value)} />
            </Field>
            <Field label="Days supply">
              <input className={fieldClass} value={daysSupply} onChange={(event) => setDaysSupply(event.target.value)} />
            </Field>
            <Field label="Refills">
              <input
                className={fieldClass}
                type="number"
                min={0}
                value={refills}
                onChange={(event) => setRefills(Number(event.target.value) || 0)}
              />
            </Field>
            <Field label="Pharmacy">
              <input className={fieldClass} value={pharmacyName} onChange={(event) => setPharmacyName(event.target.value)} />
            </Field>
            <Field label="Pharmacy phone">
              <input className={fieldClass} value={pharmacyPhone} onChange={(event) => setPharmacyPhone(event.target.value)} />
            </Field>
            <Field label="NCPDP id">
              <input
                className={fieldClass}
                value={pharmacyNcpdpId}
                onChange={(event) => setPharmacyNcpdpId(event.target.value)}
              />
            </Field>
            <Field label="Diagnosis / note">
              <input
                className={fieldClass}
                value={diagnosisNote}
                onChange={(event) => setDiagnosisNote(event.target.value)}
                placeholder="ICD or clinical note for state wording"
              />
            </Field>
            <Field label="Pharmacy note">
              <input
                className={fieldClass}
                value={pharmacyNote}
                onChange={(event) => setPharmacyNote(event.target.value)}
              />
            </Field>
          </div>
          <div className="mt-5 flex flex-wrap gap-2">
            <Button type="button" disabled={pending} onClick={() => void prepareDraft()}>
              {pending ? "Preparing…" : "Prepare for signature"}
            </Button>
            <Button type="button" variant="secondary" disabled={pending} onClick={() => setStep("list")}>
              Cancel
            </Button>
          </div>
        </section>
      ) : null}

      {step === "sign" && active ? (
        <section className={`${panelClass} mt-6 grid gap-4`}>
          <h2 className="font-display text-2xl">Review and sign</h2>
          {isControlledSchedule(active.schedule) ? (
            <label className="flex items-start gap-3 rounded-xl border border-line bg-white px-4 py-3 text-sm">
              <input
                type="checkbox"
                className="mt-1"
                checked={Boolean(active.istopCheckedAt) || istopChecked}
                onChange={(event) => {
                  if (event.target.checked) stampIstop(active);
                  else setIstopChecked(false);
                }}
              />
              <span>
                <span className="font-semibold">NY I-STOP / PMP consulted</span>
                <span className="mt-1 block text-muted">
                  Manual stamp for Schedule II–IV. Automated HCS lookup is out of scope for this beta.
                  {active.istopCheckedAt ? ` Logged ${formatWhen(active.istopCheckedAt)}.` : ""}
                </span>
              </span>
            </label>
          ) : null}
          <PrescribeSignPanel
            prescription={active}
            pending={pending}
            pin={pin}
            onPinChange={setPin}
            onConfirm={() => void confirmSign()}
            onCancel={() => void cancelActive()}
          />
        </section>
      ) : null}
    </main>
  );
}
