import { claimTotal } from "@/lib/rcm/format";
import type { Claim, ClaimStatus } from "@/lib/rcm/types";

const decided = new Set<ClaimStatus>(["accepted", "paid", "denied", "rejected"]);
const clean = new Set<ClaimStatus>(["accepted", "paid"]);
const open = new Set<ClaimStatus>(["submitted", "processing"]);

export function summarizeClaims(claims: Claim[]) {
  const billed = claims.reduce((sum, claim) => sum + claimTotal(claim), 0);
  const accepted = claims
    .filter((claim) => clean.has(claim.status))
    .reduce((sum, claim) => sum + claimTotal(claim), 0);
  const processing = claims.filter((claim) => open.has(claim.status)).length;
  const decidedClaims = claims.filter((claim) => decided.has(claim.status));
  const cleanClaims = decidedClaims.filter((claim) => clean.has(claim.status));
  const firstPass = decidedClaims.length === 0 ? 0 : cleanClaims.length / decidedClaims.length;

  const byPayer = new Map<string, number>();
  for (const claim of claims) {
    byPayer.set(claim.payerName, (byPayer.get(claim.payerName) ?? 0) + claimTotal(claim));
  }

  const byStatus = new Map<ClaimStatus, number>();
  for (const claim of claims) {
    byStatus.set(claim.status, (byStatus.get(claim.status) ?? 0) + 1);
  }

  return {
    billed,
    accepted,
    processing,
    firstPass,
    byPayer: [...byPayer.entries()].sort((a, b) => b[1] - a[1]),
    byStatus: [...byStatus.entries()].sort((a, b) => b[1] - a[1]),
  };
}
