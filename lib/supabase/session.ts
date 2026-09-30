import "server-only";
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

export async function getStaffSession(): Promise<StaffSession | null> {
  if (!isSupabaseConfigured()) return null;

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
