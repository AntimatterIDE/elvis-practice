"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ageFromDob, chartGaps, primaryCoverage, visitTypeLabel } from "@/lib/rcm/chart";
import { claimTotal, formatDay, formatWhen, money, patientName } from "@/lib/rcm/format";
import type {
  Allergy,
  Appointment,
  Claim,
  ContactPreference,
  Coverage,
  DocumentStatus,
  Medication,
  Patient,
  PortalStatus,
  Problem,
  Sex,
} from "@/lib/rcm/types";
import { Field, LoadingDesk, PageHeader, StatusPill, fieldClass, useClinicToday, visitLabel } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

const tabs = [
  ["overview", "Overview"],
  ["demographics", "Demographics"],
  ["coverage", "Coverage"],
  ["clinical", "Clinical"],
  ["visits", "Visits"],
  ["documents", "Documents"],
  ["billing", "Billing"],
] as const;

type Tab = (typeof tabs)[number][0];

function nid(prefix: string) {
  return `${prefix}_${crypto.randomUUID().slice(0, 8)}`;
}

export function PatientDetail({ id }: { id: string }) {
  const today = useClinicToday();
  const { ready, patients, claims, appointments, eligibility, tasks, patchPatient, removePatient, updateAppointment } = useRcm();
  const [tab, setTab] = useState<Tab>("overview");
  const patient = patients.find((item) => item.id === id);

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

  const age = ageFromDob(patient.dateOfBirth, today);
  const coverage = primaryCoverage(patient);
  const relatedVisits = appointments
    .filter((appointment) => appointment.patientId === id)
    .sort((a, b) => b.start.localeCompare(a.start));
  const nextVisit = [...relatedVisits].reverse().find((appointment) => appointment.start.slice(0, 10) >= today && appointment.status !== "cancelled");
  const openTasks = tasks.filter((task) => task.patientId === id && task.status === "open");
  const gaps = chartGaps(patient);
  const severeAllergy = patient.allergies.some((allergy) => allergy.severity === "severe" || allergy.severity === "moderate");

  return (
    <main>
      <PageHeader
        kicker={`MRN ${patient.mrn || "new"}`}
        title={patientName(patient)}
        lede={[
          patient.preferredName && patient.preferredName !== patient.firstName ? `Goes by ${patient.preferredName}` : "",
          age !== null ? `${age} yrs` : "",
          patient.pronouns,
          `DOB ${formatDay(patient.dateOfBirth)}`,
          patient.phone || "No phone",
          patient.language,
        ]
          .filter(Boolean)
          .join(" · ")}
        action={
          <Button asChild>
            <Link href={`/admin/operations/scheduling?patient=${patient.id}`}>Schedule visit</Link>
          </Button>
        }
      />
      {patient.flags.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {patient.flags.map((flag) => (
            <span key={flag} className="rounded-full bg-mist px-2.5 py-1 text-xs uppercase tracking-[0.12em]">
              {flag}
            </span>
          ))}
        </div>
      ) : null}
      <p className={`mt-4 border px-4 py-3 text-sm ${severeAllergy || !patient.allergiesReviewed ? "border-emergency/30 bg-red-50" : "border-line bg-mint/40"}`}>
        {!patient.allergiesReviewed
          ? "Allergies have not been reviewed."
          : patient.allergies.length
            ? `Allergies: ${patient.allergies.map((allergy) => `${allergy.substance} (${allergy.reaction})`).join(" · ")}`
            : "No known drug allergies."}
        {coverage ? ` · ${coverage.payerName} copay ${money(coverage.copay)}` : ""}
      </p>
      <div className="mt-6 flex gap-2 overflow-x-auto border-b border-line">
        {tabs.map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setTab(key)}
            className={`shrink-0 border-b-2 px-3 py-2 text-sm ${tab === key ? "border-oxide font-semibold text-oxide" : "border-transparent text-muted"}`}
            aria-current={tab === key ? "page" : undefined}
          >
            {label}
          </button>
        ))}
      </div>
      <div className="mt-6">
        {tab === "overview" ? (
          <Overview
            patient={patient}
            nextVisit={nextVisit}
            openTasks={openTasks}
            gaps={gaps}
            onOpen={setTab}
          />
        ) : null}
        {tab === "demographics" ? <Demographics patient={patient} onSave={patchPatient} onRemove={removePatient} /> : null}
        {tab === "coverage" ? (
          <CoverageDesk
            patient={patient}
            eligibility={eligibility.filter((item) => item.patientId === id)}
            onSave={patchPatient}
          />
        ) : null}
        {tab === "clinical" ? <Clinical patient={patient} onSave={patchPatient} /> : null}
        {tab === "visits" ? <Visits visits={relatedVisits} onUpdate={updateAppointment} /> : null}
        {tab === "documents" ? <Documents patient={patient} onSave={patchPatient} /> : null}
        {tab === "billing" ? <Billing claims={claims.filter((claim) => claim.patientId === id)} /> : null}
      </div>
    </main>
  );
}

