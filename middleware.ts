import { auth } from "@/auth";
import { NextResponse } from "next/server";

const flowPaths = ["/complete-profile", "/verify-required", "/verify-email", "/force-signout", "/post-login"];

export default auth(async (request) => {
  const session = request.auth;
  if (!session?.user?.id || session.user.role !== "customer") return NextResponse.next();

  const pathname = request.nextUrl.pathname;
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
