import { redirect } from "next/navigation";
import { PortalLoginForm } from "@/components/portal/login-form";
import { readPortalCookie } from "@/lib/portal/cookie";
import { getPortalStore } from "@/lib/portal/repository";

export const dynamic = "force-dynamic";

export default async function PortalLoginPage() {
  const patientId = await getPortalStore().patientIdForToken(await readPortalCookie());
  if (patientId) redirect("/portal");

  return (
    <div className="mx-auto max-w-lg px-5 py-12 sm:py-16">
      <div className="rounded-3xl border border-line bg-card p-6 shadow-[0_18px_40px_-32px_rgb(7_30_54_/_0.55)] sm:p-8">
        <p className="kicker text-oxide-deep">Patient login</p>
        <h1 className="mt-3 font-display text-4xl tracking-tight">Your chart and visits</h1>
        <p className="mt-3 text-base leading-relaxed text-muted">
          Use the email and password the practice sent you. This login shows only your record.
        </p>
        <PortalLoginForm />
      </div>
    </div>
  );
}
