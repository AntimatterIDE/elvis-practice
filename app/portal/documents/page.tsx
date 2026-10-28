import Link from "next/link";
import { redirect } from "next/navigation";
import { DocumentDesk } from "@/components/portal/document-desk";
import { packetsForPortal, type PortalPacket } from "@/lib/agreements/store";
import { listChartFiles } from "@/lib/chart-files/store";
import { readPortalCookie } from "@/lib/portal/cookie";
import { getPortalStore } from "@/lib/portal/repository";
import { labResultSlot } from "@/lib/portal/uploads";

export const dynamic = "force-dynamic";

const documentLabel: Record<string, string> = {
  missing: "Still needed",
  received: "On file",
  signed: "Signed",
};

export default async function PortalDocumentsPage() {
  const store = getPortalStore();
  const patientId = await store.patientIdForToken(await readPortalCookie());
  if (!patientId) redirect("/portal/login");
  const home = await store.home(patientId);
  if (!home) redirect("/portal/login");
  const [listed, packets] = await Promise.all([listChartFiles(patientId), packetsForPortal(patientId, home.email)]);
  const files = listed.ok ? listed.files.filter((file) => !file.slotId.startsWith("claim-") && file.slotId !== labResultSlot) : [];
  const papers = [...home.documents].sort((a, b) => Number(a.status !== "missing") - Number(b.status !== "missing"));
  const storageNote = listed.ok || listed.message === "The practice database is not connected." ? "" : listed.message;

  return (
    <div className="mx-auto grid max-w-3xl gap-5 px-5 py-8">
      <div>
        <p className="kicker text-oxide-deep">Documents</p>
        <h1 className="mt-2 font-display text-4xl font-medium leading-tight">Your files. On your profile.</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Sign what the practice sent, and upload a photo ID, an insurance card, or another paper they asked for. Lab results are on Updates.
        </p>
      </div>
      <Agreements packets={packets} />
      <section className="rounded-3xl border border-line bg-card p-6">
        <h2 className="font-display text-2xl font-medium leading-tight">What the chart is waiting on</h2>
        <ul className="mt-4 grid gap-2 text-sm">
          {papers.map((document) => (
            <li key={document.name} className="flex items-center justify-between gap-3">
              <span>
                {document.name}
                {document.name === "New patient intake" && document.status === "missing" ? (
                  <>
                    {" "}
                    <Link className="font-medium text-oxide-deep underline decoration-oxide-deep/30 underline-offset-4" href="/portal/intake">
                      Fill it out
                    </Link>
                  </>
                ) : null}
              </span>
              <span className="text-muted">{documentLabel[document.status] ?? document.status}</span>
            </li>
          ))}
        </ul>
      </section>
      <DocumentDesk files={files} storageNote={storageNote} />
    </div>
  );
}

const packetLabel: Record<string, string> = {
  sent: "Waiting for your signature",
  signed: "Signed",
  expired: "Expired",
  void: "Void",
};

function Agreements({ packets }: { packets: PortalPacket[] }) {
  return (
    <section className="rounded-3xl border border-line bg-card p-6">
      <h2 className="font-display text-2xl font-medium leading-tight">Agreements</h2>
      {packets.length ? (
        <ul className="mt-4 grid gap-3 text-sm">
          {packets.map((packet) => (
            <li key={packet.id} className="flex flex-wrap items-center justify-between gap-3">
              <span>
                <span className="block font-medium">{packet.title}</span>
                <span className="text-muted">{packetLabel[packet.status] ?? packet.status}</span>
              </span>
              {packet.signPath ? (
                <Link className="font-medium text-oxide-deep underline decoration-oxide-deep/30 underline-offset-4" href={packet.signPath}>
                  Sign now
                </Link>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-muted">No agreements are on your record.</p>
      )}
    </section>
  );
}
