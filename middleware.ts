import { auth } from "@/auth";
import { NextResponse } from "next/server";

const flowPaths = ["/complete-profile", "/verify-required", "/verify-email", "/force-signout", "/post-login"];

export default auth(async (request) => {
  const session = request.auth;
  if (!session?.user?.id) return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  if (pathname.startsWith("/api/")) {
    if (session.user.role === "customer" &&
      (session.user.destination === "/complete-profile" || session.user.destination === "/verify-required")) {
      return NextResponse.json({
        message: "Vui lòng hoàn thiện thông tin cá nhân và xác minh email trước khi sử dụng tính năng này.",
        redirectTo: session.user.destination,
      }, { status: 403 });
    }
    return NextResponse.next();
  }

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
  if (session.user.destination === "/complete-profile") {
    return NextResponse.redirect(new URL("/complete-profile", request.url));
  }
  if (!session.user.isEmailVerified) {
    return NextResponse.redirect(new URL("/force-signout", request.url));
  }
  return NextResponse.next();
});

export const config = {
  runtime: "nodejs",
  matcher: [
    "/((?!api|images/|models/|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)",
    "/api/custom-designs/:path*",
    "/api/support/chat/:path*",
    "/api/payment/create",
    "/api/payment/cancel",
    "/api/payment/status",
  ],
};
