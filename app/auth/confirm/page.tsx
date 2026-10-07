import Link from "next/link";
import { ContinueForm } from "@/app/auth/confirm/continue-form";
import { ClinicFrame } from "@/components/clinic/frame";

export default async function ConfirmRecoveryPage({
  searchParams,
}: {
  searchParams: Promise<{ token_hash?: string; type?: string; code?: string; error?: string; error_code?: string; next?: string }>;
}) {
  const params = await searchParams;
  const otpType = params.type === "recovery" || params.type === "invite" || params.type === "signup" ? params.type : "";
  const tokenHash = otpType ? params.token_hash ?? "" : "";
  const code = params.code ?? "";
  const spent = Boolean(params.error || params.error_code);

  return (
    <ClinicFrame kicker="Staff">
      <div className="mx-auto max-w-lg px-5 py-12 sm:py-16">
        <div className="rounded-3xl border border-line bg-card p-6 shadow-[0_18px_40px_-32px_rgb(7_30_54_/_0.55)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-royal">Practice desk</p>
          <h1 className="mt-3 font-display text-4xl tracking-tight">Reset your password</h1>
          {spent || (!tokenHash && !code) ? (
            <>
              <p className="mt-3 text-base leading-relaxed text-muted">
                This reset link has already been used or has expired. A link works once, and some email apps open it before you do.
              </p>
              <p className="mt-4 text-sm">
                <Link href="/admin/forgot" className="font-medium text-royal underline decoration-gold/30 underline-offset-4">
                  Request a new link
                </Link>
              </p>
            </>
          ) : (
            <>
              <p className="mt-3 text-base leading-relaxed text-muted">
                Continue to choose a new password. This link works once, and only after you press the button.
              </p>
              <ContinueForm tokenHash={tokenHash} code={code} otpType={otpType} />
            </>
          )}
        </div>
      </div>
    </ClinicFrame>
  );
}
