"use client";

import { useState } from "react";
import { listEnrollments, searchPayers } from "@/app/admin/stedi/actions";
import { Button } from "@/components/ui/button";
import { Field, PageHeader, fieldClass, panelClass } from "@/components/admin/rcm/ui";

type PayerRow = {
  name: string;
  primaryPayerId: string;
  stediId: string;
  eligibility: string;
  claims: string;
  era: string;
  eft: string;
  cob: string;
};

type EnrollmentRow = { id: string; status: string; payer: string; npi: string; transactions: string };

export function PaymentsDesk() {
  const [query, setQuery] = useState("Aetna");
  const [message, setMessage] = useState("");
  const [payers, setPayers] = useState<PayerRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [pending, setPending] = useState(false);

  async function search() {
    setPending(true);
    const result = await searchPayers(query);
    setPayers(result.payers.filter((payer): payer is PayerRow => payer !== null));
    setMessage(result.message);
    setPending(false);
  }

  async function loadEnrollments() {
    setPending(true);
    const result = await listEnrollments();
    setEnrollments(result.enrollments);
    setMessage(result.message);
    setPending(false);
  }

  return (
    <main>
      <PageHeader
        kicker="Billing"
        title="Payments"
        lede="Payer search and enrollment status from Stedi. Treasury and Lockbox stay in the Stedi portal. This desk does not connect a bank or move a payment."
      />
      <div className="mt-8 grid gap-4 lg:grid-cols-2">
        <section className={panelClass}>
          <h2 className="font-display text-2xl">Treasury</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Stedi Treasury collects electronic funds transfer payments after a payer adjudicates a claim. Setup is a billing entity, a linked bank account, and an EFT enrollment for each payer. Stedi does not publish an API for listing those payments, and a test key cannot open a bank account.
          </p>
        </section>
        <section className={panelClass}>
          <h2 className="font-display text-2xl">Lockbox</h2>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            Lockbox is a private preview. Stedi receives paper checks and remits, deposits the checks through Treasury, and scans the mail. There is no API for that mail. Ask Stedi to enable the preview, then review check images in the Stedi portal.
          </p>
        </section>
      </div>
      <form
        className="mt-8 grid max-w-xl gap-4"
        onSubmit={(event) => {
          event.preventDefault();
          void search();
        }}
      >
        <Field label="Payer">
          <input className={fieldClass} value={query} onChange={(event) => setQuery(event.target.value)} />
        </Field>
        <div className="flex flex-wrap gap-2">
          <Button type="submit" disabled={pending}>Search payers</Button>
          <Button type="button" variant="secondary" disabled={pending} onClick={() => void loadEnrollments()}>
            List enrollments
          </Button>
        </div>
        {message ? <p className="text-sm text-muted">{message}</p> : null}
      </form>
      <ul className="mt-6 grid gap-3">
        {payers.map((payer) => (
          <li key={`${payer.stediId}-${payer.primaryPayerId}`} className={panelClass}>
            <p className="font-semibold">{payer.name}</p>
            <p className="mt-1 text-sm text-muted">Payer id {payer.primaryPayerId || "—"} · Stedi id {payer.stediId || "—"}</p>
            <p className="mt-2 text-sm">Eligibility {payer.eligibility} · Claims {payer.claims} · ERA {payer.era} · EFT {payer.eft} · Coordination {payer.cob}</p>
          </li>
        ))}
      </ul>
      <ul className="mt-6 grid gap-3">
        {enrollments.map((enrollment) => (
          <li key={enrollment.id || `${enrollment.payer}-${enrollment.npi}`} className={panelClass}>
            <p className="font-semibold">{enrollment.payer}</p>
            <p className="mt-1 text-sm text-muted">{enrollment.status} · NPI {enrollment.npi || "—"} · {enrollment.transactions}</p>
          </li>
        ))}
      </ul>
    </main>
  );
}
