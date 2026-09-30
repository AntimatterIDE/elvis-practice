import "server-only";
import { createClient } from "@supabase/supabase-js";
import { readServerEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database";

export function createSupabaseAdminClient() {
  const env = readServerEnv();
  if (!env.NEXT_PUBLIC_SUPABASE_URL || !env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error("Supabase service role is not configured.");
  }

  return createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
