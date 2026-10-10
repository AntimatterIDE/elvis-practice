"use client";

import { useState } from "react";
import { submitSignature } from "@/app/sign/actions";
import { SignaturePad } from "@/components/agreements/signature-pad";
import { Button } from "@/components/ui/button";
import { fieldClass } from "@/components/admin/rcm/ui";

export function SignForm({ token, recipientName }: { token: string; recipientName: string }) {
  const [name, setName] = useState(recipientName);
  const [png, setPng] = useState("");
  const [inked, setInked] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [message, setMessage] = useState("");
  const [done, setDone] = useState(false);
  const [pending, setPending] = useState(false);

  if (done) {
    return (
      <p className="mt-8 rounded-2xl border border-line bg-card p-5 text-lg">Signed. The practice has this copy.</p>
    );
  }

  return (
    <form
      className="mt-8 grid gap-5"
      onSubmit={(event) => {
        event.preventDefault();
        setPending(true);
        void submitSignature({ token, signerName: name, signaturePng: inked ? png : "", agreed }).then((result) => {
          setMessage(result.message);
          setDone(result.ok);
          setPending(false);
        });
      }}
    >
      <label className="grid gap-2 text-sm">
        <span className="font-medium">Name you are signing with</span>
        <input className={fieldClass} value={name} autoComplete="name" onChange={(event) => setName(event.target.value)} />
      </label>
      <div>
        <p className="text-sm font-medium">Signature</p>
        <p className="mt-1 text-sm text-muted">Draw it, or place your typed name on the line.</p>
        <div className="mt-2">
          <SignaturePad
            name={name}
            onChange={(next, hasInk) => {
              setPng(next);
              setInked(hasInk);
            }}
          />
        </div>
      </div>
      <label className="flex items-start gap-3 text-sm leading-relaxed">
        <input
          type="checkbox"
          className="mt-1 size-4"
          checked={agreed}
          onChange={(event) => setAgreed(event.target.checked)}
        />
        <span>I have read this document and I intend my signature to apply to it.</span>
      </label>
      <Button type="submit" disabled={pending}>
        {pending ? "Saving" : "Sign"}
      </Button>
      {message ? <p className="text-sm text-muted">{message}</p> : null}
    </form>
  );
}
