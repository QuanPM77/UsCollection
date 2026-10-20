"use server";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { newToken, hashToken } from "@/lib/token";
import { FormState, isEmail } from "@/lib/form";
import { clearLimit, clientIp, limitError, progressiveFailureLimit, recordProgressiveFailure } from "@/lib/ratelimit";
import { createActionEmail } from "@/lib/email-template";

export async function requestReset(_: FormState, fd: FormData): Promise<FormState> {
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  if (!isEmail(email)) return { error: "Nhập email hợp lệ." };

  const ip = clientIp(await headers());
  // Áp dụng bất kể email có tồn tại hay không để không lộ thông tin tài khoản.
  const perEmail = `forgot:fail:email:${email}`;
  const perIp = `forgot:fail:ip:${ip}`;
  const lim = limitError(
    await progressiveFailureLimit(perEmail),
    await progressiveFailureLimit(perIp)
  );
  if (lim) return { error: lim };
  await Promise.all([
    recordProgressiveFailure(perEmail, 3),
    recordProgressiveFailure(perIp, 3),
  ]);

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) redirect("/login?forgot=not-found");
  if (user.googleId) redirect("/login?forgot=google");
  if (user.status !== "active") redirect("/login?forgot=locked");
  if (user && !user.googleId && user.status === "active") {
    const token = newToken();
    await prisma.$transaction([
      prisma.passwordResetToken.deleteMany({ where: { userId: user.id } }),
      prisma.passwordResetToken.create({
        data: { userId: user.id, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 5 * 60 * 1000) },
      }),
    ]);
    const link = `${process.env.APP_URL ?? "http://localhost:3000"}/reset-password?token=${token}`;
    const message = createActionEmail({
      preview: "Tạo mật khẩu mới cho tài khoản UsStory của bạn.",
      title: "Đặt lại mật khẩu",
      paragraphs: ["Xin chào,", "Chúng tôi nhận được yêu cầu đặt lại mật khẩu cho tài khoản UsStory liên kết với địa chỉ email này. Chọn nút bên dưới để tiếp tục."],
      buttonLabel: "Tạo mật khẩu mới",
      actionUrl: link,
      expiry: "5 phút",
      securityNote: "Nếu bạn không yêu cầu đặt lại mật khẩu, hãy bỏ qua email này. Mật khẩu hiện tại của bạn sẽ không thay đổi.",
    });
    await sendMail(email, "Đặt lại mật khẩu | UsStory", message.html, message.text);
    await Promise.all([clearLimit(perEmail), clearLimit(perIp)]);
  }
  return { ok: true };
}
