"use client";

import { useEffect, useState } from "react";
import { issuePortalLoginAction, portalAccountAction } from "@/app/portal/actions";
import { notePortalPatient, useRcm } from "@/components/admin/rcm/store";
import { Button } from "@/components/ui/button";
import { Field, fieldClass } from "@/components/admin/rcm/ui";
import type { Patient } from "@/lib/rcm/types";

export function PortalAccess({ patient }: { patient: Patient }) {
  const { patchPatient } = useRcm();
  const [email, setEmail] = useState(patient.email);
  const [hasLogin, setHasLogin] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  useEffect(() => {
    let cancel = false;
    void portalAccountAction(patient.id).then((result) => {
      if (cancel || !("email" in result)) return;
      setHasLogin(Boolean(result.email));
      if (result.email) setEmail(result.email);
    });
    return () => {
      cancel = true;
    };
  }, [patient.id]);

  async function createLogin() {
    setPending(true);
    setError("");
    const result = await issuePortalLoginAction({
      patientId: patient.id,
      email,
      chart: { ...patient, email: email.trim().toLowerCase() },
    });
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setPassword(result.password);
    setHasLogin(true);
    notePortalPatient(patient.id);
    patchPatient(patient.id, {
      email: result.email,
      portalStatus: patient.portalStatus === "active" ? "active" : "invited",
    });
  }

  const origin = typeof window === "undefined" ? "" : window.location.origin;
  const loginUrl = `${origin}/portal/login`;
  const text = `Portal: ${loginUrl}\nEmail: ${email}\nPassword: ${password}`;

  return (
    <section className="rounded-2xl border border-line bg-card p-5 lg:col-span-2">
      <h2 className="font-display text-2xl tracking-tight">Patient portal</h2>
      <p className="mt-2 text-sm text-muted">
        {hasLogin
          ? "This patient can sign in with the email below. Resetting the password replaces the old one."
          : "Create a login when you want this patient to see their profile and visits."}
      </p>
      <div className="mt-4 grid gap-3 sm:max-w-md">
        <Field label="Login email">
          <input className={fieldClass} type="email" value={email} onChange={(event) => setEmail(event.target.value)} required />
        </Field>
        <Button type="button" onClick={() => void createLogin()} disabled={pending}>
          {pending ? "Saving…" : hasLogin ? "Reset password" : "Create login"}
        </Button>
      </div>
      {error ? <p className="mt-3 text-sm text-emergency">{error}</p> : null}
      {password ? (
        <div className="mt-4 grid gap-2 border border-gold/30 bg-gold/10/40 p-3 text-sm">
          <p>Give the patient this password now. It is not stored for you to view again.</p>
          <p className="break-all">
            {loginUrl}
            <br />
            {email}
            <br />
            <span className="font-semibold">{password}</span>
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="underline" onClick={() => void navigator.clipboard.writeText(text)}>
              Copy login
            </button>
            <a className="underline" href={`mailto:${email}?subject=${encodeURIComponent("Your Alignment Clinic portal")}&body=${encodeURIComponent(text)}`}>
              Email login
            </a>
          </div>
        </div>
      ) : null}
    </section>
  );
}
