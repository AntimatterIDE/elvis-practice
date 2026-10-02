import { redirect } from "next/navigation";
import { verifyTotp } from "@/app/admin/actions";
import { EnrollForm } from "@/components/admin/enroll-form";
import { MfaForm } from "@/components/admin/mfa-form";
import { ClinicFrame } from "@/components/clinic/frame";
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
    <ClinicFrame kicker="Staff">
      <main className="mx-auto max-w-lg px-5 py-12 sm:py-16">
        <div className="rounded-3xl border border-line bg-card p-6 shadow-[0_18px_40px_-32px_rgb(7_30_54_/_0.55)] sm:p-8">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-oxide">Practice desk</p>
          <h1 className="mt-3 font-display text-4xl tracking-tight">Authenticator</h1>
          {verified ? <MfaForm action={verifyTotp} factorId={verified.id} /> : <EnrollForm />}
        </div>
      </main>
    </ClinicFrame>
  );
}
