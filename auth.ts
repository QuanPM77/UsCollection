import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import { createRemoteJWKSet, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/token";
import { clientIp, clearLimit, progressiveFailureLimit, recordProgressiveFailure } from "@/lib/ratelimit";

// Prefer the canonical public URL over an internal proxy host such as 0.0.0.0.
if (!process.env.AUTH_URL && process.env.APP_URL) {
  process.env.AUTH_URL = process.env.APP_URL.replace(/\/+$/, "");
}

const googleJwks = createRemoteJWKSet(new URL("https://www.googleapis.com/oauth2/v3/certs"));

class TooMany extends CredentialsSignin {
  code: string;
  constructor(retryAfterSec: number) {
    super();
    this.code = `rate_limited_${retryAfterSec}`;
  }
}
class AccountLocked extends CredentialsSignin { code = "account_locked"; }

function hasVerifiedGoogleEmail(profile: unknown) {
  if (!profile || typeof profile !== "object") return false;
  const verified = (profile as { email_verified?: unknown }).email_verified;
  return verified === true || verified === "true";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  // Phiên trượt: mỗi lần ứng dụng xác nhận session, thời hạn 30 phút được làm mới.
  session: { strategy: "jwt", maxAge: 30 * 60 },
  jwt: { maxAge: 30 * 60 },
  pages: { signIn: "/login" },
  providers: [
    ...(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
      ? [Google({ clientId: process.env.AUTH_GOOGLE_ID, clientSecret: process.env.AUTH_GOOGLE_SECRET })]
      : []),
    ...(process.env.AUTH_GOOGLE_ID
      ? [Credentials({
          id: "google-native",
          name: "Google (Android)",
          credentials: { idToken: {} },
          async authorize(credentials) {
            const idToken = String(credentials?.idToken ?? "");
            if (!idToken || !process.env.AUTH_GOOGLE_ID) return null;

            try {
              const { payload } = await jwtVerify(idToken, googleJwks, {
                audience: process.env.AUTH_GOOGLE_ID,
                issuer: ["https://accounts.google.com", "accounts.google.com"],
              });
              const sub = typeof payload.sub === "string" ? payload.sub : "";
              const email = typeof payload.email === "string" ? payload.email.trim().toLowerCase() : "";
              if (!sub || !email || payload.email_verified !== true) return null;
              return {
                id: sub,
                email,
                name: typeof payload.name === "string" ? payload.name : null,
              };
            } catch {
              return null;
            }
          },
        })]
      : []),
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
        if (!user || user.googleId) {
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
            select: { id: true, email: true, googleId: true, fullName: true, role: true, status: true, passwordHash: true, emailVerifiedAt: true },
          });
          if (!user || user.googleId || !user.passwordHash || user.status !== "active" || user.role !== "customer") return null;
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
    async signIn({ user, account, profile }) {
      if (account?.provider !== "google") return true;
      const email = user.email?.trim().toLowerCase();
      if (!email) return "/login?error=GoogleEmailMissing";
      if (!hasVerifiedGoogleEmail(profile)) return "/login?error=GoogleEmailUnverified";
      const existingUser = await prisma.user.findUnique({ where: { googleId: account.providerAccountId }, select: { id: true, role: true, status: true, googleId: true } })
        ?? await prisma.user.findUnique({ where: { email }, select: { id: true, role: true, status: true, googleId: true } });
      if (existingUser?.status === "locked") return "/login?error=GoogleAccountLocked";
      if (existingUser?.googleId && existingUser.googleId !== account.providerAccountId) return "/login?error=GoogleAccountConflict";
      return true;
    },
    async jwt({ token, user, account, profile }) {
      // Loại bỏ ảnh khỏi cả token mới lẫn token cũ được làm mới.
      delete token.picture;
      if (account?.provider === "google" || account?.provider === "google-native") {
        const email = user?.email?.trim().toLowerCase();
        if (!email) return null;
        if (account.provider === "google" && !hasVerifiedGoogleEmail(profile)) return null;

        const googleId = account.providerAccountId;
        if (!googleId) return null;
        const existingUser = await prisma.user.findUnique({ where: { googleId } })
          ?? await prisma.user.findUnique({ where: { email } });
        if (existingUser?.status === "locked") return null;
        if (existingUser?.googleId && existingUser.googleId !== googleId) return null;
        const emailOwner = existingUser?.email === email ? null : await prisma.user.findUnique({ where: { email }, select: { id: true } });
        if (emailOwner && emailOwner.id !== existingUser?.id) return null;
        const appUser = existingUser
          ? await prisma.user.update({
              where: { id: existingUser.id },
              data: { email, googleId, emailVerifiedAt: existingUser.emailVerifiedAt ?? new Date(), lastLoginAt: new Date() },
            })
          : await prisma.user.create({
              data: { email, googleId, emailVerifiedAt: new Date(), fullName: user?.name?.trim() || null, lastLoginAt: new Date() },
            });
        await prisma.passwordResetToken.deleteMany({ where: { userId: appUser.id } });
        token.uid = appUser.id;
        token.role = appUser.role;
      } else if (user?.id) {
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
