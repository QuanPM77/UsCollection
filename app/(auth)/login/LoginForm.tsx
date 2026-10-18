"use client";
import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { inputCls, primaryCls, Notice } from "@/components/AuthShell";

export default function LoginForm({ callbackUrl, initialPhone }: { callbackUrl?: string; initialPhone?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone") ?? "").replace(/\s/g, "");
    setLoading(true); setError("");
    const res = await signIn("credentials", { phone, password: f.get("password"), redirect: false });
    setLoading(false);
    if (res?.code === "account_locked") return setError("Tài khoản của bạn đã bị quản trị viên khóa. Tài khoản sẽ không tự mở khóa; vui lòng liên hệ quản trị viên để được hỗ trợ.");
    const rateLimitSeconds = res?.code?.startsWith("rate_limited_") ? Number(res.code.slice("rate_limited_".length)) : 0;
    if (rateLimitSeconds > 0) {
      const duration = rateLimitSeconds >= 60
        ? `${Math.floor(rateLimitSeconds / 60)} phút${rateLimitSeconds % 60 ? ` ${rateLimitSeconds % 60} giây` : ""}`
        : `${rateLimitSeconds} giây`;
      return setError(`Bạn đã thử đăng nhập sai quá nhiều lần. Tạm khóa đăng nhập trong ${duration} nữa rồi thử lại.`);
    }
    if (res?.error) return setError("Số điện thoại hoặc mật khẩu không đúng. Vui lòng kiểm tra lại thông tin.");
    router.push(callbackUrl ?? "/post-login");
    router.refresh();
  }

  return (
    <>
      <form onSubmit={onSubmit} className="space-y-4">
        <input name="phone" type="tel" required defaultValue={initialPhone} placeholder="Số điện thoại" autoComplete="username" className={inputCls} />
        <input name="password" type="password" required autoFocus placeholder="Mật khẩu" autoComplete="current-password" className={inputCls} />
        <div className="text-right text-sm">
          <Link href="/forgot-password" className="text-rose-600 hover:underline">Quên mật khẩu?</Link>
        </div>
        {error && <Notice kind="err">{error}</Notice>}
        <button disabled={loading} className={primaryCls}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-rose-900/70">
        Chưa có tài khoản? <Link href="/register" className="font-semibold text-rose-600 hover:underline">Đăng ký</Link>
      </p>
    </>
  );
}
