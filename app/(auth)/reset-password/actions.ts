"use server";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/token";
import { FormState } from "@/lib/form";
import { clientIp, rateLimit, limitError } from "@/lib/ratelimit";

export async function resetPassword(_: FormState, fd: FormData): Promise<FormState> {
  const token = String(fd.get("token") ?? "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");
  if (password.length < 8) return { error: "Mật khẩu cần ít nhất 8 ký tự." };
  if (password !== confirm) return { error: "Mật khẩu nhập lại không khớp." };

  const ip = clientIp(await headers());
  const lim = limitError(await rateLimit(`reset:ip:${ip}`, 10, 3600));
  if (lim) return { error: lim };

  const rec = await prisma.passwordResetToken.findUnique({ where: { tokenHash: hashToken(token) } });
  if (!rec || rec.expiresAt < new Date()) {
    return { error: "Liên kết không hợp lệ hoặc đã hết hạn. Hãy yêu cầu liên kết mới." };
  }
  const reset = await prisma.$transaction(async (tx) => {
    const updated = await tx.user.updateMany({
      where: { id: rec.userId, googleId: null },
      data: { passwordHash: await bcrypt.hash(password, 10) },
    });
    if (updated.count !== 1) {
      await tx.passwordResetToken.deleteMany({ where: { userId: rec.userId } });
      return false;
    }
    // Nhận được email đặt lại nghĩa là đã chứng minh sở hữu email
    await tx.user.updateMany({ where: { id: rec.userId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
    await tx.passwordResetToken.deleteMany({ where: { userId: rec.userId } });
    return true;
  });
  if (!reset) return { error: "Liên kết không hợp lệ hoặc đã hết hạn. Hãy đăng nhập bằng Google." };
  redirect("/login?reset=1");
}
