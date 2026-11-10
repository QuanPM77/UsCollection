import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth-session";

export async function GET(request: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.redirect(new URL("/login", request.url));
  if (session.user.role !== "customer" || session.user.destination !== "/") {
    return NextResponse.redirect(new URL(session.user.destination, request.url));
  }
  const jar = await cookies();
  const value = jar.get("checkout-return")?.value;
  const destination = value && /^\/checkout(?:\/product\/[a-zA-Z0-9-]+)?$/.test(value) ? value : "/";
  jar.delete("checkout-return");
  const response = NextResponse.redirect(new URL(destination, request.url));
  response.headers.set("Cache-Control", "private, no-store");
  return response;
}
