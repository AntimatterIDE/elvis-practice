import { redirect } from "next/navigation";
import { IntakeForm } from "@/components/portal/intake-form";
import { readPortalCookie } from "@/lib/portal/cookie";
import { getPortalStore } from "@/lib/portal/repository";
import type { IntakeField, PatientPortalView } from "@/lib/portal/types";

export const dynamic = "force-dynamic";

export default async function PortalIntakePage() {
  const store = getPortalStore();
  const patientId = await store.patientIdForToken(await readPortalCookie());
  if (!patientId) redirect("/portal/login");
  const home = await store.home(patientId);
  if (!home) redirect("/portal/login");
  const snapshot = await store.snapshot();
  if (!snapshot.ok) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-8">
        <h1 className="font-display text-4xl font-medium">Your information</h1>
        <p className="mt-3 text-sm text-muted">{snapshot.error}</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-8">
      <p className="kicker text-oxide-deep">Your information</p>
      <h1 className="mt-2 font-display text-4xl font-medium leading-tight">{snapshot.value.form.title}</h1>
      <IntakeForm
        own
        form={{
          title: snapshot.value.form.title,
          introduction: snapshot.value.form.introduction,
          recipientName: home.preferredName || home.firstName,
          fields: snapshot.value.form.fields,
        }}
        defaults={intakeDefaults(snapshot.value.form.fields, home)}
      />
    </div>
  );
}

function intakeDefaults(fields: IntakeField[], home: PatientPortalView) {
  const mapped: Partial<Record<string, string>> = {
    firstName: home.firstName,
    lastName: home.lastName,
    preferredName: home.preferredName,
    dateOfBirth: home.dateOfBirth,
    phone: home.phone,
    email: home.email,
    payerName: home.payerName,
    memberId: home.memberId,
  };
  const defaults = { ...home.savedAnswers };
  for (const field of fields) {
    if (defaults[field.id]) continue;
    const value = field.mapsTo ? mapped[field.mapsTo] : "";
    if (value) defaults[field.id] = value;
  }
  return defaults;
}
