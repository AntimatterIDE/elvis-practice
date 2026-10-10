"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { agreementsForChart, sendPracticeAgreement } from "@/app/admin/agreements/actions";
import type { PacketSummary } from "@/lib/agreements/store";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/admin/rcm/ui";

export function SendAgreement({ patientId, name, email }: { patientId: string; name: string; email: string }) {
  const [choices, setChoices] = useState<{ id: string; title: string }[]>([]);
  const [packets, setPackets] = useState<PacketSummary[]>([]);
  const [agreementId, setAgreementId] = useState("");
  const [address, setAddress] = useState(email);
  const [message, setMessage] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    void agreementsForChart(patientId).then((result) => {
      if (!result.ok) {
        setMessage(result.message);
        return;
      }
      setChoices(result.agreements);
      setPackets(result.packets);
      setAgreementId(result.agreements[0]?.id ?? "");
    });
  }, [patientId]);

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
            if (result.ok) {
              void agreementsForChart(patientId).then((next) => {
                if (next.ok) setPackets(next.packets);
              });
            }
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
      {packets.length > 0 ? (
        <ul className="mt-4 divide-y divide-line border-t border-line text-sm">
          {packets.map((packet) => (
            <li key={packet.id} className="flex items-center justify-between gap-3 py-2">
              <span>{packet.title}</span>
              <span className="text-muted">{packet.status === "signed" ? "Signed" : packet.status === "expired" ? "Expired" : packet.status === "void" ? "Withdrawn" : "Waiting"}</span>
            </li>
          ))}
        </ul>
      ) : null}
      {message ? <p className="mt-3 text-sm text-muted">{message}</p> : null}
    </section>
  );
}
