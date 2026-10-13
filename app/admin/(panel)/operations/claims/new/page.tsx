import { Suspense } from "react";
import { ClaimForm } from "@/components/admin/rcm/claim-form";
import { getEncounter, visitStorageReady } from "@/lib/encounters/store";
import type { Encounter } from "@/lib/encounters/types";

export default async function NewClaimPage({ searchParams }: { searchParams: Promise<{ encounter?: string }> }) {
  const params = await searchParams;
  let encounter: Encounter | null = null;
  if (params.encounter && /^[0-9a-f-]{36}$/i.test(params.encounter) && visitStorageReady()) {
    try {
      encounter = await getEncounter(params.encounter);
    } catch {
      encounter = null;
    }
  }
  return (
    <Suspense fallback={<p className="text-sm text-muted">Loading claim form…</p>}>
      <ClaimForm initialEncounter={encounter} />
    </Suspense>
  );
}
