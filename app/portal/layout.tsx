import type { Metadata } from "next";
import { ClinicFrame } from "@/components/clinic/frame";
import { PortalNav } from "@/components/portal/nav";
import { readPortalCookie } from "@/lib/portal/cookie";
import { getPortalStore } from "@/lib/portal/repository";
import { unlistedShareMetadata } from "@/lib/share-metadata";
import { practice } from "@/lib/site";

export const metadata: Metadata = {
  ...unlistedShareMetadata,
  title: "Patient portal",
};

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const store = getPortalStore();
  const patientId = await store.patientIdForToken(await readPortalCookie());
  const messages = patientId ? await store.messagesFor(patientId) : [];
  const unread = messages.filter((message) => message.from === "practice" && !message.seenByPatient).length;
  return (
    <ClinicFrame kicker={`${practice.physicianName} · Your record`} practiceZero>
      {patientId ? <PortalNav unread={unread} /> : null}
      {children}
    </ClinicFrame>
  );
}
