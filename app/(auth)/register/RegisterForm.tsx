"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Notice } from "@/components/AuthShell";
import { Phone, LockKeyhole, ShieldCheck } from "lucide-react";
import AuthPhotoShell, { authIconClass, authInputClass, authPrimaryClass } from "@/components/AuthPhotoShell";
import { registerUser } from "./actions";

export default function RegisterForm({ callbackUrl }: { callbackUrl?: string }) {
  const [state, action, pending] = useActionState(registerUser, undefined);
  return (
    <AuthPhotoShell title="Tạo tài khoản" subtitle="Bắt đầu câu chuyện của bạn cùng UsStory">
      <form action={action} aria-busy={pending} className="space-y-4">
        <input type="hidden" name="callbackUrl" value={callbackUrl ?? ""} />
        <div className="relative">
          <Phone aria-hidden="true" className={authIconClass} />
          <input name="phone" type="tel" aria-label="Số điện thoại" required pattern="(0|\+84)[0-9]{8,10}" title="Nhập số Việt Nam, ví dụ 0912345678" placeholder="Số điện thoại" autoComplete="tel" className={authInputClass} />
        </div>
        <div className="relative">
          <LockKeyhole aria-hidden="true" className={authIconClass} />
          <input name="password" type="password" aria-label="Mật khẩu" required minLength={8} placeholder="Mật khẩu (ít nhất 8 ký tự)" autoComplete="new-password" className={authInputClass} />
        </div>
        <div className="relative">
          <ShieldCheck aria-hidden="true" className={authIconClass} />
          <input name="confirm" type="password" aria-label="Nhập lại mật khẩu" required placeholder="Nhập lại mật khẩu" autoComplete="new-password" className={authInputClass} />
        </div>
        {state?.error && <Notice kind="err">{state.error}</Notice>}
        <button disabled={pending} className={authPrimaryClass}>{pending ? "Đang tạo..." : "Đăng ký"}</button>
      </form>
      <p className="mt-4 text-center text-sm">
        Đã có tài khoản? <Link href={callbackUrl ? `/login?callbackUrl=${encodeURIComponent(callbackUrl)}` : "/login"} className="font-semibold text-rose-700 hover:underline">Đăng nhập</Link>
      </p>
    </AuthPhotoShell>
  );
}
