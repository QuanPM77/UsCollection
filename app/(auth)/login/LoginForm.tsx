"use client";
import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { inputCls, primaryCls, Notice } from "@/components/AuthShell";
import { resendVerification } from "../verify-email/actions";

export default function LoginForm() {
  const router = useRouter();
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [unverified, setUnverified] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const email = String(f.get("email") ?? "");
    setLoading(true); setError(""); setInfo(""); setUnverified("");
    const res = await signIn("credentials", { email, password: f.get("password"), redirect: false });
    setLoading(false);
    if (res?.code === "not_verified") {
      setUnverified(email);
      return setError("Email chưa được xác minh. Hãy mở liên kết trong email chúng tôi đã gửi.");
    }
    if (res?.code === "rate_limited") return setError("Bạn đã thử quá nhiều lần. Hãy đợi ít phút rồi thử lại.");
    if (res?.error) return setError("Email hoặc mật khẩu không đúng, hoặc tài khoản đã bị khóa.");
    router.push("/post-login");
    router.refresh();
  }

  async function resend() {
    const r = await resendVerification(unverified);
    if (r?.error) return setError(r.error);
    setError(""); setInfo("Đã gửi lại email xác minh. Hãy kiểm tra hộp thư.");
  }

  return (
    <>
      <button type="button" onClick={() => signIn("google", { callbackUrl: "/post-login" })}
        className="w-full rounded-lg border border-pink-200 bg-white py-3 font-semibold text-rose-950 hover:bg-pink-50">
        Tiếp tục với Google
      </button>
      <div className="my-5 text-center text-sm text-rose-400">hoặc dùng email</div>
      <form onSubmit={onSubmit} className="space-y-4">
        <input name="email" type="email" required placeholder="ban@email.com" autoComplete="username" className={inputCls} />
        <input name="password" type="password" required placeholder="Mật khẩu" autoComplete="current-password" className={inputCls} />
        <div className="text-right text-sm">
          <Link href="/forgot-password" className="text-rose-600 hover:underline">Quên mật khẩu?</Link>
        </div>
        {error && <Notice kind="err">{error}</Notice>}
        {info && <Notice kind="ok">{info}</Notice>}
        {unverified && !info && (
          <button type="button" onClick={resend} className="w-full rounded-lg border border-pink-200 py-2.5 text-sm font-semibold text-rose-700 hover:bg-pink-50">
            Gửi lại email xác minh
          </button>
        )}
        <button disabled={loading} className={primaryCls}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-rose-900/70">
        Chưa có tài khoản? <Link href="/register" className="font-semibold text-rose-600 hover:underline">Đăng ký</Link>
      </p>
    </>
  );
}
