import type { Metadata } from "next";
import { SignForm } from "@/components/agreements/sign-form";
import { ClinicFrame } from "@/components/clinic/frame";
import { publicPacket } from "@/lib/agreements/store";
import { unlistedShareMetadata } from "@/lib/share-metadata";
import { practice } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  ...unlistedShareMetadata,
  title: "Sign a document",
};

export default async function SignPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const packet = await publicPacket(token);

  return (
    <ClinicFrame kicker="Document to sign">
      <div className="mx-auto min-w-0 max-w-3xl px-5 py-10 sm:py-14">
        {packet.status === "missing" ? (
          <Closed title="This link is not valid." body="Ask the practice to send the document again. The address may have been cut off when it was copied." />
        ) : null}
        {packet.status === "expired" ? (
          <Closed title="This link has expired." body={`${packet.title} was open for 14 days. Ask the practice to send a new link.`} />
        ) : null}
        {packet.status === "void" ? (
          <Closed title="This document was withdrawn." body={`${packet.title} is no longer waiting for a signature.`} />
        ) : null}
        {packet.status === "signed" ? <Signed packet={packet} /> : null}
        {packet.status === "open" ? (
          <>
            <p className="kicker text-oxide-deep">{practice.name}</p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl tracking-tight sm:text-5xl">{packet.title}</h1>
            {packet.recipientName ? <p className="mt-4 text-xl text-ink">Prepared for {packet.recipientName}.</p> : null}
            <article className="mt-6 whitespace-pre-wrap text-base leading-relaxed text-ink">{packet.body}</article>
            <SignForm token={packet.token} recipientName={packet.recipientName} />
          </>
        ) : null}
      </div>
    </ClinicFrame>
  );
}

function Signed({
  packet,
}: {
  packet: { title: string; body: string; signerName: string; signedAt: string; signaturePng: string };
}) {
  const when = new Date(packet.signedAt).toLocaleString("en-US", { dateStyle: "long", timeStyle: "short" });
  return (
    <>
      <p className="kicker text-oxide-deep">Signed</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{packet.title}</h1>
      <p className="mt-3 text-muted">Signed by {packet.signerName} on {when}.</p>
      <article className="mt-6 whitespace-pre-wrap text-base leading-relaxed">{packet.body}</article>
      {packet.signaturePng ? (
        // The signature is a data URL produced by this site's signing page.
        // eslint-disable-next-line @next/next/no-img-element
        <img src={packet.signaturePng} alt={`Signature of ${packet.signerName}`} className="mt-6 h-28 rounded-2xl border border-line bg-white" />
      ) : null}
    </>
  );
}

function Closed({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-xl rounded-3xl border border-line bg-card p-6 sm:p-8">
      <p className="kicker text-oxide-deep">{practice.name}</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{title}</h1>
      <p className="mt-3 text-base leading-relaxed text-muted">{body}</p>
    </div>
  );
}
