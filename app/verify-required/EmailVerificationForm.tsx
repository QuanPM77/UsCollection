"use client";
import { useActionState } from "react";
import Link from "next/link";
import { AuthShell, Notice, primaryCls } from "@/components/AuthShell";
import { requestVerificationEmail } from "./actions";

export default function EmailVerificationForm({ email }: { email: string }) {
  const [state, action, pending] = useActionState(requestVerificationEmail, undefined);
  return (
    <AuthShell title="Xác minh email">
      <p className="mb-5 text-sm leading-6 text-rose-900/70">Nhập email của bạn để nhận liên kết xác minh. Bạn cần xác minh email trước khi vào trang chính.</p>
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-pink-text">Email *</label>
          <input id="email" name="email" type="email" required defaultValue={email} autoComplete="email" placeholder="ban@email.com" className="w-full rounded-xl border border-pink-mid/40 bg-white px-4 py-3 text-sm text-pink-text outline-none placeholder:text-pink-text/35 focus:border-pink-deep focus:ring-2 focus:ring-pink-mid/30" />
        </div>
        {state?.error && <Notice kind="err">{state.error}</Notice>}
        {state?.ok && <Notice kind="ok">Đã gửi email xác minh. Nếu chưa thấy thư, kiểm tra mục thư rác hoặc gửi lại sau.</Notice>}
        <button disabled={pending} className={primaryCls}>{pending ? "Đang gửi..." : email || state?.ok ? "Gửi lại email xác minh" : "Gửi email xác minh"}</button>
      </form>
      <Link href="/complete-profile" className="mt-4 block w-full rounded-xl border border-pink-mid/50 bg-white px-5 py-3 text-center text-sm font-semibold text-pink-deep transition hover:bg-pink-light">
        Quay lại sửa thông tin
      </Link>
    </AuthShell>
  );
}
