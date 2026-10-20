"use client";
import { useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { inputCls, primaryCls, Notice } from "@/components/AuthShell";

export default function LoginForm({ callbackUrl, initialPhone, googleEnabled }: { callbackUrl?: string; initialPhone?: string; googleEnabled: boolean }) {
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
      {googleEnabled && (
        <>
          <div className="my-5 flex items-center gap-3 text-xs text-rose-900/50"><span className="h-px flex-1 bg-pink-mid/40" />hoặc<span className="h-px flex-1 bg-pink-mid/40" /></div>
          <button type="button" onClick={() => signIn("google", { callbackUrl: callbackUrl ?? "/post-login" })} className="flex w-full items-center justify-center gap-3 rounded-xl border border-pink-mid/40 bg-white px-5 py-3 text-sm font-semibold text-pink-text transition hover:bg-pink-light">
            <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.73 7.18l7.64 5.92c4.46-4.12 7.13-10.2 7.13-17.57Z"/><path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 4)"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.88l-7.64-5.92c-2.12 1.42-4.84 2.26-8.26 2.26-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -4)"/></svg>
            Đăng nhập bằng Google
          </button>
        </>
      )}
      <p className="mt-6 text-center text-sm text-rose-900/70">
        Chưa có tài khoản? <Link href="/register" className="font-semibold text-rose-600 hover:underline">Đăng ký</Link>
      </p>
    </>
  );
}
