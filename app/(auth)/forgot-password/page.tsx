"use client";
import Link from "next/link";
import { useActionState } from "react";
import { Notice } from "@/components/AuthShell";
import { Mail } from "lucide-react";
import AuthPhotoShell, { authIconClass, authInputClass, authPrimaryClass } from "@/components/AuthPhotoShell";
import { requestReset } from "./actions";

export default function ForgotPage() {
  const [state, action, pending] = useActionState(requestReset, undefined);
  return (
    <AuthPhotoShell title="Quên mật khẩu" subtitle="Nhập email đã đăng ký để nhận liên kết đặt lại mật khẩu">
      {state?.ok ? (
        <Notice kind="ok">Nếu email này thuộc tài khoản có thể đặt lại mật khẩu, hướng dẫn sẽ được gửi. Vui lòng kiểm tra hộp thư đến và thư rác.</Notice>
      ) : (
        <form action={action} aria-busy={pending} className="space-y-4">
          <div className="relative">
            <Mail aria-hidden="true" className={authIconClass} />
            <input name="email" type="email" aria-label="Email đã đăng ký" required placeholder="Email đã đăng ký" autoComplete="email" className={authInputClass} />
          </div>
          {state?.error && <Notice kind="err">{state.error}</Notice>}
          <button disabled={pending} className={authPrimaryClass}>{pending ? "Đang kiểm tra..." : "Gửi liên kết"}</button>
        </form>
      )}
      <p className="mt-4 text-center text-sm">
        <Link href="/login" className="font-semibold text-rose-700 hover:underline">Quay lại đăng nhập</Link>
      </p>
    </AuthPhotoShell>
  );
}
