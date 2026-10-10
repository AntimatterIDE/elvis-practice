"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  removePracticeAgreement,
  resendPracticeAgreement,
  savePracticeAgreement,
  sendPracticeAgreement,
  signedCopy,
  voidPracticeAgreement,
} from "@/app/admin/agreements/actions";
import type { Agreement, PacketDetail, PacketSummary } from "@/lib/agreements/store";
import { Button } from "@/components/ui/button";
import { Field, PageHeader, fieldClass, panelClass } from "@/components/admin/rcm/ui";

export function AgreementsDesk({ agreements, packets }: { agreements: Agreement[]; packets: PacketSummary[] }) {
  const router = useRouter();
  const [selectedId, setSelectedId] = useState(agreements[0]?.id ?? "");
  const selected = agreements.find((item) => item.id === selectedId) ?? null;
  const [title, setTitle] = useState(selected?.title ?? "");
  const [body, setBody] = useState(selected?.body ?? "");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [saveNote, setSaveNote] = useState("");
  const [sendNote, setSendNote] = useState("");
  const [pending, setPending] = useState(false);
  const [openCopy, setOpenCopy] = useState<PacketDetail | null>(null);
  const editorRef = useRef<HTMLFormElement>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const synced = useRef(selected ? `${selected.id}:${selected.updatedAt}` : "");

  useEffect(() => {
    if (!selected) return;
    const mark = `${selected.id}:${selected.updatedAt}`;
    if (synced.current === mark) return;
    synced.current = mark;
    setTitle(selected.title);
    setBody(selected.body);
  }, [selected]);

  function startNew() {
    synced.current = "";
    setSelectedId("");
    setTitle("");
    setBody("");
    setSaveNote("Write the title and the text, then save. Nothing is stored until you do.");
    requestAnimationFrame(() => {
      editorRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      titleRef.current?.focus();
    });
  }

  async function run(
    action: () => Promise<{ ok: boolean; message: string; id?: string }>,
    kind: "save" | "send",
  ) {
    setPending(true);
    const result = await action();
    if (kind === "save") setSaveNote(result.message);
    else setSendNote(result.message);
    if (result.ok && result.id) {
      synced.current = "";
      setSelectedId(result.id);
    }
    setPending(false);
    router.refresh();
  }

  return (
    <main className="grid gap-8">
      <PageHeader
        kicker="Practice"
        title="Agreements"
        lede="New York orthopedic offices usually collect a consent to treat, a privacy-notice acknowledgment, an assignment of benefits, permission to text and email, and a records release. These drafts are here for a lawyer to review before you rely on them. The privacy page on the website is not that notice. Leave symptoms, images, and insurance numbers out of the text."
      />
      <div className="grid gap-6 lg:grid-cols-[16rem_1fr]">
        <div className="grid content-start gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={startNew}
          >
            New agreement
          </Button>
          {agreements.map((item) => (
            <button
              key={item.id}
              type="button"
              className={`rounded-2xl border px-3 py-3 text-left text-sm ${item.id === selectedId ? "border-oxide bg-mint" : "border-line bg-card"}`}
              onClick={() => setSelectedId(item.id)}
            >
              {item.title}
            </button>
          ))}
          {agreements.length === 0 ? <p className="text-sm text-muted">No agreements yet.</p> : null}
        </div>
        <form
          ref={editorRef}
          className={panelClass}
          onSubmit={(event) => {
            event.preventDefault();
            void run(() => savePracticeAgreement({ id: selectedId || undefined, title, body }), "save");
          }}
        >
          <h2 className="font-display text-2xl">{selected ? "Edit agreement" : "New agreement"}</h2>
          <p className="mt-2 text-sm text-muted">
            {selected ? "Saving changes does not rewrite a copy that was already signed." : "This draft is not saved until you click Save."}
          </p>
          <Field label="Title" className="mt-4">
            <input ref={titleRef} className={fieldClass} value={title} onChange={(event) => setTitle(event.target.value)} />
          </Field>
          <Field label="Text" className="mt-4">
            <textarea className={`${fieldClass} min-h-64`} value={body} onChange={(event) => setBody(event.target.value)} />
          </Field>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button type="submit" disabled={pending}>Save</Button>
            {saveNote ? <p className="self-center text-sm text-muted">{saveNote}</p> : null}
            {selectedId ? (
              <Button
                type="button"
                variant="secondary"
                disabled={pending}
                onClick={() => void run(async () => {
                  const result = await removePracticeAgreement(selectedId);
                  if (result.ok) {
                    synced.current = "";
                    setSelectedId("");
                    setTitle("");
                    setBody("");
                  }
                  return result;
                }, "save")}
              >
                Delete
              </Button>
            ) : null}
          </div>
        </form>
      </div>
      <form
        className={panelClass}
        onSubmit={(event) => {
          event.preventDefault();
          void run(() => sendPracticeAgreement({ agreementId: selectedId, name, email }), "send");
        }}
      >
        <h2 className="font-display text-2xl">Send for signature</h2>
        <p className="mt-2 text-sm text-muted">The email comes from hello@thealignmentclinic.com and the link opens on this site. Save the agreement first.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Field label="Name">
            <input className={fieldClass} value={name} onChange={(event) => setName(event.target.value)} />
          </Field>
          <Field label="Email">
            <input className={fieldClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} />
          </Field>
        </div>
        <Button className="mt-4" type="submit" disabled={pending || !selectedId}>Send</Button>
        {sendNote ? <p className="mt-3 text-sm text-muted">{sendNote}</p> : null}
      </form>
      <section>
        <h2 className="font-display text-2xl">Sent copies</h2>
        <ul className="mt-4 divide-y divide-line border-y border-line">
          {packets.length === 0 ? <li className="py-3 text-sm text-muted">Nothing has been sent.</li> : null}
          {packets.map((packet) => (
            <li key={packet.id} className="grid gap-3 py-4 sm:grid-cols-[1fr_auto] sm:items-center">
              <div>
                <p className="font-semibold">{packet.title}</p>
                <p className="text-sm text-muted">
                  {packet.recipientName} · {packet.recipientEmail} · {label(packet.status)}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="secondary" disabled={pending} onClick={() => void signedCopy(packet.id).then((result) => result.ok && setOpenCopy(result.packet))}>
                  Open
                </Button>
                {packet.status === "sent" || packet.status === "expired" ? (
                  <Button type="button" variant="secondary" disabled={pending} onClick={() => void run(() => resendPracticeAgreement(packet.id), "send")}>
                    Send again
                  </Button>
                ) : null}
                {packet.status === "sent" || packet.status === "expired" ? (
                  <Button type="button" variant="ghost" disabled={pending} onClick={() => void run(() => voidPracticeAgreement(packet.id), "send")}>
                    Withdraw
                  </Button>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </section>
      {openCopy ? (
        <article className={panelClass}>
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="font-display text-2xl">{openCopy.title}</h2>
              <p className="mt-1 text-sm text-muted">
                {openCopy.signerName ? `Signed by ${openCopy.signerName}` : openCopy.recipientName} · {label(openCopy.status)}
              </p>
            </div>
            <Button type="button" variant="ghost" onClick={() => setOpenCopy(null)}>Close</Button>
          </div>
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed">{openCopy.body}</p>
          {openCopy.signaturePng ? (
            // Stored signature from this practice's signing page.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={openCopy.signaturePng} alt={`Signature of ${openCopy.signerName}`} className="mt-4 h-28 rounded-2xl border border-line bg-white" />
          ) : null}
        </article>
      ) : null}
    </main>
  );
}

function label(status: PacketSummary["status"]) {
  if (status === "sent") return "Waiting for a signature";
  if (status === "signed") return "Signed";
  if (status === "expired") return "Link expired";
  return "Withdrawn";
}
