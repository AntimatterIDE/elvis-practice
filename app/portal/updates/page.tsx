import Link from "next/link";
import { redirect } from "next/navigation";
import { Charges, LabResults } from "@/components/portal/balance";
import { packetsForPortal } from "@/lib/agreements/store";
import { listChartFiles } from "@/lib/chart-files/store";
import { visitTypeLabel } from "@/lib/rcm/chart";
import { formatWhen } from "@/lib/rcm/format";
import { readPortalCookie } from "@/lib/portal/cookie";
import { getPortalStore } from "@/lib/portal/repository";
import { labResultSlot } from "@/lib/portal/uploads";
import { splitPortalVisits } from "@/lib/portal/view";

export const dynamic = "force-dynamic";

export default async function PortalUpdatesPage() {
  const store = getPortalStore();
  const patientId = await store.patientIdForToken(await readPortalCookie());
  if (!patientId) redirect("/portal/login");
  const home = await store.home(patientId);
  if (!home) redirect("/portal/login");
  const [packets, messages, listed] = await Promise.all([
    packetsForPortal(patientId, home.email),
    store.messagesFor(patientId),
    listChartFiles(patientId),
  ]);
  const toSign = packets.filter((packet) => packet.signPath);
  const needed = home.documents.filter((document) => document.status === "missing");
  const { upcoming } = splitPortalVisits(home.visits);
  const next = upcoming[0];
  const unread = messages.filter((message) => message.from === "practice" && !message.seenByPatient);
  const labs = listed.ok ? listed.files.filter((file) => file.slotId === labResultSlot) : [];
  const quiet = !toSign.length && !needed.length && !next && !unread.length;

  return (
    <div className="mx-auto grid max-w-3xl gap-5 px-5 py-8">
      <div>
        <p className="kicker text-oxide-deep">Updates</p>
        <h1 className="mt-2 font-display text-4xl font-medium leading-tight">What is new on your record</h1>
      </div>

      <section className="rounded-3xl border border-line bg-card p-6">
        <h2 className="font-display text-2xl font-medium leading-tight">For you</h2>
        {quiet ? <p className="mt-3 text-sm text-muted">Nothing needs you right now.</p> : null}
        <ul className="mt-4 grid gap-3 text-sm">
          {toSign.map((packet) => (
            <li key={packet.id}>
              <Link className="font-medium text-oxide-deep underline decoration-oxide-deep/30 underline-offset-4" href={packet.signPath}>
                Sign {packet.title}
              </Link>
            </li>
          ))}
          {needed.map((document) => (
            <li key={document.name}>
              <Link
                className="font-medium text-oxide-deep underline decoration-oxide-deep/30 underline-offset-4"
                href={document.name === "New patient intake" ? "/portal/intake" : "/portal/documents"}
              >
                {document.name} is still needed
              </Link>
            </li>
          ))}
          {next ? (
            <li>
              Visit on {formatWhen(next.start)}
              {next.reason || next.visitType ? ` · ${[visitTypeLabel[next.visitType] ?? next.visitType, next.reason].filter(Boolean).join(" · ")}` : ""}
            </li>
          ) : null}
          {unread.length ? (
            <li>
              <Link className="font-medium text-oxide-deep underline decoration-oxide-deep/30 underline-offset-4" href="/portal/messages">
                {unread.length === 1 ? "A new message from the practice" : `${unread.length} new messages from the practice`}
              </Link>
            </li>
          ) : null}
        </ul>
      </section>

      <Charges invoices={home.invoices} />
      <LabResults files={labs} />
    </div>
  );
}
