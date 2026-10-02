"use client";

import { useState } from "react";
import { enrollTotp, verifyTotp } from "@/app/admin/actions";
import { MfaForm } from "@/components/admin/mfa-form";

function qrSvg(qr: string) {
  if (!qr.startsWith("data:image/svg+xml")) return "";
  const payload = qr.slice(qr.indexOf(",") + 1);
  const svg = payload.includes("<svg") ? payload : decodeURIComponent(payload);
  return svg.trimStart().startsWith("<svg") ? svg : "";
}

export function EnrollForm() {
  const [enrollment, setEnrollment] = useState<{ factorId: string; qr: string; secret: string } | null>(null);
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function start() {
    setPending(true);
    setError("");
    const result = await enrollTotp();
    setPending(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    setEnrollment(result);
  }

  if (!enrollment) {
    return (
      <div className="mt-6">
        <p className="text-base leading-relaxed text-muted">
          This desk needs an authenticator app the first time you sign in. Use the app you already use for other accounts, or Google Authenticator.
        </p>
        {error ? (
          <p role="alert" className="mt-4 rounded-xl border border-emergency/30 bg-red-50 px-3 py-2 text-sm text-emergency">
            {error}
          </p>
        ) : null}
        <button
          type="button"
          onClick={start}
          disabled={pending}
          className="mt-6 inline-flex items-center justify-center rounded-full bg-oxide px-5 py-3.5 text-sm font-semibold text-paper hover:bg-oxide-deep disabled:opacity-50"
        >
          {pending ? "Preparing…" : "Set up authenticator"}
        </button>
      </div>
    );
  }

  return (
    <div className="mt-6">
      <p className="text-base leading-relaxed text-muted">
        Scan this with your authenticator app, then enter the six-digit code.
      </p>
      <div
        className="mt-4 h-44 w-44 rounded-xl border border-line bg-white p-2 [&_svg]:h-full [&_svg]:w-full"
        role="img"
        aria-label="Authenticator QR code"
        dangerouslySetInnerHTML={{ __html: qrSvg(enrollment.qr) }}
      />
      <p className="mt-4 text-sm text-muted">
        If you cannot scan it, enter this key manually: <span className="font-mono text-ink">{enrollment.secret}</span>
      </p>
      <MfaForm action={verifyTotp} factorId={enrollment.factorId} />
    </div>
  );
}
