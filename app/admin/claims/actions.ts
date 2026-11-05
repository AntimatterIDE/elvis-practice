"use server";

import { listClaims, upsertClaims } from "@/lib/rcm/claims-store";
import type { Claim } from "@/lib/rcm/types";
import { getStaffSession } from "@/lib/supabase/session";

function asClaim(value: unknown): Claim | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) return null;
  const claim = value as Claim;
  if (typeof claim.id !== "string" || !claim.id) return null;
  if (typeof claim.patientId !== "string") return null;
  return claim;
}

export async function loadClaimsAction() {
  if (!(await getStaffSession())) return { ok: false as const, error: "Sign in required.", claims: [] as Claim[] };
  const result = await listClaims();
  if (!result.ok) return { ok: false as const, error: result.error, claims: [] as Claim[] };
  return { ok: true as const, claims: result.claims };
}

export async function upsertClaimsAction(input: Claim[]) {
  if (!(await getStaffSession())) return { ok: false as const, error: "Sign in required." };
  const claims = (Array.isArray(input) ? input : []).map(asClaim).filter((claim): claim is Claim => Boolean(claim)).slice(0, 500);
  if (!claims.length) return { ok: true as const };
  const result = await upsertClaims(claims);
  if (!result.ok) return { ok: false as const, error: result.error };
  return { ok: true as const };
}
