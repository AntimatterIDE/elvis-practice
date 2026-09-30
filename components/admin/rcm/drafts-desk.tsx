"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import { claimTotal, formatDay, money, patientName } from "@/lib/rcm/format";
import { LoadingDesk, PageHeader, StatusPill } from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";

export function DraftsDesk() {
  const { ready, claims, patients, updateClaim } = useRcm();
  if (!ready) return <LoadingDesk />;

  const drafts = claims.filter((claim) => claim.status === "draft");
  const names = new Map(patients.map((patient) => [patient.id, patientName(patient)]));

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Agent drafts"
        lede="Claims waiting for a person to review. Approving one marks it submitted in the demo only."
      />
      <ul className="mt-8 grid gap-4">
        {drafts.length === 0 ? <li className="text-sm text-muted">No drafts. Create a claim or import a CSV.</li> : null}
        {drafts.map((claim) => (
          <li key={claim.id} className="border border-line bg-card p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">{names.get(claim.patientId) ?? "Unknown patient"}</p>
                <p className="mt-1 text-sm text-muted">
                  {claim.payerName} · {formatDay(claim.dateOfService)} · {money(claimTotal(claim))} · {claim.source}
                </p>
                {claim.agentNote ? <p className="mt-3 max-w-xl text-sm">{claim.agentNote}</p> : null}
              </div>
              <StatusPill status={claim.status} />
            </div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Button type="button" onClick={() => updateClaim(claim.id, { status: "submitted" })}>
                Approve and submit
              </Button>
              <Button asChild variant="secondary">
                <Link href={`/admin/operations/claims/${claim.id}`}>Open claim</Link>
              </Button>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
