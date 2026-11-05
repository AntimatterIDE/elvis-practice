import "server-only";
import { isServiceRoleConfigured, isSupabaseConfigured } from "@/lib/env";
import { normalizeClaim } from "@/lib/rcm/chart";
import type { Claim } from "@/lib/rcm/types";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { Json } from "@/lib/supabase/database";

const CLAIM_LIMIT = 500;

export function claimsStoreReady() {
  return isSupabaseConfigured() && isServiceRoleConfigured();
}

function asJson(value: unknown): Json {
  return JSON.parse(JSON.stringify(value)) as Json;
}

function rowToClaim(row: { id: string; claim: Json }): Claim | null {
  if (!row.claim || typeof row.claim !== "object" || Array.isArray(row.claim)) return null;
  const claim = normalizeClaim({ ...(row.claim as Claim), id: row.id });
  if (!claim.patientId || !claim.controlNumber) return null;
  return claim;
}

export async function listClaims(): Promise<{ ok: true; claims: Claim[] } | { ok: false; error: string }> {
  if (!claimsStoreReady()) return { ok: false, error: "Supabase is not connected." };
  try {
    const supabase = createSupabaseAdminClient();
    const { data, error } = await supabase
      .from("claims")
      .select("id, claim")
      .order("updated_at", { ascending: false })
      .limit(CLAIM_LIMIT);
    if (error) {
      if (error.code === "42P01" || /does not exist/i.test(error.message)) {
        return { ok: false, error: "The claims table is not in the database yet. Run the latest Supabase migration." };
      }
      return { ok: false, error: "Those claims could not be loaded." };
    }
    const claims = (data ?? [])
      .map((row) => rowToClaim(row))
      .filter((claim): claim is Claim => Boolean(claim));
    return { ok: true, claims };
  } catch {
    return { ok: false, error: "Those claims could not be loaded." };
  }
}

export async function upsertClaims(claims: Claim[]): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!claimsStoreReady()) return { ok: false, error: "Supabase is not connected." };
  const rows = claims.slice(0, CLAIM_LIMIT).map((claim) => {
    const normalized = normalizeClaim(claim);
    return {
      id: normalized.id,
      patient_id: normalized.patientId,
      status: normalized.status,
      claim: asJson(normalized),
      created_at: normalized.createdAt || new Date().toISOString(),
      updated_at: normalized.updatedAt || new Date().toISOString(),
    };
  });
  if (!rows.length) return { ok: true };
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("claims").upsert(rows, { onConflict: "id" });
    if (error) {
      if (error.code === "42P01" || /does not exist/i.test(error.message)) {
        return { ok: false, error: "The claims table is not in the database yet. Run the latest Supabase migration." };
      }
      return { ok: false, error: "Those claims could not be shared with the practice." };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: "Those claims could not be shared with the practice." };
  }
}
