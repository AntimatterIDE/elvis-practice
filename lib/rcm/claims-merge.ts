import { normalizeClaim } from "@/lib/rcm/chart";
import type { Claim } from "@/lib/rcm/types";

/** Newer updatedAt wins. Local-only claims are kept. Returns claims that still need a server upsert. */
export function mergeClaimsByUpdatedAt(local: Claim[], remote: Claim[]) {
  const merged = new Map<string, Claim>();
  for (const claim of remote) merged.set(claim.id, normalizeClaim(claim));
  const needsUpsert: Claim[] = [];
  for (const claim of local) {
    const normalized = normalizeClaim(claim);
    const other = merged.get(normalized.id);
    if (!other) {
      merged.set(normalized.id, normalized);
      needsUpsert.push(normalized);
      continue;
    }
    if (normalized.updatedAt > other.updatedAt) {
      merged.set(normalized.id, normalized);
      needsUpsert.push(normalized);
    }
  }
  const claims = [...merged.values()].sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));
  return { claims, needsUpsert };
}
