import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

const flowPaths = ["/complete-profile", "/verify-required", "/verify-email", "/force-signout", "/post-login"];

export default auth(async (request) => {
  const session = request.auth;
  if (!session?.user?.id || session.user.role !== "customer") return NextResponse.next();

  const pathname = request.nextUrl.pathname;
  if (flowPaths.some((path) => pathname === path || pathname.startsWith(`${path}/`))) {
    return NextResponse.next();
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { emailVerifiedAt: true },
  });
  if (user && !user.emailVerifiedAt) {
    return NextResponse.redirect(new URL("/force-signout", request.url));
  }
  return NextResponse.next();
});

export const config = {
  runtime: "nodejs",
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|robots.txt|sitemap.xml).*)"],
};
