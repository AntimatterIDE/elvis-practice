import "server-only";
import { cookies } from "next/headers";
import { DEMO_ADMIN_COOKIE, DEMO_ADMIN_COOKIE_VALUE, DEMO_ADMIN_EMAIL, isDemoAdminEnabled } from "@/lib/demo-admin";
import { isSupabaseConfigured } from "@/lib/env";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type StaffRole = "owner" | "admin" | "editor";

export type StaffSession = {
  userId: string;
  email: string;
  role: StaffRole;
  displayName: string;
  aal: "aal1" | "aal2";
};

async function readDemoStaffSession(): Promise<StaffSession | null> {
  if (!isDemoAdminEnabled()) return null;
  const cookieStore = await cookies();
  if (cookieStore.get(DEMO_ADMIN_COOKIE)?.value !== DEMO_ADMIN_COOKIE_VALUE) return null;
  return {
    userId: "demo-admin",
    email: DEMO_ADMIN_EMAIL,
    role: "owner",
    displayName: "Demo Admin",
    aal: "aal1",
  };
}

export async function getStaffSession(): Promise<StaffSession | null> {
  if (!isSupabaseConfigured()) return readDemoStaffSession();

  const supabase = await createSupabaseServerClient();
  const { data: userData, error } = await supabase.auth.getUser();
  if (error || !userData.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, display_name")
    .eq("id", userData.user.id)
    .maybeSingle();

  if (!profile) return null;

  const { data: assurance } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const aal = assurance?.currentLevel === "aal2" ? "aal2" : "aal1";

  return {
    userId: userData.user.id,
    email: userData.user.email ?? "",
    role: profile.role,
    displayName: profile.display_name,
    aal,
  };
}
