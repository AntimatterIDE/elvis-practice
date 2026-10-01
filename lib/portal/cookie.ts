import "server-only";
import { cookies } from "next/headers";

export const PORTAL_COOKIE = "alignment-portal-session";

const base = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
};

export async function readPortalCookie() {
  const store = await cookies();
  return store.get(PORTAL_COOKIE)?.value ?? "";
}

export async function writePortalCookie(token: string) {
  const store = await cookies();
  store.set(PORTAL_COOKIE, token, { ...base, maxAge: 60 * 60 * 24 * 14 });
}

export async function clearPortalCookie() {
  const store = await cookies();
  store.set(PORTAL_COOKIE, "", { ...base, maxAge: 0 });
}
