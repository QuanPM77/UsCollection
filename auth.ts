import NextAuth, { CredentialsSignin } from "next-auth";
import Google from "next-auth/providers/google";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { supabase } from "@/lib/supabase";
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

        const { data: user } = await supabase
          .from("users")
          .select("*")
          .eq("email", email)
          .single();

        if (!user?.password_hash || user.status !== "active") return null;
        const ok = await bcrypt.compare(String(c?.password ?? ""), user.password_hash);
        if (!ok) return null;
        // Chỉ báo "chưa xác minh" sau khi mật khẩu đúng, để không lộ email nào đã đăng ký
        if (!user.email_verified_at) throw new NotVerified();

        await clearLimit(perAccount);
        return { id: user.id, email: user.email, name: user.full_name, image: user.avatar_url };
      },
    }),
  ],
  callbacks: {
    async signIn({ account, profile }) {
      if (account?.provider !== "google") return true;
      if (!profile?.email || !profile.email_verified) return false;
      const email = profile.email.toLowerCase();

      const { data: existing } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (!existing) {
        await supabase.from("users").insert({
          email,
          full_name: profile.name ?? email,
          password_hash: "",
          avatar_url: (profile.picture as string) ?? null,
          role: "customer",
          status: "active",
          email_verified_at: new Date().toISOString(),
        });
        return true;
      }
      if (existing.status !== "active") return false;
      if (!existing.email_verified_at) {
        // Google vừa chứng minh chủ thật → xóa mật khẩu cũ để tài khoản giả không vào được
        await supabase
          .from("users")
          .update({ email_verified_at: new Date().toISOString(), password_hash: null })
          .eq("id", existing.id);
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user?.email) {
        const { data: u } = await supabase
          .from("users")
          .update({ last_login_at: new Date().toISOString() })
          .eq("email", user.email.toLowerCase())
          .select("id, role")
          .single();
        if (u) {
          token.uid = u.id;
          token.role = u.role;
        }
      } else if (token.uid) {
        const { data: u } = await supabase
          .from("users")
          .select("role, status")
          .eq("id", token.uid as string)
          .single();
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
