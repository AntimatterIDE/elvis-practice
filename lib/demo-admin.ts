import { isSupabaseConfigured } from "@/lib/env";

export const DEMO_ADMIN_EMAIL = "admin@thealignmentclinic.com";
export const DEMO_ADMIN_PASSWORD = "AlignmentDemo2026";
export const DEMO_ADMIN_COOKIE = "alignment-demo-session";
export const DEMO_ADMIN_COOKIE_VALUE = "alignment-demo-ok";

export function isDemoAdminEnabled() {
  return !isSupabaseConfigured();
}
