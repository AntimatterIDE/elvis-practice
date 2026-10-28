import Link from "next/link";
import { redirect } from "next/navigation";
import { ProfileRequest } from "@/components/portal/profile-request";
import { RecordCard } from "@/components/portal/record";
import { readPortalCookie } from "@/lib/portal/cookie";
import { getPortalStore } from "@/lib/portal/repository";

export const dynamic = "force-dynamic";

export default async function PortalProfilePage() {
  const store = getPortalStore();
  const patientId = await store.patientIdForToken(await readPortalCookie());
  if (!patientId) redirect("/portal/login");
  const home = await store.home(patientId);
  if (!home) redirect("/portal/login");
  const intakeOpen = home.documents.some((document) => document.name === "New patient intake" && document.status === "missing");

  return (
    <div className="mx-auto grid max-w-3xl gap-5 px-5 py-8">
      <div>
        <p className="kicker text-oxide-deep">Profile</p>
        <h1 className="mt-2 font-display text-4xl font-medium leading-tight">
          {home.preferredName || home.firstName} {home.lastName}
        </h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          This is the chart the practice keeps. Ask them to change a phone number, pharmacy, or address.
        </p>
      </div>
      <RecordCard home={home} />
      <section className="rounded-3xl border border-line bg-card p-6">
        <h2 className="font-display text-2xl font-medium leading-tight">Your information</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">
          {intakeOpen
            ? "The practice is still waiting on your new-patient form."
            : "Send an update if something on the form has changed."}
        </p>
        <Link
          href="/portal/intake"
          className="mt-4 inline-flex min-h-11 items-center text-sm font-medium text-oxide-deep underline decoration-oxide-deep/30 underline-offset-4"
        >
          {intakeOpen ? "Fill out your information" : "Update your information"}
        </Link>
      </section>
      <ProfileRequest />
    </div>
  );
}
