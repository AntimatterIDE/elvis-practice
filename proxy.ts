import { NextResponse, type NextRequest } from "next/server";
import { DEMO_ADMIN_COOKIE, DEMO_ADMIN_COOKIE_VALUE } from "@/lib/demo-admin";

const openAdminPaths = ["/admin/login", "/admin/forgot", "/admin/reset-password"];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isOpen = openAdminPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`));
  if (!pathname.startsWith("/admin") || isOpen) return NextResponse.next();

  const hasSession =
    request.cookies.get(DEMO_ADMIN_COOKIE)?.value === DEMO_ADMIN_COOKIE_VALUE ||
    request.cookies.getAll().some((cookie) => cookie.name.includes("auth-token"));
  if (!hasSession) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
