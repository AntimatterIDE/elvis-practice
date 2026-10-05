"use server";

import { redirect } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type RecoveryState = { error?: string };

export async function completeRecovery(_previous: RecoveryState, formData: FormData): Promise<RecoveryState> {
  const tokenHash = String(formData.get("token_hash") ?? "");
  const code = String(formData.get("code") ?? "");
  const accessToken = String(formData.get("access_token") ?? "");
  const refreshToken = String(formData.get("refresh_token") ?? "");
  const supabase = await createSupabaseServerClient();

  if (tokenHash) {
    const verified = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    if (verified.error) return { error: "This reset link has already been used or has expired. Request a new one." };
  } else if (code) {
    const exchanged = await supabase.auth.exchangeCodeForSession(code);
    if (exchanged.error) return { error: "This reset link has already been used or has expired. Request a new one." };
  } else if (accessToken && refreshToken) {
    const session = await supabase.auth.setSession({ access_token: accessToken, refresh_token: refreshToken });
    if (session.error) return { error: "This reset link has already been used or has expired. Request a new one." };
  } else {
    return { error: "This reset link has already been used or has expired. Request a new one." };
  }

  redirect("/admin/reset-password");
}
