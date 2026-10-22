import { redirect } from "next/navigation";
import { DocumentDesk } from "@/components/portal/document-desk";
import { listChartFiles } from "@/lib/chart-files/store";
import { readPortalCookie } from "@/lib/portal/cookie";
import { getPortalStore } from "@/lib/portal/repository";

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
  const listed = await listChartFiles(patientId);
  const files = listed.ok ? listed.files.filter((file) => !file.slotId.startsWith("claim-")) : [];
  const asked = new Set(["Photo ID", "Insurance card", "New patient intake"]);
  const papers = home.documents.filter((document) => asked.has(document.name) || document.status !== "missing");
  const storageNote = listed.ok || listed.message === "The practice database is not connected." ? "" : listed.message;

  return (
    <div className="mx-auto grid max-w-3xl gap-5 px-5 py-8">
      <div>
        <p className="kicker text-oxide-deep">Documents</p>
        <h1 className="mt-2 font-display text-4xl font-medium leading-tight">Your files. On your profile.</h1>
        <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Upload a photo ID, an insurance card, or another paper the practice asked for.
        </p>
      </div>
      <section className="rounded-3xl border border-line bg-card p-6">
        <h2 className="font-display text-2xl font-medium leading-tight">What the chart is waiting on</h2>
        <ul className="mt-4 grid gap-2 text-sm">
          {papers.map((document) => (
            <li key={document.name} className="flex items-center justify-between gap-3">
              <span>{document.name}</span>
              <span className="text-muted">{documentLabel[document.status] ?? document.status}</span>
            </li>
          ))}
        </ul>
      </section>
      <DocumentDesk files={files} storageNote={storageNote} />
    </div>
  );
}
