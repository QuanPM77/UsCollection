import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { newToken, hashToken } from "@/lib/token";
import { createActionEmail } from "@/lib/email-template";

export async function sendVerificationEmail(userId: string, email: string) {
  const token = newToken();
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId } }),
    prisma.emailVerificationToken.create({
      data: { userId, email, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    }),
  ]);
  const link = `${process.env.APP_URL ?? "http://localhost:3000"}/verify-email?token=${token}`;
  const message = createActionEmail({
    preview: "Hoàn tất xác minh địa chỉ email cho tài khoản UsStory của bạn.",
    title: "Xác minh địa chỉ email",
    paragraphs: ["Xin chào,", "Bạn vừa yêu cầu xác minh địa chỉ email cho tài khoản UsStory. Chọn nút bên dưới để hoàn tất."],
    buttonLabel: "Xác minh email",
    actionUrl: link,
    expiry: "24 giờ",
    securityNote: "Nếu bạn không thực hiện yêu cầu này, hãy bỏ qua email. Địa chỉ email của bạn sẽ không thay đổi nếu chưa xác minh.",
  });
  await sendMail(email, "Xác minh địa chỉ email | UsStory", message.html, message.text);
}
