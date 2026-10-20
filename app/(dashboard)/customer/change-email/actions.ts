"use server";
import { headers } from "next/headers";
import { requireRole } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { isEmail, FormState } from "@/lib/form";
import { clientIp, limitError, rateLimit } from "@/lib/ratelimit";
import { sendVerificationEmail } from "@/lib/verify";

export async function requestEmailChange(_: FormState, formData: FormData): Promise<FormState> {
  const session = await requireRole("customer");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  if (!isEmail(email)) return { error: "Nhập email hợp lệ." };

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, googleId: true } });
  if (user?.googleId) return { error: "Email đã liên kết với Google và không thể thay đổi." };
  if (user?.email?.toLowerCase() === email) return { error: "Đây đã là email hiện tại của bạn." };
  const duplicate = await prisma.user.findFirst({ where: { email, id: { not: session.user.id } }, select: { id: true } });
  if (duplicate) return { error: "Email này đã được sử dụng bởi tài khoản khác." };

  const ip = clientIp(await headers());
  const message = limitError(
    await rateLimit(`email-change:e:${email}`, 3, 3600),
    await rateLimit(`email-change:ip:${ip}`, 10, 3600),
  );
  if (message) return { error: message };

  await sendVerificationEmail(session.user.id, email);
  return { ok: true };
}
