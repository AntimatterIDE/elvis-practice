import { redirect } from "next/navigation";
import { IntakeDesk } from "@/components/admin/rcm/intake-desk";
import { getPortalStore } from "@/lib/portal/repository";
import { getStaffSession } from "@/lib/supabase/session";

export const dynamic = "force-dynamic";

export default async function IntakePage() {
  const staff = await getStaffSession();
  if (!staff) redirect("/admin/login");
  const snapshot = await getPortalStore().snapshot();
  if (!snapshot.ok) {
    return (
      <main>
        <h1 className="font-display text-4xl">Intake form</h1>
        <p className="mt-4 text-sm text-emergency">{snapshot.error}</p>
      </main>
    );
  }
  return <IntakeDesk initial={snapshot.value} />;
}