function Overview({
  patient,
  nextVisit,
  openTasks,
  gaps,
  onOpen,
}: {
  patient: Patient;
  nextVisit: Appointment | undefined;
  openTasks: { id: string; title: string; detail: string }[];
  gaps: string[];
  onOpen: (tab: Tab) => void;
}) {
  const coverage = primaryCoverage(patient);
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <section className="border border-line bg-card p-4">
        <h2 className="font-display text-2xl">Next visit</h2>
        {nextVisit ? (
          <p className="mt-3 text-sm">
            <span className="block font-semibold">{formatWhen(nextVisit.start)}</span>
            <span className="text-muted">
              {visitTypeLabel[nextVisit.visitType]} · {nextVisit.reason} · {nextVisit.room} · {visitLabel(nextVisit.confirmation)}
            </span>
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">Nothing booked.</p>
        )}
        <button type="button" className="mt-3 text-sm underline" onClick={() => onOpen("visits")}>
          Visit history
        </button>
      </section>
      <section className="border border-line bg-card p-4">
        <h2 className="font-display text-2xl">Coverage</h2>
        {coverage ? (
          <p className="mt-3 text-sm">
            <span className="block font-semibold">
              {coverage.payerName}
              {coverage.planName ? ` · ${coverage.planName}` : ""}
            </span>
            <span className="text-muted">
              Member {coverage.memberId || "not set"} · Copay {money(coverage.copay)} · Subscriber {coverage.subscriberName || "not set"}
            </span>
          </p>
        ) : (
          <p className="mt-3 text-sm text-muted">No coverage on file.</p>
        )}
        <button type="button" className="mt-3 text-sm underline" onClick={() => onOpen("coverage")}>
          Insurance
        </button>
      </section>
      <section className="border border-line bg-card p-4">
        <h2 className="font-display text-2xl">Clinical snapshot</h2>
        <p className="mt-3 text-sm">
          <span className="block font-semibold">Problems</span>
          <span className="text-muted">
            {patient.problems.filter((problem) => problem.status === "active").map((problem) => problem.name).join(", ") || "None recorded"}
          </span>
        </p>
        <p className="mt-3 text-sm">
          <span className="block font-semibold">Medications</span>
          <span className="text-muted">
            {patient.medications
              .filter((medication) => medication.status === "active")
              .map((medication) => `${medication.name} ${medication.dose}`)
              .join(", ") || "None recorded"}
          </span>
        </p>
        <button type="button" className="mt-3 text-sm underline" onClick={() => onOpen("clinical")}>
          Open the clinical chart
        </button>
      </section>
      <section className="border border-line bg-card p-4">
        <h2 className="font-display text-2xl">Front desk</h2>
        {gaps.length ? (
          <ul className="mt-3 grid gap-1 text-sm text-muted">
            {gaps.map((gap) => (
              <li key={gap}>{gap}</li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 text-sm text-muted">Registration items are on file.</p>
        )}
        {openTasks.length ? (
          <ul className="mt-3 grid gap-2 text-sm">
            {openTasks.map((task) => (
              <li key={task.id}>
                <span className="block font-semibold">{task.title}</span>
                <span className="text-muted">{task.detail}</span>
              </li>
            ))}
          </ul>
        ) : null}
      </section>
    </div>
  );
}

function Demographics({
  patient,
  onSave,
  onRemove,
}: {
  patient: Patient;
  onSave: (id: string, patch: Partial<Patient>) => void;
  onRemove: (id: string) => void;
}) {
  const router = useRouter();
  const [form, setForm] = useState(patient);
  const [flagsText, setFlagsText] = useState(patient.flags.join(", "));
  const [saved, setSaved] = useState(false);

  function update<K extends keyof Patient>(key: K, value: Patient[K]) {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  }

  return (
    <form
      className="grid gap-4 border border-line bg-card p-4 sm:grid-cols-2"
      onSubmit={(event) => {
        event.preventDefault();
        onSave(patient.id, {
          ...form,
          flags: flagsText
            .split(",")
            .map((flag) => flag.trim())
            .filter(Boolean),
        });
        setSaved(true);
      }}
    >
      <h2 className="font-display text-2xl sm:col-span-2">Identity</h2>
      <Field label="First name">
        <input className={fieldClass} value={form.firstName} onChange={(event) => update("firstName", event.target.value)} required />
      </Field>
      <Field label="Last name">
        <input className={fieldClass} value={form.lastName} onChange={(event) => update("lastName", event.target.value)} required />
      </Field>
      <Field label="Preferred name">
        <input className={fieldClass} value={form.preferredName} onChange={(event) => update("preferredName", event.target.value)} />
      </Field>
      <Field label="Pronouns">
        <input className={fieldClass} value={form.pronouns} onChange={(event) => update("pronouns", event.target.value)} />
      </Field>
      <Field label="Date of birth">
        <input className={fieldClass} type="date" value={form.dateOfBirth} onChange={(event) => update("dateOfBirth", event.target.value)} required />
      </Field>
      <Field label="Sex">
        <select className={fieldClass} value={form.sex} onChange={(event) => update("sex", event.target.value as Sex)}>
          <option value="female">Female</option>
          <option value="male">Male</option>
          <option value="other">Other</option>
          <option value="unknown">Unknown</option>
        </select>
      </Field>
      <Field label="Language">
        <input className={fieldClass} value={form.language} onChange={(event) => update("language", event.target.value)} />
      </Field>
      <Field label="Preferred contact">
        <select
          className={fieldClass}
          value={form.preferredContact}
          onChange={(event) => update("preferredContact", event.target.value as ContactPreference)}
        >
          <option value="phone">Phone</option>
          <option value="text">Text</option>
          <option value="email">Email</option>
          <option value="portal">Portal</option>
        </select>
      </Field>
      <h2 className="font-display text-2xl sm:col-span-2">Contact</h2>
      <Field label="Phone">
        <input className={fieldClass} value={form.phone} onChange={(event) => update("phone", event.target.value)} />
      </Field>
      <Field label="Email">
        <input className={fieldClass} type="email" value={form.email} onChange={(event) => update("email", event.target.value)} />
      </Field>
      <Field label="Address" className="sm:col-span-2">
        <input className={fieldClass} value={form.address} onChange={(event) => update("address", event.target.value)} />
      </Field>
      <Field label="City">
        <input className={fieldClass} value={form.city} onChange={(event) => update("city", event.target.value)} />
      </Field>
      <Field label="State">
        <input className={fieldClass} value={form.state} onChange={(event) => update("state", event.target.value)} />
      </Field>
      <Field label="Postal code">
        <input className={fieldClass} value={form.postalCode} onChange={(event) => update("postalCode", event.target.value)} />
      </Field>
      <Field label="Portal">
        <select className={fieldClass} value={form.portalStatus} onChange={(event) => update("portalStatus", event.target.value as PortalStatus)}>
          <option value="none">Not invited</option>
          <option value="invited">Invited</option>
          <option value="active">Active</option>
        </select>
      </Field>
      <h2 className="font-display text-2xl sm:col-span-2">Emergency contact</h2>
      <Field label="Name">
        <input className={fieldClass} value={form.emergencyName} onChange={(event) => update("emergencyName", event.target.value)} />
      </Field>
      <Field label="Relationship">
        <input className={fieldClass} value={form.emergencyRelation} onChange={(event) => update("emergencyRelation", event.target.value)} />
      </Field>
      <Field label="Phone">
        <input className={fieldClass} value={form.emergencyPhone} onChange={(event) => update("emergencyPhone", event.target.value)} />
      </Field>
      <h2 className="font-display text-2xl sm:col-span-2">Guarantor</h2>
      <Field label="Name">
        <input className={fieldClass} value={form.guarantorName} onChange={(event) => update("guarantorName", event.target.value)} />
      </Field>
      <Field label="Relationship">
        <input className={fieldClass} value={form.guarantorRelation} onChange={(event) => update("guarantorRelation", event.target.value)} />
      </Field>
      <Field label="Phone">
        <input className={fieldClass} value={form.guarantorPhone} onChange={(event) => update("guarantorPhone", event.target.value)} />
      </Field>
      <h2 className="font-display text-2xl sm:col-span-2">Care team</h2>
      <Field label="Primary care">
        <input className={fieldClass} value={form.pcpName} onChange={(event) => update("pcpName", event.target.value)} />
      </Field>
      <Field label="Primary care phone">
        <input className={fieldClass} value={form.pcpPhone} onChange={(event) => update("pcpPhone", event.target.value)} />
      </Field>
      <Field label="Referring provider">
        <input className={fieldClass} value={form.referringName} onChange={(event) => update("referringName", event.target.value)} />
      </Field>
      <Field label="Referring phone">
        <input className={fieldClass} value={form.referringPhone} onChange={(event) => update("referringPhone", event.target.value)} />
      </Field>
      <Field label="Pharmacy">
        <input className={fieldClass} value={form.pharmacyName} onChange={(event) => update("pharmacyName", event.target.value)} />
      </Field>
      <Field label="Pharmacy phone">
        <input className={fieldClass} value={form.pharmacyPhone} onChange={(event) => update("pharmacyPhone", event.target.value)} />
      </Field>
      <Field label="Chart flags" className="sm:col-span-2">
        <input
          className={fieldClass}
          value={flagsText}
          onChange={(event) => {
            setSaved(false);
            setFlagsText(event.target.value);
          }}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit">Save chart</Button>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            if (!window.confirm("Remove this demo patient and their chart?")) return;
            onRemove(patient.id);
            router.push("/admin/operations/patients");
          }}
        >
          Remove
        </Button>
        {saved ? <span className="text-sm text-oxide">Saved in this browser.</span> : null}
      </div>
    </form>
  );
}

