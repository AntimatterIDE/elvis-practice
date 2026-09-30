import { redirect } from "next/navigation";
import { signIn } from "@/app/admin/actions";
import { LoginForm } from "@/components/admin/login-form";
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, isDemoAdminEnabled } from "@/lib/demo-admin";
import { isSupabaseConfigured } from "@/lib/env";
import { getStaffSession } from "@/lib/supabase/session";

export default async function LoginPage() {
  if (isDemoAdminEnabled()) {
    const staff = await getStaffSession();
    if (staff) redirect("/admin/operations");

    return (
      <main className="mx-auto max-w-lg px-5 py-20">
        <p className="text-xs uppercase tracking-[0.18em] text-oxide">Admin</p>
        <h1 className="mt-4 font-display text-5xl">Demo sign-in</h1>
        <p className="mt-4 text-muted">
          This account works until Supabase is connected. Practice records stay in this browser.
        </p>
        <LoginForm action={signIn} defaultEmail={DEMO_ADMIN_EMAIL} defaultPassword={DEMO_ADMIN_PASSWORD} />
      </main>
    );
  }

  if (!isSupabaseConfigured()) {
    return (
      <main className="mx-auto max-w-lg px-5 py-20">
        <p className="text-xs uppercase tracking-[0.18em] text-oxide">Admin</p>
        <h1 className="mt-4 font-display text-5xl">Supabase is not connected.</h1>
        <p className="mt-6 text-lg text-muted">
          Add the project URL and anon key to the server environment, run the migration, and invite
          the first owner. Public sign-up stays disabled. The public site continues to read reviewed
          files until then.
        </p>
      </main>
    );
  }

  const staff = await getStaffSession();
  if (staff) redirect("/admin");

  return (
    <main className="mx-auto max-w-lg px-5 py-20">
      <p className="text-xs uppercase tracking-[0.18em] text-oxide">Admin</p>
      <h1 className="mt-4 font-display text-5xl">Sign in</h1>
      <p className="mt-4 text-muted">
        Invitation only. There is no public registration. Production accounts for owners and admins
        must use an authenticator app.
      </p>
      <LoginForm action={signIn} />
    </main>
  );
}
