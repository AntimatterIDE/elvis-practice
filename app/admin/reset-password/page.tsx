import Link from "next/link";
import { updateStaffPassword } from "@/app/admin/actions";
import { NewPasswordForm } from "@/components/admin/password-reset-form";
import { ClinicFrame } from "@/components/clinic/frame";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/env";

export default async function ResetPasswordPage() {
  let signedIn = false;
  if (isSupabaseConfigured()) {
    const supabase = await createSupabaseServerClient();
    const { data } = await supabase.auth.getUser();
    signedIn = Boolean(data.user);
  }

  return (
    <ClinicFrame kicker="Staff">
      <div className="mx-auto max-w-lg px-5 py-12 sm:py-16">
        <div className="rounded-3xl border border-line bg-card p-6 shadow-[0_18px_40px_-32px_rgb(7_30_54_/_0.55)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-royal">Practice desk</p>
          <h1 className="mt-3 font-display text-4xl tracking-tight">Choose a new password</h1>
          {signedIn ? (
            <>
              <p className="mt-3 text-base leading-relaxed text-muted">Use at least 8 characters. This replaces the old password.</p>
              <NewPasswordForm action={updateStaffPassword} />
            </>
          ) : (
            <>
              <p className="mt-3 text-base leading-relaxed text-muted">
                Open the reset link from your email, or request a new one. This page only works from that link.
              </p>
              <p className="mt-4 text-sm">
                <Link href="/admin/forgot" className="font-medium text-royal underline decoration-gold/30 underline-offset-4">
                  Request a reset link
                </Link>
              </p>
            </>
          )}
        </div>
      </div>
    </ClinicFrame>
  );
}