function CoverageDesk({
  patient,
  eligibility,
  onSave,
}: {
  patient: Patient;
  eligibility: { id: string; summary: string; active: boolean }[];
  onSave: (id: string, patch: Partial<Patient>) => void;
}) {
  function saveCoverage(coverageId: string, patch: Partial<Coverage>) {
    onSave(patient.id, {
      coverages: patient.coverages.map((coverage) => (coverage.id === coverageId ? { ...coverage, ...patch } : coverage)),
    });
  }

  return (
    <div className="grid gap-4">
      {patient.coverages.length === 0 ? <p className="text-sm text-muted">No coverage on file.</p> : null}
      {patient.coverages.map((coverage) => (
        <form
          key={coverage.id}
          className="grid gap-4 border border-line bg-card p-4 sm:grid-cols-2"
          onSubmit={(event) => {
            event.preventDefault();
            const data = new FormData(event.currentTarget);
            saveCoverage(coverage.id, {
              payerName: String(data.get("payerName") ?? ""),
              planName: String(data.get("planName") ?? ""),
              memberId: String(data.get("memberId") ?? ""),
              groupNumber: String(data.get("groupNumber") ?? ""),
              subscriberName: String(data.get("subscriberName") ?? ""),
              relationship: String(data.get("relationship") ?? "self") as Coverage["relationship"],
              effectiveDate: String(data.get("effectiveDate") ?? ""),
              copay: Number(data.get("copay")) || 0,
              rank: String(data.get("rank") ?? coverage.rank) as Coverage["rank"],
            });
          }}
        >
          <h2 className="font-display text-2xl capitalize sm:col-span-2">{coverage.rank} insurance</h2>
          <Field label="Payer">
            <input className={fieldClass} name="payerName" defaultValue={coverage.payerName} />
          </Field>
          <Field label="Plan">
            <input className={fieldClass} name="planName" defaultValue={coverage.planName} />
          </Field>
          <Field label="Member id">
            <input className={fieldClass} name="memberId" defaultValue={coverage.memberId} />
          </Field>
          <Field label="Group">
            <input className={fieldClass} name="groupNumber" defaultValue={coverage.groupNumber} />
          </Field>
          <Field label="Subscriber">
            <input className={fieldClass} name="subscriberName" defaultValue={coverage.subscriberName} />
          </Field>
          <Field label="Relationship">
            <select className={fieldClass} name="relationship" defaultValue={coverage.relationship}>
              <option value="self">Self</option>
              <option value="spouse">Spouse</option>
              <option value="child">Child</option>
              <option value="other">Other</option>
            </select>
          </Field>
          <Field label="Effective">
            <input className={fieldClass} type="date" name="effectiveDate" defaultValue={coverage.effectiveDate} />
          </Field>
          <Field label="Office copay">
            <input className={fieldClass} name="copay" defaultValue={coverage.copay} />
          </Field>
          <input type="hidden" name="rank" value={coverage.rank} />
          <div className="sm:col-span-2">
            <Button type="submit">Save coverage</Button>
          </div>
        </form>
      ))}
      {patient.coverages.length < 2 ? (
        <Button
          type="button"
          variant="secondary"
          onClick={() =>
            onSave(patient.id, {
              coverages: [
                ...patient.coverages,
                {
                  id: nid("cov"),
                  rank: "secondary",
                  payerName: "",
                  planName: "",
                  memberId: "",
                  groupNumber: "",
                  subscriberName: patientName(patient),
                  relationship: "self",
                  effectiveDate: "",
                  copay: 0,
                },
              ],
            })
          }
        >
          Add secondary insurance
        </Button>
      ) : null}
      {eligibility.length ? (
        <section className="border border-line bg-card p-4">
          <h2 className="font-display text-2xl">Latest eligibility</h2>
          <ul className="mt-3 grid gap-2 text-sm">
            {eligibility.map((item) => (
              <li key={item.id}>
                <StatusPill status={item.active ? "accepted" : "denied"} label={item.active ? "Active" : "Inactive"} />
                <span className="mt-2 block text-muted">{item.summary}</span>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}

function Clinical({ patient, onSave }: { patient: Patient; onSave: (id: string, patch: Partial<Patient>) => void }) {
  const [problem, setProblem] = useState("");
  const [allergy, setAllergy] = useState("");
  const [reaction, setReaction] = useState("");
  const [medication, setMedication] = useState("");
  const [dose, setDose] = useState("");

  function save(patch: Partial<Patient>) {
    onSave(patient.id, patch);
  }

  return (
    <div className="grid gap-4">
      <section className="border border-line bg-card p-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 className="font-display text-2xl">Allergies</h2>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={patient.allergiesReviewed}
              onChange={(event) => save({ allergiesReviewed: event.target.checked })}
            />
            Reviewed
          </label>
        </div>
        <List
          empty={patient.allergiesReviewed ? "No known drug allergies." : "Not reviewed."}
          rows={patient.allergies.map((item) => ({
            id: item.id,
            title: item.substance,
            detail: `${item.reaction} · ${item.severity}`,
          }))}
          onRemove={(itemId) => save({ allergies: patient.allergies.filter((item) => item.id !== itemId) })}
        />
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!allergy.trim()) return;
            const next: Allergy = {
              id: nid("al"),
              substance: allergy.trim(),
              reaction: reaction.trim() || "Reaction not specified",
              severity: "moderate",
            };
            save({ allergies: [...patient.allergies, next], allergiesReviewed: true });
            setAllergy("");
            setReaction("");
          }}
        >
          <input className={`${fieldClass} max-w-48`} value={allergy} onChange={(event) => setAllergy(event.target.value)} placeholder="Substance" aria-label="Allergy" />
          <input className={`${fieldClass} max-w-48`} value={reaction} onChange={(event) => setReaction(event.target.value)} placeholder="Reaction" aria-label="Reaction" />
          <Button type="submit" variant="secondary">
            Add allergy
          </Button>
        </form>
      </section>
      <section className="border border-line bg-card p-4">
        <h2 className="font-display text-2xl">Problems</h2>
        <List
          empty="No problems recorded."
          rows={patient.problems.map((item) => ({
            id: item.id,
            title: item.name,
            detail: `${item.icd || "No code"} · ${item.status}`,
          }))}
          onRemove={(itemId) => save({ problems: patient.problems.filter((item) => item.id !== itemId) })}
        />
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!problem.trim()) return;
            const next: Problem = { id: nid("pr"), name: problem.trim(), icd: "", status: "active", onset: "" };
            save({ problems: [...patient.problems, next] });
            setProblem("");
          }}
        >
          <input className={`${fieldClass} max-w-80`} value={problem} onChange={(event) => setProblem(event.target.value)} placeholder="Problem" aria-label="Problem" />
          <Button type="submit" variant="secondary">
            Add problem
          </Button>
        </form>
      </section>
      <section className="border border-line bg-card p-4">
        <h2 className="font-display text-2xl">Medications</h2>
        <List
          empty="No medications recorded."
          rows={patient.medications.map((item) => ({
            id: item.id,
            title: item.name,
            detail: `${item.dose} · ${item.frequency} · ${item.status}`,
          }))}
          onRemove={(itemId) => save({ medications: patient.medications.filter((item) => item.id !== itemId) })}
        />
        <form
          className="mt-4 flex flex-wrap gap-2"
          onSubmit={(event) => {
            event.preventDefault();
            if (!medication.trim()) return;
            const next: Medication = {
              id: nid("med"),
              name: medication.trim(),
              dose: dose.trim(),
              frequency: "",
              status: "active",
            };
            save({ medications: [...patient.medications, next] });
            setMedication("");
            setDose("");
          }}
        >
          <input className={`${fieldClass} max-w-48`} value={medication} onChange={(event) => setMedication(event.target.value)} placeholder="Medication" aria-label="Medication" />
          <input className={`${fieldClass} max-w-40`} value={dose} onChange={(event) => setDose(event.target.value)} placeholder="Dose" aria-label="Dose" />
          <Button type="submit" variant="secondary">
            Add medication
          </Button>
        </form>
      </section>
      <History patient={patient} onSave={save} />
    </div>
  );
}

