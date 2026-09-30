import { redirect } from "next/navigation";
import { verifyTotp } from "@/app/admin/actions";
import { MfaForm } from "@/components/admin/mfa-form";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { getStaffSession } from "@/lib/supabase/session";

export default async function MfaPage() {
  const staff = await getStaffSession();
  if (!staff) redirect("/admin/login");
  if (staff.aal === "aal2") redirect("/admin");

  const supabase = await createSupabaseServerClient();
  const factors = await supabase.auth.mfa.listFactors();
  const verified = factors.data?.totp.find((factor) => factor.status === "verified");

  return (
    <main className="mx-auto max-w-lg px-5 py-20">
      <p className="text-xs uppercase tracking-[0.18em] text-oxide">Admin</p>
      <h1 className="mt-4 font-display text-5xl">Authenticator</h1>
      {verified ? (
        <MfaForm action={verifyTotp} factorId={verified.id} />
      ) : (
        <p className="mt-6 text-lg text-muted">
          No authenticator is enrolled. In production, an owner must enroll TOTP before the dashboard
          opens. Use the enrollment action from a signed-in development session, then verify the code.
        </p>
      )}
    </main>
  );
}
