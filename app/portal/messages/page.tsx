import { redirect } from "next/navigation";
import { MessageDesk } from "@/components/portal/message-desk";
import { readPortalCookie } from "@/lib/portal/cookie";
import { getPortalStore } from "@/lib/portal/repository";

export const dynamic = "force-dynamic";

export default async function PortalMessagesPage() {
  const store = getPortalStore();
  const patientId = await store.patientIdForToken(await readPortalCookie());
  if (!patientId) redirect("/portal/login");
  const seen = await store.seeMessages(patientId, "patient");
  if (!seen.ok) redirect("/portal/login");

  return (
    <div className="mx-auto grid max-w-3xl gap-5 px-5 py-8">
      <div>
        <p className="kicker text-oxide-deep">Messages</p>
        <h1 className="mt-2 font-display text-4xl font-medium leading-tight">Talk with the practice.</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Messages stay on your record. The practice reads them on your chart and replies here.
        </p>
      </div>
      <MessageDesk initial={seen.value} />
    </div>
  );
}
