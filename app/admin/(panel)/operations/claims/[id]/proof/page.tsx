"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { fetchClaimSubmissionProof } from "@/app/admin/stedi/actions";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/site/brand";
import { claimTotal, formatDay, formatWhen, money, patientName } from "@/lib/rcm/format";
import { practice as sitePractice } from "@/lib/site";
import type { SubmissionProofReport } from "@/lib/stedi/submission-proof";
import { LoadingDesk } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

export default function ClaimSubmissionProofPage() {
  const params = useParams<{ id: string }>();
  const id = typeof params.id === "string" ? params.id : "";
  const { ready, claims, patients, practice, updateClaim } = useRcm();
  const claim = claims.find((item) => item.id === id);
  const patient = patients.find((item) => item.id === claim?.patientId);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState("");
  const [report, setReport] = useState<SubmissionProofReport | null>(null);
  const [generatedAt] = useState(() => new Date().toISOString());

  useEffect(() => {
    if (!ready || !claim) return;
    let cancelled = false;
    (async () => {
      setPending(true);
      const result = await fetchClaimSubmissionProof({
        controlNumber: claim.controlNumber,
        stediClaimId: claim.stediClaimId,
      });
      if (cancelled) return;
      setMessage(result.message);
      setReport(result.report);
      if (result.stediClaimId && result.stediClaimId !== claim.stediClaimId) {
        updateClaim(claim.id, { stediClaimId: result.stediClaimId });
      }
      setPending(false);
    })();
    return () => {
      cancelled = true;
    };
    // Fetch once when the claim is ready; refresh is manual.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ready, claim?.id]);

  async function refresh() {
    if (!claim) return;
    setPending(true);
    const result = await fetchClaimSubmissionProof({
      controlNumber: claim.controlNumber,
      stediClaimId: claim.stediClaimId,
    });
    setMessage(result.message);
    setReport(result.report);
    if (result.stediClaimId && result.stediClaimId !== claim.stediClaimId) {
      updateClaim(claim.id, { stediClaimId: result.stediClaimId });
    }
    setPending(false);
  }

  if (!ready) return <LoadingDesk />;
  if (!claim || !patient) return <p>Claim not found.</p>;

  const payerAcks =
    report?.events.filter(
      (event) => event.kind === "acknowledgment" && (event.reportedBy === "PAYER" || Boolean(event.sourceName)),
    ).length ?? 0;
  const stediAcks =
    report?.events.filter((event) => event.kind === "acknowledgment" && event.reportedBy === "STEDI").length ?? 0;
  const address = practice.address?.trim() || sitePractice.addressLine;
  const phone = practice.phone?.trim() || sitePractice.phone;
  const npi = practice.npi?.trim() || sitePractice.npi;
  const legalName = practice.legalName?.trim() || sitePractice.name;
  const control = report?.patientControlNumber || claim.controlNumber;
  const stediId = report?.stediClaimId || claim.stediClaimId || "";

  return (
    <main className="mx-auto max-w-[7.5in] text-ink">
      <article className="rounded-none border border-line bg-white px-6 py-8 shadow-none sm:px-10 print:border-0 print:px-0 print:py-0">
        <header className="flex flex-wrap items-start justify-between gap-6 border-b-2 border-oxide pb-5">
          <div>
            <BrandLogo className="h-12 w-auto max-w-[15rem]" />
            <p className="mt-3 text-[0.7rem] font-semibold uppercase tracking-[0.18em] text-clinic-blue">
              Clearinghouse submission proof
            </p>
          </div>
          <div className="max-w-xs text-right text-[0.75rem] leading-relaxed text-muted">
            <p className="font-semibold text-clinic-blue">{legalName}</p>
            <p>{address}</p>
            <p>
              {phone}
              {npi ? ` · NPI ${npi}` : ""}
            </p>
            <p className="mt-1">{sitePractice.email}</p>
          </div>
        </header>

        <div className="mt-6">
          <h1 className="font-display text-3xl text-clinic-blue sm:text-4xl">Claim transmission acknowledgment</h1>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-muted">
            Prepared for the payer named below. The timeline is reprinted from Stedi&apos;s Claim Timeline API and
            includes X12 277CA claim acknowledgments from the clearinghouse and, when available, the payer. Clinic
            letterhead identifies the submitting practice; it does not alter Stedi&apos;s recorded events.
          </p>
        </div>

        <section className="mt-6 rounded-xl bg-mist px-4 py-4 text-sm sm:px-5">
          <dl className="grid gap-3 sm:grid-cols-2">
            <div>
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-oxide-deep">To payer</dt>
              <dd className="mt-0.5 font-semibold">{claim.payerName}</dd>
            </div>
            <div>
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-oxide-deep">Patient</dt>
              <dd className="mt-0.5 font-semibold">{patientName(patient)}</dd>
            </div>
            <div>
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-oxide-deep">Date of service</dt>
              <dd className="mt-0.5">{formatDay(claim.dateOfService)}</dd>
            </div>
            <div>
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-oxide-deep">Billed amount</dt>
              <dd className="mt-0.5">{money(claimTotal(claim))}</dd>
            </div>
            <div>
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-oxide-deep">
                Patient control number
              </dt>
              <dd className="mt-0.5 font-mono text-[0.85rem]">{control}</dd>
            </div>
            <div>
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-oxide-deep">Stedi claim id</dt>
              <dd className="mt-0.5 break-all font-mono text-[0.8rem]">{stediId || "Pending resolution"}</dd>
            </div>
            <div>
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-oxide-deep">
                Stedi claim status
              </dt>
              <dd className="mt-0.5">{report?.status || "—"}</dd>
            </div>
            <div>
              <dt className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-oxide-deep">
                Retrieved from Stedi
              </dt>
              <dd className="mt-0.5">
                {report?.fetchedAt ? formatWhen(report.fetchedAt) : pending ? "Fetching…" : "—"}
              </dd>
            </div>
          </dl>
        </section>

        <section className="mt-8">
          <div className="flex flex-wrap items-end justify-between gap-3 border-b border-line pb-2">
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em] text-oxide-deep">
              277CA / claim timeline
            </h2>
            <p className="text-xs text-muted">
              {payerAcks
                ? `${payerAcks} payer-reported acknowledgment${payerAcks === 1 ? "" : "s"}`
                : stediAcks
                  ? "Clearinghouse acknowledgment on file; payer 277CA may still be in transit"
                  : "Awaiting acknowledgments"}
            </p>
          </div>

          {pending && !report ? <p className="mt-4 text-sm text-muted">Fetching Stedi Claim Timeline…</p> : null}

          {report?.events.length ? (
            <ol className="mt-4 grid gap-3">
              {report.events.map((event, index) => {
                const kindLabel =
                  event.kind === "acknowledgment"
                    ? event.reportedBy === "PAYER"
                      ? "Payer 277CA"
                      : event.reportedBy === "CLEARINGHOUSE" || event.reportedBy === "STEDI"
                        ? "Clearinghouse 277CA"
                        : "277CA acknowledgment"
                    : event.kind === "submission"
                      ? "Claim submission"
                      : event.kind === "payment"
                        ? "Payment / ERA"
                        : "Timeline entry";
                const headline =
                  event.kind === "acknowledgment"
                    ? event.status
                      ? `Status: ${event.status}`
                      : "Claim acknowledgment received"
                    : event.kind === "submission"
                      ? "Professional claim submitted to Stedi"
                      : event.title;
                return (
                  <li key={`${event.kind}-${event.at}-${index}`} className="rounded-xl border border-line bg-card px-4 py-3 text-sm">
                    <p className="text-[0.7rem] font-semibold uppercase tracking-[0.12em] text-oxide-deep">
                      {formatWhen(event.at)} · {kindLabel}
                    </p>
                    <p className="mt-1 font-semibold text-ink">{headline}</p>
                    {event.sourceName ? <p className="mt-1 text-muted">From: {event.sourceName}</p> : null}
                    {event.detail ? <p className="mt-1 text-muted">{event.detail}</p> : null}
                  </li>
                );
              })}
            </ol>
          ) : !pending ? (
            <p className="mt-4 text-sm text-muted">No timeline entries returned for this claim yet.</p>
          ) : null}
        </section>

        {message ? <p className="mt-5 text-xs text-muted print:hidden">{message}</p> : null}

        <section className="mt-8 border border-line bg-white px-4 py-4 text-sm leading-relaxed sm:px-5">
          <p className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-oxide-deep">Certification</p>
          <p className="mt-2">
            {legalName} certifies that the claim identified by patient control number{" "}
            <span className="font-mono">{control}</span>
            {stediId ? (
              <>
                {" "}
                (Stedi claim id <span className="font-mono">{stediId}</span>)
              </>
            ) : null}{" "}
            was submitted electronically through Stedi, our healthcare clearinghouse. The events above are a verbatim
            reprint of Stedi Claim Timeline records, including X12 277CA claim acknowledgments. A payer-reported 277CA
            is evidence the payer (or its intermediary) returned an acknowledgment for this claim. Clearinghouse
            acceptance alone proves submission into the clearinghouse network and is not the same as payment.
          </p>
          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div>
              <p className="text-xs text-muted">Submitting practice</p>
              <p className="mt-1 font-semibold">{legalName}</p>
              <p className="text-muted">{practice.physicianName || sitePractice.physicianName}</p>
              {npi ? <p className="text-muted">NPI {npi}</p> : null}
            </div>
            <div>
              <p className="text-xs text-muted">Document generated</p>
              <p className="mt-1">{formatWhen(generatedAt)}</p>
              <p className="text-muted">Source: Stedi Claims Lifecycle · Claim Timeline</p>
            </div>
          </div>
        </section>

        <footer className="mt-8 border-t border-line pt-3 text-[0.7rem] leading-relaxed text-muted">
          <p>
            Document for payer correspondence · {legalName} · {address} · {phone}
            {npi ? ` · NPI ${npi}` : ""}
          </p>
        </footer>
      </article>

      <div className="mt-6 flex flex-wrap gap-3 print:hidden">
        <Button type="button" disabled={pending || !report} onClick={() => window.print()}>
          Print / save PDF
        </Button>
        <Button type="button" variant="secondary" disabled={pending} onClick={() => void refresh()}>
          Refresh from Stedi
        </Button>
        <Link href={`/admin/operations/claims/${claim.id}`} className="self-center text-sm underline">
          Back to claim
        </Link>
      </div>
    </main>
  );
}
