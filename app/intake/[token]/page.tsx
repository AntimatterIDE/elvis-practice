import type { Metadata } from "next";
import { ClinicFrame } from "@/components/clinic/frame";
import { IntakeForm } from "@/components/portal/intake-form";
import { getPortalStore } from "@/lib/portal/repository";
import { practice } from "@/lib/site";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Patient form",
  robots: { index: false, follow: false },
};

export default async function IntakePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const invite = await getPortalStore().publicInvite(token);

  return (
    <ClinicFrame kicker={`${practice.physicianName} · Patient form`}>
      <main className="mx-auto min-w-0 max-w-3xl px-5 py-10 sm:py-14">
        {invite.status === "missing" ? (
          <Closed title="This link is not valid." body="Ask the practice to send a new form. The address may have been cut off when it was copied." />
        ) : null}
        {invite.status === "expired" ? (
          <Closed title="This link has expired." body="Forms stay open for 14 days. Ask the practice to send a new one." />
        ) : null}
        {invite.status === "used" ? (
          <Closed
            title="This form was already sent."
            body="The practice has your answers. Call them if a phone number, pharmacy, or insurance card needs to change."
          />
        ) : null}
        {invite.status === "open" ? (
          <>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-oxide">Before your visit</p>
            <h1 className="mt-3 max-w-2xl font-display text-4xl tracking-tight sm:text-5xl">{invite.form.title}</h1>
            {invite.form.recipientName ? (
              <p className="mt-4 text-xl text-ink">Hello, {invite.form.recipientName}.</p>
            ) : null}
            {invite.form.introduction ? (
              <p className="mt-3 max-w-2xl text-base leading-relaxed text-muted">{invite.form.introduction}</p>
            ) : null}
            <IntakeForm token={token} form={invite.form} />
          </>
        ) : null}
      </main>
    </ClinicFrame>
  );
}

function Closed({ title, body }: { title: string; body: string }) {
  return (
    <div className="max-w-xl rounded-3xl border border-line bg-card p-6 shadow-[0_18px_40px_-32px_rgb(7_30_54_/_0.55)] sm:p-8">
      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-oxide">{practice.name}</p>
      <h1 className="mt-3 font-display text-4xl tracking-tight">{title}</h1>
      <p className="mt-3 text-base leading-relaxed text-muted">{body}</p>
    </div>
  );
}
