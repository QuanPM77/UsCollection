"use server";
import { headers } from "next/headers";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { FormState, isEmail } from "@/lib/form";
import { clientIp, limitError, rateLimit } from "@/lib/ratelimit";
import { sendVerificationEmail } from "@/lib/verify";

export async function requestVerificationEmail(_: FormState, formData: FormData): Promise<FormState> {
  const session = await auth();
  if (!session?.user.id || session.user.role !== "customer") return { error: "Vui lòng đăng nhập lại." };
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isEmail(email)) return { error: "Nhập email hợp lệ." };

  const ip = clientIp(await headers());
  const lim = limitError(
    await rateLimit(`verify:e:${email}`, 3, 3600),
    await rateLimit(`verify:ip:${ip}`, 10, 3600),
  );
  if (lim) return { error: lim };

  const [user, duplicate] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, emailVerifiedAt: true, profileCompletedAt: true } }),
    prisma.user.findFirst({ where: { email, id: { not: session.user.id } }, select: { id: true } }),
  ]);
  if (!user?.profileCompletedAt) return { error: "Hãy hoàn tất thông tin tài khoản trước." };
  if (duplicate) return { error: "Email này đã được sử dụng bởi tài khoản khác." };
  if (user.email === email && user.emailVerifiedAt) return { ok: true };

  await prisma.user.update({
    where: { id: session.user.id },
    data: { email, ...(user.email !== email ? { emailVerifiedAt: null } : {}) },
  });
  await sendVerificationEmail(session.user.id, email);
  return { ok: true };
}
