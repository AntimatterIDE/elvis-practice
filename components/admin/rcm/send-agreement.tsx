"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { agreementsForChart, sendPracticeAgreement } from "@/app/admin/agreements/actions";
import type { PacketDetail, PacketSummary } from "@/lib/agreements/store";
import { SignedDocument } from "@/components/admin/signed-document";
import { Button } from "@/components/ui/button";
import { formatWhen } from "@/lib/rcm/format";
import { fieldClass } from "@/components/admin/rcm/ui";

export function SendAgreement({ patientId, name, email }: { patientId: string; name: string; email: string }) {
  const [choices, setChoices] = useState<{ id: string; title: string }[]>([]);
  const [packets, setPackets] = useState<PacketSummary[]>([]);
  const [copies, setCopies] = useState<PacketDetail[]>([]);
  const [agreementId, setAgreementId] = useState("");
  const [address, setAddress] = useState(email);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  function load() {
    void agreementsForChart(patientId, email, name).then((result) => {
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setChoices(result.agreements);
      setPackets(result.packets);
      setCopies(result.copies);
      setAgreementId((current) => current || result.agreements[0]?.id || "");
    });
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [patientId, email, name]);

  return (
    <section className="rounded-2xl border border-line bg-card p-4">
      <p className="text-[0.65rem] font-semibold uppercase tracking-[0.16em] text-muted">Sign on this site</p>
      <p className="mt-1 text-sm text-muted">
        Send a saved agreement to this chart. The person signs at a link from hello@thealignmentclinic.com, and the signed copy stays in the practice database.{" "}
        <Link href="/admin/operations/agreements" className="underline">Write an agreement</Link>
      </p>
      <form
        className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
        onSubmit={(event) => {
          event.preventDefault();
          setPending(true);
          void sendPracticeAgreement({ agreementId, patientId, name, email: address }).then((result) => {
            setMessage(result.message);
            setPending(false);
            if (result.ok) load();
          });
        }}
      >
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Agreement</span>
          <select className={fieldClass} value={agreementId} onChange={(event) => setAgreementId(event.target.value)}>
            {choices.length === 0 ? <option value="">No agreements yet</option> : null}
            {choices.map((item) => (
              <option key={item.id} value={item.id}>{item.title}</option>
            ))}
          </select>
        </label>
        <label className="grid gap-2 text-sm">
          <span className="font-medium">Email</span>
          <input className={fieldClass} type="email" value={address} onChange={(event) => setAddress(event.target.value)} />
        </label>
        <Button type="submit" disabled={pending || !agreementId}>Send</Button>
      </form>
      <div className="mt-4">
        <h2 className="font-display text-xl">Agreements on this chart</h2>
        <ul className="mt-2 divide-y divide-line border-y border-line text-sm">
          {packets.length === 0 ? <li className="py-3 text-muted">Nothing has been sent for this chart.</li> : null}
          {packets.map((packet) => (
            <li key={packet.id} className="py-3">
              <span className="font-medium">{packet.title}</span>
              <span className="mt-0.5 block text-muted">
                {statusLabel(packet)}
                {packet.signerName ? ` · ${packet.signerName}` : ""}
                {packet.recipientEmail ? ` · ${packet.recipientEmail}` : ""}
              </span>
              {packet.linkedBy === "name" ? (
                <span className="mt-1 block text-muted">Added here because the name matches the person it was sent to.</span>
              ) : null}
            </li>
          ))}
        </ul>
      </div>
      {copies.map((packet) => (
        <div key={packet.id} className="mt-4">
          <SignedDocument packet={packet} />
        </div>
      ))}
      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
    </section>
  );
}

function statusLabel(packet: PacketSummary) {
  if (packet.status === "signed") return packet.signedAt ? `Signed ${formatWhen(packet.signedAt)}` : "Signed";
  if (packet.status === "expired") return "Link expired";
  if (packet.status === "void") return "Withdrawn";
  return "Waiting for a signature";
}
