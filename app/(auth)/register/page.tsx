"use client";
import Link from "next/link";
import { useActionState } from "react";
import { AuthShell, Notice, inputCls, primaryCls } from "@/components/AuthShell";
import { registerUser } from "./actions";

export default function RegisterPage() {
  const [state, action, pending] = useActionState(registerUser, undefined);
  return (
    <AuthShell title="Tạo tài khoản">
      <form action={action} className="space-y-4">
        <input name="phone" type="tel" required pattern="(0|\+84)[0-9]{8,10}" title="Nhập số Việt Nam, ví dụ 0912345678" placeholder="Số điện thoại" autoComplete="tel" className={inputCls} />
        <input name="password" type="password" required minLength={8} placeholder="Mật khẩu (ít nhất 8 ký tự)" autoComplete="new-password" className={inputCls} />
        <input name="confirm" type="password" required placeholder="Nhập lại mật khẩu" autoComplete="new-password" className={inputCls} />
        {state?.error && <Notice kind="err">{state.error}</Notice>}
        <button disabled={pending} className={primaryCls}>{pending ? "Đang tạo..." : "Đăng ký"}</button>
      </form>
      <p className="mt-6 text-center text-sm text-rose-900/70">
        Đã có tài khoản? <Link href="/login" className="font-semibold text-rose-600 hover:underline">Đăng nhập</Link>
      </p>
    </AuthShell>
  );
}