function History({ patient, onSave }: { patient: Patient; onSave: (patch: Partial<Patient>) => void }) {
  const [medical, setMedical] = useState(patient.medicalHistory);
  const [surgical, setSurgical] = useState(patient.surgicalHistory);
  return (
    <form
      className="grid gap-4 border border-line bg-card p-4"
      onSubmit={(event) => {
        event.preventDefault();
        onSave({ medicalHistory: medical, surgicalHistory: surgical });
      }}
    >
      <h2 className="font-display text-2xl">History</h2>
      <Field label="Medical history">
        <textarea className={`${fieldClass} min-h-24`} value={medical} onChange={(event) => setMedical(event.target.value)} />
      </Field>
      <Field label="Surgical history">
        <textarea className={`${fieldClass} min-h-24`} value={surgical} onChange={(event) => setSurgical(event.target.value)} />
      </Field>
      <Button type="submit">Save history</Button>
    </form>
  );
}

function List({
  rows,
  empty,
  onRemove,
}: {
  rows: { id: string; title: string; detail: string }[];
  empty: string;
  onRemove: (id: string) => void;
}) {
  if (!rows.length) return <p className="mt-3 text-sm text-muted">{empty}</p>;
  return (
    <ul className="mt-3 divide-y divide-line border-y border-line">
      {rows.map((row) => (
        <li key={row.id} className="flex items-center justify-between gap-3 py-3 text-sm">
          <span>
            <span className="block font-semibold">{row.title}</span>
            <span className="text-muted">{row.detail}</span>
          </span>
          <button type="button" className="text-sm underline" onClick={() => onRemove(row.id)}>
            Remove
          </button>
        </li>
      ))}
    </ul>
  );
}

