import { prisma } from "@/lib/prisma";
import { sendMail } from "@/lib/mail";
import { newToken, hashToken } from "@/lib/token";

export async function sendVerificationEmail(userId: string, email: string) {
  const token = newToken();
  await prisma.$transaction([
    prisma.emailVerificationToken.deleteMany({ where: { userId } }),
    prisma.emailVerificationToken.create({
      data: { userId, tokenHash: hashToken(token), expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
    }),
  ]);
  const link = `${process.env.APP_URL ?? "http://localhost:3000"}/verify-email?token=${token}`;
  await sendMail(
    email,
    "Xác minh email UsStory",
    `<p>Bấm vào liên kết sau để xác minh email (hết hạn sau 24 giờ):</p><p><a href="${link}">${link}</a></p><p>Nếu không phải bạn đăng ký, hãy bỏ qua email này.</p>`
  );
}
