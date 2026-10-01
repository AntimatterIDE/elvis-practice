import type { Metadata } from "next";
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
    <main className="mx-auto max-w-xl px-5 py-16">
      <p className="text-xs uppercase tracking-[0.18em] text-oxide">{practice.name}</p>
      {invite.status === "missing" ? (
        <>
          <h1 className="mt-4 font-display text-5xl">This link is not valid.</h1>
          <p className="mt-4 text-muted">Ask the practice to send a new form.</p>
        </>
      ) : null}
      {invite.status === "expired" ? (
        <>
          <h1 className="mt-4 font-display text-5xl">This link has expired.</h1>
          <p className="mt-4 text-muted">Ask the practice to send a new form.</p>
        </>
      ) : null}
      {invite.status === "used" ? (
        <>
          <h1 className="mt-4 font-display text-5xl">This form was already submitted.</h1>
          <p className="mt-4 text-muted">The practice has the copy you sent. Call them if something needs to change.</p>
        </>
      ) : null}
      {invite.status === "open" ? (
        <>
          <h1 className="mt-4 font-display text-5xl">{invite.form.title}</h1>
          {invite.form.recipientName ? <p className="mt-4 text-lg">Hello {invite.form.recipientName}.</p> : null}
          {invite.form.introduction ? <p className="mt-4 text-muted">{invite.form.introduction}</p> : null}
          <IntakeForm token={token} form={invite.form} />
        </>
      ) : null}
    </main>
  );
}
