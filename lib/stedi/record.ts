import "server-only";
import { isServiceRoleConfigured } from "@/lib/env";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export async function recordClearinghouse(input: {
  controlNumber: string;
  idempotencyKey: string;
  stediTransactionId?: string;
  stediClaimId?: string;
  kind: string;
  status: string;
  snapshot: Record<string, string | number | string[]>;
}) {
  if (!isServiceRoleConfigured()) return { stored: false as const };
  try {
    const supabase = createSupabaseAdminClient();
    const { error } = await supabase.from("clearinghouse_transactions").upsert(
      {
        claim_control_number: input.controlNumber,
        idempotency_key: input.idempotencyKey,
        stedi_transaction_id: input.stediTransactionId ?? null,
        stedi_claim_id: input.stediClaimId ?? null,
        kind: input.kind,
        status: input.status,
        snapshot: input.snapshot,
      },
      { onConflict: "idempotency_key" },
    );
    return { stored: !error };
  } catch {
    return { stored: false as const };
  }
}
