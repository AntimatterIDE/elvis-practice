import { redirect } from "next/navigation";
import { PortalLoginForm } from "@/components/portal/login-form";
import { readPortalCookie } from "@/lib/portal/cookie";
import { getPortalStore } from "@/lib/portal/repository";

export const dynamic = "force-dynamic";

export default async function PortalLoginPage() {
  const patientId = await getPortalStore().patientIdForToken(await readPortalCookie());
  if (patientId) redirect("/portal");

  return (
    <main className="mx-auto max-w-lg px-5 py-16">
      <p className="text-xs uppercase tracking-[0.18em] text-oxide">Patient portal</p>
      <h1 className="mt-4 font-display text-5xl">Sign in</h1>
      <p className="mt-4 text-muted">Use the email and password the practice sent you. This login shows only your record.</p>
      <PortalLoginForm />
    </main>
  );
}
