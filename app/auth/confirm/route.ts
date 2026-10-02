import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { isSupabaseConfigured, readServerEnv } from "@/lib/env";
import type { Database } from "@/lib/supabase/database";

function resetDestination(requestUrl: URL) {
  const next = requestUrl.searchParams.get("next");
  const recovery = requestUrl.searchParams.get("type") === "recovery" || next === "/admin/reset-password";
  return new URL(recovery ? "/admin/reset-password" : "/admin/forgot?error=expired", requestUrl.origin);
}

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const failure = NextResponse.redirect(new URL("/admin/forgot?error=expired", requestUrl.origin));
  if (!isSupabaseConfigured()) return failure;

  const env = readServerEnv();
  const success = NextResponse.redirect(resetDestination(requestUrl));
  const supabase = createServerClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL!, env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const cookie of cookiesToSet) {
          success.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  const tokenHash = requestUrl.searchParams.get("token_hash");
  const type = requestUrl.searchParams.get("type");
  const code = requestUrl.searchParams.get("code");

  if (tokenHash && type === "recovery") {
    const verified = await supabase.auth.verifyOtp({ type: "recovery", token_hash: tokenHash });
    if (!verified.error) return success;
    return failure;
  }

  if (code) {
    const exchanged = await supabase.auth.exchangeCodeForSession(code);
    if (!exchanged.error) return success;
  }

  return failure;
}
