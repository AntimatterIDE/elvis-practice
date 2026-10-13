import { Suspense } from "react";
import { VisitDesk } from "@/components/admin/visit-desk";
import { listEncounters, visitStorageReady } from "@/lib/encounters/store";
import type { Encounter } from "@/lib/encounters/types";
import { LoadingDesk } from "@/components/admin/rcm/ui";

export const dynamic = "force-dynamic";

export default async function VisitsPage() {
  const ready = visitStorageReady();
  let encounters: Encounter[] = [];
  let storageError = "";
  if (ready) {
    try {
      encounters = await listEncounters();
    } catch (error) {
      storageError = error instanceof Error ? error.message : "Visits could not be loaded.";
    }
  }

  return (
    <Suspense fallback={<LoadingDesk />}>
      <VisitDesk ready={ready} initialEncounters={encounters} storageError={storageError} />
    </Suspense>
  );
}
