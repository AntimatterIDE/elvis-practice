import { redirect } from "next/navigation";
import { AgreementsDesk } from "@/components/admin/agreements-desk";
import { ensureStarterAgreements, listAgreements, listPackets } from "@/lib/agreements/store";
import { getStaffSession } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

export default async function AgreementsPage() {
  const staff = await getStaffSession();
  if (!staff) redirect("/admin/login");
  await ensureStarterAgreements();
  const [agreements, packets] = await Promise.all([listAgreements(), listPackets()]);
  if (!agreements.ok || !packets.ok) {
    return (
      <main>
        <h1 className="font-display text-4xl">Agreements</h1>
        <p className="mt-4 text-sm text-emergency">{agreements.ok ? packets.message : agreements.message}</p>
      </main>
    );
  }
  return <AgreementsDesk agreements={agreements.agreements} packets={packets.packets} />;
}
