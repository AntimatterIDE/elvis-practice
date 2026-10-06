import { redirect } from "next/navigation";
import { PortalLoginForm } from "@/components/portal/login-form";
import { readPortalCookie } from "@/lib/portal/cookie";
import { getPortalStore } from "@/lib/portal/repository";
import { BrandMark } from "@/components/site/brand";

export const dynamic = "force-dynamic";

export default async function PortalLoginPage() {
  const patientId = await getPortalStore().patientIdForToken(await readPortalCookie());
  if (patientId) redirect("/portal");

  return (
    <div className="mx-auto max-w-lg px-5 py-12 sm:py-16">
      <div className="rounded-3xl border border-line bg-card p-6 shadow-[0_18px_40px_-32px_rgb(7_30_54_/_0.55)] sm:p-8">
        <div className="flex items-center gap-4 mb-6">
          <BrandMark tone="ink" className="size-12" />
          <div>
            <p className="font-display text-lg font-semibold text-ink">Patient Login</p>
            <p className="text-sm text-muted">The Alignment Clinic</p>
          </div>
        </div>
        <PortalLoginForm />
        <p className="mt-6 text-center text-sm text-muted">
          <a href="/" className="text-oxide-deep underline hover:text-oxide-ink">
            Back to the public site
          </a>
        </p>
      </div>
      <p className="mt-8 max-w-sm text-center text-xs leading-relaxed text-muted">
        This portal is for established patients only. Contact the practice through the
        <a href="/contact" className="text-oxide-deep underline hover:text-oxide-ink">public contact form</a>
        for scheduling and other non-medical questions.
      </p>
    </div>
  );
}