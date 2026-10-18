import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/token";
import { clientIp, clearLimit, progressiveFailureLimit, recordProgressiveFailure } from "@/lib/ratelimit";

class TooMany extends CredentialsSignin {
  code: string;
  constructor(retryAfterSec: number) {
    super();
    this.code = `rate_limited_${retryAfterSec}`;
  }
}
class AccountLocked extends CredentialsSignin { code = "account_locked"; }

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Phiên trượt: mỗi lần ứng dụng xác nhận session, thời hạn 30 phút được làm mới.
  session: { strategy: "jwt", maxAge: 30 * 60 },
  jwt: { maxAge: 30 * 60 },
  pages: { signIn: "/login" },
  providers: [
    Credentials({
      credentials: { phone: {}, password: {} },
      async authorize(c, request) {
        const phone = String(c?.phone ?? "").replace(/\s/g, "");
        const ip = clientIp(request.headers);
        const perAccount = `login:fail:phone:${phone}:${ip}`;
        const perIp = `login:fail:ip:${ip}`;
        const [a, b] = await Promise.all([
          progressiveFailureLimit(perAccount),
          progressiveFailureLimit(perIp),
        ]);
        if (!a.ok || !b.ok) throw new TooMany(Math.max(a.retryAfterSec, b.retryAfterSec));

        const user = await prisma.user.findUnique({ where: { phone } });
        if (!user) {
          await Promise.all([
            recordProgressiveFailure(perAccount, 3),
            recordProgressiveFailure(perIp, 3),
          ]);
          return null;
        }
        if (user.status === "locked") throw new AccountLocked();
        const passwordHash = user.passwordHash;
        const ok = passwordHash
          ? await bcrypt.compare(String(c?.password ?? ""), passwordHash)
          : false;
        if (!ok) {
          await Promise.all([
            recordProgressiveFailure(perAccount, 3),
            recordProgressiveFailure(perIp, 3),
          ]);
          return null;
        }
        await Promise.all([clearLimit(perAccount), clearLimit(perIp)]);
        // avatarUrl có thể là data URI Base64 lớn; không đưa ảnh vào JWT cookie.
        return { id: user.id, email: user.email ?? undefined, name: user.fullName };
      },
    }),
    Credentials({
      id: "email-verification",
      name: "Email verification link",
      credentials: { token: {} },
      async authorize(c) {
        const token = String(c?.token ?? "");
        if (!token) return null;
        const tokenHash = hashToken(token);
        return prisma.$transaction(async (tx) => {
          const verification = await tx.emailVerificationToken.findFirst({
            where: { tokenHash, expiresAt: { gt: new Date() } },
            select: { id: true, userId: true, email: true },
          });
          if (!verification) return null;

          const user = await tx.user.findUnique({
            where: { id: verification.userId },
            select: { id: true, email: true, fullName: true, role: true, status: true, passwordHash: true, emailVerifiedAt: true },
          });
          if (!user || !user.passwordHash || user.status !== "active" || user.role !== "customer") return null;
          const email = verification.email ?? user.email;
          if (!email) return null;
          const duplicate = await tx.user.findFirst({ where: { email, id: { not: user.id } }, select: { id: true } });
          if (duplicate) return null;
          const consumed = await tx.emailVerificationToken.deleteMany({ where: { id: verification.id } });
          if (consumed.count !== 1) return null;

          await tx.user.update({ where: { id: user.id }, data: { email, emailVerifiedAt: new Date() } });
          return { id: user.id, email, name: user.fullName };
        });
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      // Loại bỏ ảnh khỏi cả token mới lẫn token cũ được làm mới.
      delete token.picture;
      if (user?.id) {
        const u = await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        });
        token.uid = u.id;
        token.role = u.role;
      } else if (token.uid) {
        const u = await prisma.user.findUnique({
          where: { id: token.uid as string },
          select: { role: true, status: true },
        });
        if (!u || u.status !== "active") return null;
        token.role = u.role;
      }
      return token;
    },
    session({ session, token }) {
      session.user.id = token.uid as string;
      session.user.role = token.role as "admin" | "staff" | "customer";
      return session;
    },
  },
});
