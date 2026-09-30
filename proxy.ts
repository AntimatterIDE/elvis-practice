import { NextResponse, type NextRequest } from "next/server";
import { DEMO_ADMIN_COOKIE, DEMO_ADMIN_COOKIE_VALUE } from "@/lib/demo-admin";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isLogin = pathname === "/admin/login" || pathname.startsWith("/admin/login/");
  if (!pathname.startsWith("/admin") || isLogin) return NextResponse.next();

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
