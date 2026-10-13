import { ClaimsDesk } from "@/components/admin/rcm/claims-desk";
import { listEncounters, visitStorageReady } from "@/lib/encounters/store";
import type { Encounter } from "@/lib/encounters/types";

export const dynamic = "force-dynamic";

export default async function ClaimsPage() {
  let approvedVisits: Encounter[] = [];
  if (visitStorageReady()) {
    try {
      approvedVisits = (await listEncounters()).filter((encounter) => encounter.status === "approved");
    } catch {
      approvedVisits = [];
    }
  }
  return <ClaimsDesk approvedVisits={approvedVisits} />;
}
