"use client";

import { Button } from "@/components/ui/button";

export type SubmissionProofOffer = {
  fileName: string;
  url: string;
  patientId: string;
  message: string;
};

export function SubmissionProofDialog({
  offer,
  onClose,
}: {
  offer: SubmissionProofOffer;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/40 p-4" role="presentation">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="submission-proof-title"
        className="grid w-full max-w-lg gap-4 rounded-2xl border border-line bg-card p-5 shadow-[0_24px_48px_-28px_rgb(7_30_54_/_0.6)]"
      >
        <div>
          <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-oxide">Claim submitted</p>
          <h2 id="submission-proof-title" className="mt-2 font-display text-3xl">
            Download submission proof
          </h2>
        </div>
        <p className="text-sm leading-relaxed text-muted">
          An official Stedi 277CA proof PDF was created for this claim. Download it now for the payer, or skip — it is
          already saved under this patient&apos;s <span className="font-medium text-ink">Files</span> tab (Claim
          submission proofs) and on the claim&apos;s Note and papers.
        </p>
        {offer.message ? <p className="text-sm text-muted">{offer.message}</p> : null}
        <div className="flex flex-wrap gap-2">
          {offer.url ? (
            <Button asChild>
              <a href={offer.url} download={offer.fileName} target="_blank" rel="noreferrer">
                Download proof PDF
              </a>
            </Button>
          ) : null}
          <Button type="button" variant="secondary" onClick={onClose}>
            Close
          </Button>
        </div>
        <p className="text-xs text-muted">
          File name: {offer.fileName}. You can reopen it anytime from the patient chart.
        </p>
      </div>
    </div>
  );
}