function Visits({
  visits,
  onUpdate,
}: {
  visits: Appointment[];
  onUpdate: (id: string, patch: Partial<Appointment>) => void;
}) {
  if (!visits.length) return <p className="text-sm text-muted">No visits yet.</p>;
  return (
    <ul className="grid gap-4">
      {visits.map((visit) => (
        <li key={visit.id} className="border border-line bg-card p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="font-semibold">{formatWhen(visit.start)}</p>
              <p className="text-sm text-muted">
                {visitTypeLabel[visit.visitType]} · {visit.reason} · {visit.room} · {visit.providerName}
              </p>
            </div>
            <StatusPill status={visit.status} label={visitLabel(visit.status)} />
          </div>
          <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-4">
            <div>
              <dt className="text-muted">Blood pressure</dt>
              <dd>{visit.vitals.bloodPressure || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Heart rate</dt>
              <dd>{visit.vitals.heartRate || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Weight</dt>
              <dd>{visit.vitals.weightLb ? `${visit.vitals.weightLb} lb` : "—"}</dd>
            </div>
            <div>
              <dt className="text-muted">Pain</dt>
              <dd>{visit.vitals.painScore || "—"}</dd>
            </div>
          </dl>
          {visit.chiefComplaint ? <p className="mt-3 text-sm">Chief complaint: {visit.chiefComplaint}</p> : null}
          {visit.assessment ? <p className="mt-1 text-sm">Assessment: {visit.assessment}</p> : null}
          {visit.plan ? <p className="mt-1 text-sm">Plan: {visit.plan}</p> : null}
          <label className="mt-3 grid max-w-48 gap-2 text-sm">
            <span>Collected at visit</span>
            <input
              className={fieldClass}
              defaultValue={visit.copayCollected ?? ""}
              aria-label={`Collected at visit on ${formatWhen(visit.start)}`}
              onBlur={(event) => {
                const value = event.target.value.trim();
                onUpdate(visit.id, { copayCollected: value === "" ? null : Number(value) || 0 });
              }}
            />
          </label>
        </li>
      ))}
    </ul>
  );
}

function Documents({ patient, onSave }: { patient: Patient; onSave: (id: string, patch: Partial<Patient>) => void }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {patient.documents.map((document) => (
        <li key={document.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_12rem] sm:items-center">
          <div>
            <p className="font-semibold">{document.name}</p>
            {document.note ? <p className="text-sm text-muted">{document.note}</p> : null}
          </div>
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
        </li>
      ))}
    </ul>
  );
}

function Billing({ claims }: { claims: Claim[] }) {
  return (
    <section>
      <p className="max-w-2xl text-sm text-muted">
        The billing team files and follows these claims. The practice keeps the chart, the schedule, and what is collected at the visit.
      </p>
      <ul className="mt-4 divide-y divide-line border-y border-line">
        {claims.length === 0 ? <li className="py-3 text-sm text-muted">No claims on this chart.</li> : null}
        {claims.map((claim) => (
          <li key={claim.id}>
            <Link href={`/admin/operations/claims/${claim.id}`} className="flex items-center justify-between gap-3 py-3 text-sm">
              <span>
                {formatDay(claim.dateOfService)} · {money(claimTotal(claim))}
              </span>
              <StatusPill status={claim.status} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
