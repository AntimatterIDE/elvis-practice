"use client";

import { useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { claimTotal, formatDay, money, patientName } from "@/lib/rcm/format";
import {
  LoadingDesk,
  PageHeader,
  StatusPill,
  Stat,
  cardClass,
  badgeClass,
} from "@/components/admin/rcm/ui";
import { useRcm } from "@/components/admin/rcm/store";
import { cn } from "@/lib/utils";

export function DraftsDesk() {
  const { ready, claims, patients, updateClaim } = useRcm();
  const [approvedIds, setApprovedIds] = useState<Set<string>>(new Set());

  if (!ready) return <LoadingDesk />;

  const drafts = claims.filter((claim) => claim.status === "draft");
  const names = new Map(patients.map((patient) => [patient.id, patientName(patient)]));
  const totalDraftValue = drafts.reduce((sum, c) => sum + claimTotal(c), 0);

  function handleApprove(claimId: string) {
    updateClaim(claimId, { status: "submitted" });
    setApprovedIds((prev) => {
      const next = new Set(prev);
      next.add(claimId);
      return next;
    });
  }

  return (
    <main>
      <PageHeader
        kicker="Practice"
        title="Agent drafts"
        lede="Claims waiting for a person to review. Approving one marks it submitted here. It is not sent to a payer."
      />
      {/* Stats bar */}
      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Stat label="Drafts" value={String(drafts.length)} />
        <Stat label="Total value" value={money(totalDraftValue)} />
        <Stat
          label="Approved this session"
          value={String(approvedIds.size)}
          detail="Moved to submitted status"
        />
      </div>

      {/* Draft cards */}
      {drafts.length === 0 ? (
        <p className="mt-8 text-sm text-muted">
          No drafts. Create a claim or import a CSV.
        </p>
      ) : (
        <ul className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {drafts.map((claim) => {
            const name = names.get(claim.patientId) ?? "Unknown";
            return (
              <li key={claim.id} className={cardClass}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-ink">{name}</p>
                    <p className="mt-0.5 text-xs text-muted">{claim.payerName}</p>
                  </div>
                  <StatusPill status="draft" />
                </div>
                <div className="mt-3 flex items-baseline justify-between gap-2 text-sm">
                  <span className="text-muted">{claim.controlNumber}</span>
                  <span className="font-semibold text-ink">{money(claimTotal(claim))}</span>
                </div>
                <p className="mt-1 text-xs text-muted">
                  {formatDay(claim.dateOfService)} &middot; {claim.lines.length} line{claim.lines.length > 1 ? "s" : ""}
                  &nbsp;·&nbsp;
                  {claim.lines.map((l) => l.cpt).join(", ")}
                </p>
                {claim.source === "upload" ? (
                  <span
                    className={cn(badgeClass, "mt-2 bg-mist text-muted inline-flex")}
                  >
                    Imported
                  </span>
                ) : null}
                <div className="mt-4 flex gap-2">
                  <Button asChild variant="secondary">
                    <Link href={`/admin/operations/claims/${claim.id}`}>Review</Link>
                  </Button>
                  <Button
                    variant="primary"
                    onClick={() => handleApprove(claim.id)}
                    disabled={approvedIds.has(claim.id)}
                  >
                    {approvedIds.has(claim.id) ? "Approved" : "Approve"}
                  </Button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </main>
  );
}