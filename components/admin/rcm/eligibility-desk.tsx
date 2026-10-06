"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { formatWhen, money, patientName } from "@/lib/rcm/format";
import {
  Field,
  LoadingDesk,
  PageHeader,
  StatusPill,
  fieldClass,
  panelClass,
  cardClass,
  badgeClass,
} from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";
import { cn } from "@/lib/utils";
import type { ClaimStatus } from "@/lib/rcm/types";

export function EligibilityDesk() {
  const { ready, patients, eligibility, addEligibility } = useRcm();
  const [patientId, setPatientId] = useState("");
  const [inactive, setInactive] = useState(false);
  const names = new Map(patients.map((patient) => [patient.id, patientName(patient)]));
  const resolved = patientId || patients[0]?.id || "";

  if (!ready) return <LoadingDesk />;

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Eligibility"
        lede="Sample benefit estimates. These numbers are not a live 270/271 response."
      />
      <div className="mt-8 grid items-start gap-6 xl:grid-cols-[22rem_minmax(0,1fr)]">
        {/* Side panel — check eligibility */}
        <form
          className={`${panelClass} grid gap-4`}
          onSubmit={(event) => {
            event.preventDefault();
            const patient = patients.find((item) => item.id === resolved);
            if (!patient) return;
            const priorAuth = /aetna|united/i.test(patient.payerName);
            addEligibility({
              patientId: patient.id,
              payerName: patient.payerName,
              active: !inactive,
              copay: inactive ? 0 : 40,
              coinsurance: inactive ? 0 : 20,
              deductibleRemaining: inactive ? 0 : 350,
              priorAuthRequired: !inactive && priorAuth,
              summary: inactive
                ? `${patient.payerName} did not return active coverage for member ${patient.memberId || "id on file"}.`
                : `${patient.payerName} shows active coverage for ${patientName(patient)}. Office copay $40. Deductible remaining $350.${priorAuth ? " Imaging may need prior authorization." : ""}`,
            });
          }}
        >
          <Field label="Patient">
            <select
              className={fieldClass}
              value={patientId}
              onChange={(event) => setPatientId(event.target.value)}
            >
              {patients.map((patient) => (
                <option key={patient.id} value={patient.id}>
                  {patientName(patient)}
                </option>
              ))}
            </select>
          </Field>
          <label className="flex items-center gap-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-oxide-deep"
              checked={inactive}
              onChange={(event) => setInactive(event.target.checked)}
            />
            <span>Simulate inactive / no coverage</span>
          </label>
          <Button type="submit">Check eligibility</Button>
        </form>

        {/* Results list */}
        <div className="grid gap-4">
          <h2 className="font-display text-xl tracking-tight">
            Benefit checks ({eligibility.length})
          </h2>
          {eligibility.length === 0 ? (
            <p className="text-sm text-muted">No eligibility checks yet. Select a patient and run a check.</p>
          ) : null}
          {eligibility.map((result) => {
            const name = names.get(result.patientId) ?? "Unknown";
            return (
              <div key={result.id} className={cardClass}>
                {/* Header */}
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{name}</p>
                    <p className="mt-0.5 text-xs text-muted">{result.payerName}</p>
                  </div>
                  <span
                    className={cn(
                      badgeClass,
                      result.active
                        ? "bg-mint text-oxide-deep"
                        : "bg-red-50 text-emergency",
                    )}
                  >
                    <span
                      className={cn(
                        "h-1.5 w-1.5 rounded-full",
                        result.active ? "bg-oxide-deep" : "bg-emergency",
                      )}
                    />
                    {result.active ? "Active" : "Inactive"}
                  </span>
                </div>
                {/* Benefit breakdown */}
                <div className="mt-4 grid grid-cols-3 gap-3 text-center text-sm">
                  <div className="rounded-xl bg-mist p-2">
                    <p className="text-xs text-muted">Copay</p>
                    <p className="mt-0.5 font-semibold text-ink">{result.copay === 0 ? "—" : money(result.copay)}</p>
                  </div>
                  <div className="rounded-xl bg-mist p-2">
                    <p className="text-xs text-muted">Coinsurance</p>
                    <p className="mt-0.5 font-semibold text-ink">{result.coinsurance === 0 ? "—" : `${result.coinsurance}%`}</p>
                  </div>
                  <div className="rounded-xl bg-mist p-2">
                    <p className="text-xs text-muted">Deductible</p>
                    <p className="mt-0.5 font-semibold text-ink">{result.deductibleRemaining === 0 ? "Met" : money(result.deductibleRemaining)}</p>
                  </div>
                </div>
                {/* Prior auth badge */}
                {result.priorAuthRequired ? (
                  <p className="mt-2 text-xs font-semibold text-oxide-deep">
                    ⚠ Prior auth may be required
                  </p>
                ) : null}
                {/* Summary */}
                <p className="mt-3 text-sm leading-relaxed text-muted">{result.summary}</p>
                <p className="mt-2 text-xs text-muted">Checked {formatWhen(result.createdAt)}</p>
              </div>
            );
          })}
        </div>
      </div>
    </main>
  );
}