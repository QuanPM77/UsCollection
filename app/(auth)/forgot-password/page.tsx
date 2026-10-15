"use client";
import Link from "next/link";
import { useActionState } from "react";
import { AuthShell, Notice, inputCls, primaryCls } from "@/components/AuthShell";
import { requestReset } from "./actions";

export default function ForgotPage() {
  const [state, action, pending] = useActionState(requestReset, undefined);
  return (
    <AuthShell title="Quên mật khẩu" subtitle="Chúng tôi sẽ gửi liên kết đặt lại mật khẩu qua email">
      {state?.ok ? (
        <Notice kind="ok">Nếu email này có tài khoản, liên kết đặt lại mật khẩu đã được gửi. Liên kết có hiệu lực 30 phút.</Notice>
      ) : (
        <form action={action} className="space-y-4">
          <input name="email" type="email" required placeholder="ban@email.com" autoComplete="email" className={inputCls} />
          {state?.error && <Notice kind="err">{state.error}</Notice>}
          <button disabled={pending} className={primaryCls}>{pending ? "Đang gửi..." : "Gửi liên kết"}</button>
        </form>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="text-rose-600 hover:underline">Quay lại đăng nhập</Link>
      </p>
    </AuthShell>
  );
}
