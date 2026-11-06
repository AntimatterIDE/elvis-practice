"use client";

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PracticeProfile } from "@/lib/rcm/types";
import { Field, LoadingDesk, PageHeader, fieldClass } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

export function PracticeDesk() {
  const { ready, practice, syncError, updatePractice } = useRcm();
  const [form, setForm] = useState<PracticeProfile | null>(null);
  const [saved, setSaved] = useState(false);
  const [pending, setPending] = useState(false);
  const value = form ?? practice;

  useEffect(() => {
    setForm(null);
  }, [practice.updatedAt, practice.npi, practice.taxId, practice.address]);

  if (!ready) return <LoadingDesk />;

  function update<K extends keyof PracticeProfile>(key: K, next: PracticeProfile[K]) {
    setSaved(false);
    setForm({ ...value, [key]: next });
  }

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Practice profile"
        lede="Billing defaults for claims written here. Add the NPI, tax id, and address before a claim is filed. Saves are shared with every staff login."
      />
      <form
        className="mt-8 grid max-w-2xl gap-4 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          updatePractice(value);
          setSaved(true);
          setPending(false);
        }}
      >
        <Field label="Legal name" className="sm:col-span-2">
          <input className={fieldClass} value={value.legalName} onChange={(event) => update("legalName", event.target.value)} />
        </Field>
        <Field label="Physician" className="sm:col-span-2">
          <input className={fieldClass} value={value.physicianName} onChange={(event) => update("physicianName", event.target.value)} />
        </Field>
        <Field label="NPI">
          <input className={fieldClass} value={value.npi} onChange={(event) => update("npi", event.target.value)} />
        </Field>
        <Field label="Tax id">
          <input className={fieldClass} value={value.taxId} onChange={(event) => update("taxId", event.target.value)} />
        </Field>
        <Field label="Taxonomy">
          <input className={fieldClass} value={value.taxonomy} onChange={(event) => update("taxonomy", event.target.value)} />
        </Field>
        <Field label="Place of service">
          <input className={fieldClass} value={value.posCode} onChange={(event) => update("posCode", event.target.value)} />
        </Field>
        <Field label="Phone">
          <input className={fieldClass} value={value.phone} onChange={(event) => update("phone", event.target.value)} />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <input className={fieldClass} value={value.address} placeholder="Street, city, ST ZIP" onChange={(event) => update("address", event.target.value)} />
        </Field>
        <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
          <Button type="submit" disabled={pending}>
            Save profile
          </Button>
          {saved && !syncError ? <span className="text-sm text-oxide">Saved for the practice.</span> : null}
          {syncError ? <span className="text-sm text-red-700">{syncError}</span> : null}
        </div>
      </form>
    </main>
  );
}
