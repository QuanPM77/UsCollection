"use client";
import { useRef, useState } from "react";
import Link from "next/link";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, LockKeyhole, Phone } from "lucide-react";
import { Notice } from "@/components/AuthShell";
import { Capacitor } from "@capacitor/core";
import { rememberCheckout } from "@/lib/checkout-return";
import { loginWithPassword } from "./actions";

const inputClass = "min-h-12 w-full rounded-2xl border border-rose-900/15 bg-white/30 py-3 pl-12 text-base text-rose-950 outline-none transition placeholder:text-rose-950/70 focus:border-rose-600 focus:ring-1 focus:ring-rose-600";
const fieldIconClass = "pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-rose-900";
const focusClass = "focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700";

export default function LoginForm({ callbackUrl, initialPhone, googleEnabled, googleClientId }: { callbackUrl?: string; initialPhone?: string; googleEnabled: boolean; googleClientId?: string }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const inFlight = useRef(false);

  const afterGoogleLogin = callbackUrl?.startsWith("/checkout") ? "/post-login" : callbackUrl ?? "/post-login";

  function navigateAfterLogin() {
    router.replace(afterGoogleLogin);
    // Update the shared layout's login prompt and chat after authentication.
    router.refresh();
  }

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (inFlight.current) return;
    inFlight.current = true;
    let leaving = false;
    const f = new FormData(e.currentTarget);
    const phone = String(f.get("phone") ?? "").replace(/\s/g, "");
    setLoading(true); setError("");
    try {
      const res = await loginWithPassword(phone, String(f.get("password") ?? ""), callbackUrl);
      if (res?.code === "account_locked") return setError("Tài khoản của bạn đã bị quản trị viên khóa. Tài khoản sẽ không tự mở khóa; vui lòng liên hệ quản trị viên để được hỗ trợ.");
      const rateLimitSeconds = res?.code?.startsWith("rate_limited_") ? Number(res.code.slice("rate_limited_".length)) : 0;
      if (rateLimitSeconds > 0) {
        const duration = rateLimitSeconds >= 60
          ? `${Math.floor(rateLimitSeconds / 60)} phút${rateLimitSeconds % 60 ? ` ${rateLimitSeconds % 60} giây` : ""}`
          : `${rateLimitSeconds} giây`;
        return setError(`Bạn đã thử đăng nhập sai quá nhiều lần. Tạm khóa đăng nhập trong ${duration} nữa rồi thử lại.`);
      }
      if (res?.error) return setError("Số điện thoại hoặc mật khẩu không đúng. Vui lòng kiểm tra lại thông tin.");
      if (!res?.ok) throw new Error("Sign-in did not succeed");
      // The action sets the auth cookie and invalidates the shared layout cache.
      router.replace(res.destination ?? "/post-login");
      leaving = true;
    } catch {
      setError("Không thể đăng nhập lúc này. Vui lòng thử lại.");
    } finally {
      if (!leaving) {
        inFlight.current = false;
        setLoading(false);
      }
    }
  }

  async function onGoogleSignIn() {
    if (inFlight.current) return;
    inFlight.current = true;
    let leaving = false;
    setLoading(true);
    setError("");
    try {
      await rememberCheckout(callbackUrl);
      if (Capacitor.isNativePlatform()) {
        const { SocialLogin } = await import("@capgo/capacitor-social-login");
        if (!googleClientId) throw new Error("Thiếu cấu hình Google OAuth cho ứng dụng Android.");
        await SocialLogin.initialize({ google: { webClientId: googleClientId } });
        // Android Credential Manager already requests openid/email/profile by default.
        // Passing an explicit scopes list requires a custom MainActivity in this plugin.
        const result = await SocialLogin.login({ provider: "google", options: {} });
        if (result.provider !== "google" || result.result.responseType !== "online" || !result.result.idToken) {
          throw new Error("Google không trả về mã đăng nhập hợp lệ.");
        }
        const response = await signIn("google-native", { idToken: result.result.idToken, redirect: false });
        if (!response?.ok || response.error) throw new Error("Không thể xác minh tài khoản Google. Vui lòng thử lại.");
        navigateAfterLogin();
        leaving = true;
        return;
      }

      await signIn("google", { redirectTo: afterGoogleLogin });
      leaving = true;
    } catch (cause) {
      const message = cause instanceof Error ? cause.message : "Đăng nhập Google chưa hoàn tất. Vui lòng thử lại.";
      setError(message);
    } finally {
      if (!leaving) {
        inFlight.current = false;
        setLoading(false);
      }
    }
  }

  return (
    <>
      <form onSubmit={onSubmit} aria-busy={loading} className="space-y-4">
        <div className="relative">
          <Phone aria-hidden="true" className={fieldIconClass} />
          <input name="phone" type="tel" aria-label="Số điện thoại" required defaultValue={initialPhone} placeholder="Số điện thoại" autoComplete="username" className={`${inputClass} pr-4`} />
        </div>
        <div className="relative">
          <LockKeyhole aria-hidden="true" className={fieldIconClass} />
          <input name="password" type={showPassword ? "text" : "password"} aria-label="Mật khẩu" required autoFocus={Boolean(initialPhone)} placeholder="Mật khẩu" autoComplete="current-password" className={`${inputClass} pr-14`} />
          <button
            type="button"
            aria-label={showPassword ? "Ẩn mật khẩu" : "Hiện mật khẩu"}
            onClick={() => setShowPassword((visible) => !visible)}
            className={`absolute right-1 top-1/2 grid h-11 w-11 -translate-y-1/2 place-items-center rounded-xl text-rose-900 hover:bg-rose-100 ${focusClass}`}
          >
            {showPassword ? <EyeOff aria-hidden="true" className="h-5 w-5" /> : <Eye aria-hidden="true" className="h-5 w-5" />}
          </button>
        </div>
        <div className="text-right text-sm">
          <Link href="/forgot-password" className="font-semibold text-rose-700 hover:underline">Quên mật khẩu?</Link>
        </div>
        {error && <Notice kind="err">{error}</Notice>}
        <button type="submit" disabled={loading} className={`min-h-12 w-full rounded-2xl bg-[#b9385b] px-4 py-3 font-semibold text-white transition hover:bg-rose-800 disabled:opacity-60 ${focusClass}`}>{loading ? "Đang đăng nhập..." : "Đăng nhập"}</button>
      </form>
      <p className="mt-4 text-center text-sm">
        Chưa có tài khoản? <Link href={callbackUrl ? `/register?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/register"} className="font-semibold text-rose-700 hover:underline">Đăng ký</Link>
      </p>
      {googleEnabled && (
        <>
          <div className="my-4 flex items-center gap-4 text-sm text-rose-950/80"><span className="h-px flex-1 bg-rose-900/15" />hoặc<span className="h-px flex-1 bg-rose-900/15" /></div>
          <button type="button" disabled={loading} onClick={onGoogleSignIn} className={`flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-rose-900/15 bg-white/35 px-4 py-3 text-sm font-semibold text-rose-950 transition hover:bg-white disabled:opacity-60 ${focusClass}`}>
            <svg aria-hidden="true" viewBox="0 0 48 48" className="h-5 w-5"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5Z" transform="translate(0 4)"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.25 5.48-4.73 7.18l7.64 5.92c4.46-4.12 7.13-10.2 7.13-17.57Z"/><path fill="#FBBC05" d="M10.53 28.59a14.4 14.4 0 0 1 0-9.18l-7.98-6.19a23.9 23.9 0 0 0 0 21.56l7.98-6.19Z" transform="translate(0 4)"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.9-5.88l-7.64-5.92c-2.12 1.42-4.84 2.26-8.26 2.26-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48Z" transform="translate(0 -4)"/></svg>
            Đăng nhập bằng Google
          </button>
        </>
      )}
    </>
  );
}
