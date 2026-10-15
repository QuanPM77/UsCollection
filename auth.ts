import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit, clearLimit } from "@/lib/ratelimit";

class NotVerified extends CredentialsSignin { code = "not_verified"; }
class TooMany extends CredentialsSignin { code = "rate_limited"; }

export const { handlers, auth, signIn, signOut } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [
    Google,
    Credentials({
      credentials: { email: {}, password: {} },
      async authorize(c, request) {
        const email = String(c?.email ?? "").trim().toLowerCase();
        const ip = clientIp(request.headers);
        const perAccount = `login:e:${email}:${ip}`;
        const [a, b] = await Promise.all([
          rateLimit(perAccount, 5, 15 * 60),      // 5 lần / 15 phút cho mỗi email + IP
          rateLimit(`login:ip:${ip}`, 30, 15 * 60), // 30 lần / 15 phút cho mỗi IP
        ]);
        if (!a.ok || !b.ok) throw new TooMany();

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash || user.status !== "active") return null;
        const ok = await bcrypt.compare(String(c?.password ?? ""), user.passwordHash);
        if (!ok) return null;
        // Chỉ báo "chưa xác minh" sau khi mật khẩu đúng, để không lộ email nào đã đăng ký
        if (!user.emailVerifiedAt) throw new NotVerified();

        await clearLimit(perAccount);
        return { id: user.id, email: user.email, name: user.fullName, image: user.avatarUrl };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      if (!profile?.email || !profile.email_verified) return false;
      const email = profile.email.toLowerCase();
      const existing = await prisma.user.findUnique({ where: { email } });
      if (!existing) {
        await prisma.user.create({
          data: {
            email, fullName: profile.name, avatarUrl: profile.picture as string | undefined,
            emailVerifiedAt: new Date(),
          },
        });
        return true;
      }
      if (existing.status !== "active") return false;
      if (!existing.emailVerifiedAt) {
        // Tài khoản này được đăng ký bằng mật khẩu mà chưa ai chứng minh sở hữu email.
        // Google vừa chứng minh chủ thật, nên xóa mật khẩu cũ để người đăng ký giả không còn vào được.
        await prisma.user.update({
          where: { id: existing.id },
          data: { emailVerifiedAt: new Date(), passwordHash: null },
        });
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const u = await prisma.user.update({
          where: { email: user.email.toLowerCase() },
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
