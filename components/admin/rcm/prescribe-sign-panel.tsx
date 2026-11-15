"use client";

import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/admin/rcm/ui";
import { isControlledSchedule, scheduleLabel } from "@/lib/erx/client";
import type { Prescription } from "@/lib/rcm/types";

export function PrescribeSignPanel({
  prescription,
  pending,
  pin,
  onPinChange,
  onConfirm,
  onCancel,
  liveFrameUrl,
}: {
  prescription: Prescription;
  pending: boolean;
  pin: string;
  onPinChange: (value: string) => void;
  onConfirm: () => void;
  onCancel: () => void;
  /** When DoseSpot live credentials exist, host their URL here instead of the mock panel. */
  liveFrameUrl?: string | null;
}) {
  const controlled = isControlledSchedule(prescription.schedule);

  if (liveFrameUrl) {
    return (
      <div className="overflow-hidden rounded-xl border border-line bg-white">
        <p className="border-b border-line px-4 py-2 text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-oxide-deep">
          Vendor signature
        </p>
        <iframe title="eRx signature" src={liveFrameUrl} className="h-[28rem] w-full bg-white" />
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-line bg-mist/40 px-4 py-4 sm:px-5">
      <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-oxide-deep">
        Mock vendor review and sign
      </p>
      <p className="mt-2 text-sm text-muted">
        Stand-in for the DoseSpot hosted review / 2FA step. Live mode will load the vendor frame in this
        same slot.
      </p>
      <dl className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div>
          <dt className="text-xs text-muted">Medication</dt>
          <dd className="font-semibold">
            {prescription.drugName} {prescription.dose}
          </dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Schedule</dt>
          <dd className="font-semibold">{scheduleLabel(prescription.schedule)}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Sig</dt>
          <dd>{prescription.sig || "—"}</dd>
        </div>
        <div>
          <dt className="text-xs text-muted">Quantity / days / refills</dt>
          <dd>
            {prescription.quantity || "—"} · {prescription.daysSupply || "—"} days ·{" "}
            {prescription.refills} refill{prescription.refills === 1 ? "" : "s"}
          </dd>
        </div>
        <div className="sm:col-span-2">
          <dt className="text-xs text-muted">Pharmacy</dt>
          <dd>
            {prescription.pharmacyName}
            {prescription.pharmacyNcpdpId ? ` · NCPDP ${prescription.pharmacyNcpdpId}` : ""}
          </dd>
        </div>
      </dl>
      {controlled ? (
        <label className="mt-4 block text-sm">
          <span className="text-xs font-semibold uppercase tracking-[0.12em] text-oxide-deep">
            Mock EPCS PIN
          </span>
          <input
            className={`${fieldClass} mt-1 max-w-[12rem]`}
            inputMode="numeric"
            autoComplete="one-time-code"
            value={pin}
            onChange={(event) => onPinChange(event.target.value.replace(/\D/g, "").slice(0, 8))}
            placeholder="4–8 digits"
            aria-label="Mock EPCS PIN"
          />
        </label>
      ) : null}
      <div className="mt-5 flex flex-wrap gap-2">
        <Button type="button" disabled={pending || (controlled && pin.length < 4)} onClick={onConfirm}>
          {pending ? "Sending…" : controlled ? "Sign with 2FA and send" : "Confirm and send"}
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={onCancel}>
          Back
        </Button>
      </div>
    </div>
  );
}
