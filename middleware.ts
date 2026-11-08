import { auth } from "@/auth";
import { NextResponse } from "next/server";

const flowPaths = ["/complete-profile", "/verify-required", "/verify-email", "/force-signout", "/post-login"];

export default auth(async (request) => {
  const session = request.auth;
  if (!session?.user?.id) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  if (session.user.role === "admin") {
    if (pathname === "/admin" || pathname.startsWith("/admin/") || pathname === "/force-signout") {
      return NextResponse.next();
    }
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (session.user.role !== "customer") return NextResponse.next();
  if (flowPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  // The auth callback has already loaded the current account from the database.
  if (!session.user.isEmailVerified) {
    return NextResponse.redirect(new URL("/force-signout", request.url));
  }
  return NextResponse.next();
});

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!api|images/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
