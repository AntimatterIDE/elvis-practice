import { redirect } from "next/navigation";
import { PortalLoginForm } from "@/components/portal/login-form";
import { readPortalCookie } from "@/lib/portal/cookie";
import { getPortalStore } from "@/lib/portal/repository";

export const dynamic = "force-dynamic";

export default async function PortalLoginPage() {
  const patientId = await getPortalStore().patientIdForToken(await readPortalCookie());
  if (patientId) redirect("/portal");

  return (
    <div className="min-h-screen bg-paper">
      {/* Brand header */}
      <div className="mx-auto max-w-lg px-5 py-12 sm:py-16">
        <div className="mb-8 text-center">
          <img
            src="/brand/alignment-mark.svg"
            alt="The Alignment Clinic"
            width={64}
            height={64}
            className="mx-auto"
          />
          <h1 className="mt-4 font-display text-3xl font-semibold leading-tight text-ink">
            Patient portal
          </h1>
          <p className="mt-2 text-base leading-relaxed text-muted">
            Sign in to view your visit summaries and care plan.
          </p>
        </div>

        {/* Login card */}
        <div className="rise-in rounded-2xl border border-line bg-card p-6 card-shadow md:p-8 motion-safe:transition-all motion-safe:duration-300">
          <PortalLoginForm />
        </div>

        {/* Help link */}
        <div className="mt-8 text-center">
          <a
            href="/contact"
            className="text-sm text-muted hover:text-oxide-deep hover:underline"
          >
            Need help signing in? Contact the office.
          </a>
        </div>
      </div>
    </div>
  );
}