import "server-only";
import { isServiceRoleConfigured } from "@/lib/env";
import { fileStore } from "@/lib/portal/file-store";
import { supabaseStore } from "@/lib/portal/supabase-store";
import type { PortalStore } from "@/lib/portal/types";

export function getPortalStore(): PortalStore {
  return isServiceRoleConfigured() ? supabaseStore : fileStore;
}
