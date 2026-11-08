"use server";

import { AuthError, CredentialsSignin } from "next-auth";
import { signIn } from "@/auth";
import { prisma } from "@/lib/prisma";
import { authDestination } from "@/lib/auth-destination";

export async function loginWithPassword(phone: string, password: string, callbackUrl?: string): Promise<{
  ok: boolean; error?: string; code?: string; destination?: string;
}> {
  const normalizedPhone = String(phone ?? "").replace(/\s/g, "");
  try {
    await signIn("credentials", { phone: normalizedPhone, password, redirect: false });
  } catch (error) {
    if (error instanceof CredentialsSignin) return { ok: false, error: error.type, code: error.code };
    if (error instanceof AuthError) return { ok: false, error: error.type };
    throw error;
  }
  // The incoming request headers still contain the pre-login cookie.
  // Resolve the destination only after Auth.js has verified the credentials.
  const user = await prisma.user.findUnique({
    where: { phone: normalizedPhone },
    select: { role: true, status: true, phone: true, email: true, profileCompletedAt: true, emailVerifiedAt: true },
  });
  if (!user || user.status !== "active") return { ok: false, error: "SessionUnavailable" };
  const destination = authDestination(user);
  if (user.role === "customer" && destination !== "/") return { ok: true, destination };
  const safeCallback = typeof callbackUrl === "string" && callbackUrl.startsWith("/") &&
    !callbackUrl.startsWith("//") && !/[\\\x00-\x20]/.test(callbackUrl) ? callbackUrl : undefined;
  return { ok: true, destination: safeCallback ?? destination };
}
