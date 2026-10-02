import Link from "next/link";
import { redirect } from "next/navigation";
import { signIn } from "@/app/admin/actions";
import { LoginForm } from "@/components/admin/login-form";
import { ClinicFrame } from "@/components/clinic/frame";
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, isDemoAdminEnabled } from "@/lib/demo-admin";
import { isSupabaseConfigured } from "@/lib/env";
import { getStaffSession } from "@/lib/supabase/session";

export default async function LoginPage() {
  if (isDemoAdminEnabled()) {
    const staff = await getStaffSession();
    if (staff) redirect("/admin/operations");

    return (
      <ClinicFrame kicker="Staff">
        <main className="mx-auto max-w-lg px-5 py-12 sm:py-16">
          <div className="rounded-3xl border border-line bg-card p-6 shadow-[0_18px_40px_-32px_rgb(7_30_54_/_0.55)] sm:p-8">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-oxide">Practice desk</p>
            <h1 className="mt-3 font-display text-4xl tracking-tight">Staff sign-in</h1>
            <p className="mt-3 text-base leading-relaxed text-muted">
              This demo account works until Supabase is connected. Charts stay in this browser until a patient login is created.
            </p>
            <LoginForm action={signIn} defaultEmail={DEMO_ADMIN_EMAIL} defaultPassword={DEMO_ADMIN_PASSWORD} />
          </div>
        </main>
      </ClinicFrame>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <ClinicFrame kicker="Staff">
        <main className="mx-auto max-w-lg px-5 py-12 sm:py-16">
          <div className="rounded-3xl border border-line bg-card p-6 sm:p-8">
            <h1 className="font-display text-4xl tracking-tight">Supabase is not connected.</h1>
            <p className="mt-4 text-base leading-relaxed text-muted">
              Add the project URL and anon key to the server environment, run the migration, and invite the first owner. Public sign-up stays disabled. The public site continues to read reviewed files until then.
            </p>
          </div>
        </main>
      </ClinicFrame>
    );
  }

  const staff = await getStaffSession();
  if (staff) redirect("/admin");

  return (
    <ClinicFrame kicker="Staff">
      <main className="mx-auto max-w-lg px-5 py-12 sm:py-16">
        <div className="rounded-3xl border border-line bg-card p-6 shadow-[0_18px_40px_-32px_rgb(7_30_54_/_0.55)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-oxide">Practice desk</p>
          <h1 className="mt-3 font-display text-4xl tracking-tight">Staff sign-in</h1>
          <p className="mt-3 text-base leading-relaxed text-muted">
            Invitation only. There is no public registration.
          </p>
          <LoginForm action={signIn} />
          <p className="mt-4 text-sm">
            <Link href="/admin/forgot" className="font-medium text-oxide underline decoration-oxide/30 underline-offset-4">
              Forgot password
            </Link>
          </p>
        </div>
      </main>
    </ClinicFrame>
  );
}
