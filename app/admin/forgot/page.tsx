import Link from "next/link";
import { requestStaffPasswordReset } from "@/app/admin/actions";
import { ForgotPasswordForm } from "@/components/admin/password-reset-form";
import { ClinicFrame } from "@/components/clinic/frame";

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;
  const expired = params.error === "expired";

  return (
    <ClinicFrame kicker="Staff">
      <div className="mx-auto max-w-lg px-5 py-12 sm:py-16">
        <div className="rounded-3xl border border-line bg-card p-6 shadow-[0_18px_40px_-32px_rgb(7_30_54_/_0.55)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-royal">Practice desk</p>
          <h1 className="mt-3 font-display text-4xl tracking-tight">Reset your password</h1>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Enter the email on the staff account. The demo password no longer works.
          </p>
          {expired ? (
            <p role="alert" className="mt-4 rounded-xl border border-emergency/30 bg-red-50 px-3 py-2 text-sm text-emergency">
              That reset link has already been used or has expired. A link works once, and some email apps open it before you do. Request a new one.
            </p>
          ) : null}
          <ForgotPasswordForm action={requestStaffPasswordReset} />
          <p className="mt-4 text-sm">
            <Link href="/admin/login" className="font-medium text-royal underline decoration-gold/30 underline-offset-4">
              Back to sign-in
            </Link>
          </p>
        </div>
      </div>
    </ClinicFrame>
  );
}
