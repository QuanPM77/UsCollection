"use server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { FormState, isEmail } from "@/lib/form";
import { clientIp, rateLimit, limitError } from "@/lib/ratelimit";
import { sendVerificationEmail } from "@/lib/verify";

export async function resendVerification(email: string): Promise<FormState> {
  email = email.trim().toLowerCase();
  if (!isEmail(email)) return { error: "Email không hợp lệ." };
  const ip = clientIp(await headers());
  const lim = limitError(
    await rateLimit(`verify:e:${email}`, 3, 3600),
    await rateLimit(`verify:ip:${ip}`, 10, 3600)
  );
  if (lim) return { error: lim };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user?.email && user.status === "active" && user.passwordHash && !user.emailVerifiedAt) {
    await sendVerificationEmail(user.id, user.email);
  }
  return { ok: true }; // luôn cùng một kết quả
}
