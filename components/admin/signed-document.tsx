"use client";

import { formatWhen } from "@/lib/rcm/format";
import { Button } from "@/components/ui/button";

export function SignedDocument({
  packet,
  onClose,
}: {
  packet: {
    title: string;
    body: string;
    signerName: string;
    recipientName: string;
    recipientEmail: string;
    signedAt: string;
    signaturePng: string;
  };
  onClose?: () => void;
}) {
  const when = packet.signedAt ? formatWhen(packet.signedAt) : "";
  return (
    <article className="rounded-2xl border border-line bg-paper p-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="font-display text-2xl">{packet.title}</h3>
          <p className="mt-1 text-sm text-muted">
            {packet.signerName ? `Signed by ${packet.signerName}` : packet.recipientName}
            {when ? ` · ${when}` : ""}
            {packet.recipientEmail ? ` · ${packet.recipientEmail}` : ""}
          </p>
        </div>
        {onClose ? (
          <Button type="button" variant="ghost" onClick={onClose}>
            Close
          </Button>
        ) : null}
      </div>
      <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{packet.body}</p>
      {packet.signaturePng ? (
        // Stored signature from this practice's signing page.
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={packet.signaturePng}
          alt={`Signature of ${packet.signerName || packet.recipientName}`}
          className="mt-4 h-28 rounded-2xl border border-line bg-white"
        />
      ) : (
        <p className="mt-4 text-sm text-muted">The signature image was not stored with this copy.</p>
      )}
    </article>
  );
}
