"use server";
import { headers } from "next/headers";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { newToken, hashToken } from "@/lib/token";
import { FormState, isEmail } from "@/lib/form";
import { clientIp, rateLimit, limitError } from "@/lib/ratelimit";

export async function requestReset(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!isEmail(email)) return { error: "Nhập email hợp lệ." };

  const ip = clientIp(await headers());
  // Áp dụng bất kể email có tồn tại hay không nên không lộ thông tin
  const lim = limitError(
    await rateLimit(`forgot:e:${email}`, 3, 3600),
    await rateLimit(`forgot:ip:${ip}`, 10, 3600)
  );
  if (lim) return { error: lim };

  const user = await prisma.user.findUnique({ where: { email } });
  if (user && user.status === "active") {
    const token = newToken();
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 30 * 60 * 1000) },
      }),
    ]);
    const link = `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
    await sendMail(
      email,
      "Đặt lại mật khẩu UsStory",
      `<p>Bấm vào liên kết sau để đặt mật khẩu mới (hết hạn sau 30 phút):</p><p><a href="${link}">${link}</a></p><p>Nếu không phải bạn yêu cầu, hãy bỏ qua email này.</p>`
    );
  }
  return { ok: true };
}
