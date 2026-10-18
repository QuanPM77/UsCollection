"use client";
import Link from "next/link";
import { useActionState, useState } from "react";
import { AuthShell, Notice, primaryCls } from "@/components/AuthShell";
import { requestEmailChange } from "./actions";

export default function ChangeEmailForm({ currentEmail }: { currentEmail: string }) {
  const [state, action, pending] = useActionState(requestEmailChange, undefined);
  const [email, setEmail] = useState("");
  return (
    <AuthShell title="Đổi email">
      <p className="mb-5 text-sm leading-6 text-rose-900/70">
        Email hiện tại: <strong>{currentEmail || "Chưa có"}</strong>. Nhập email mới và xác minh liên kết được gửi đến địa chỉ đó. Email tài khoản chỉ đổi sau khi xác minh thành công.
      </p>
      <form action={action} className="space-y-4">
        <div>
          <label htmlFor="new-email" className="mb-1.5 block text-xs font-semibold text-pink-text">Email mới *</label>
          <input id="new-email" name="email" type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="ban@email.com" className="w-full rounded-xl border border-pink-mid/40 bg-white px-4 py-3 text-sm text-pink-text outline-none placeholder:text-pink-text/35 focus:border-pink-deep focus:ring-2 focus:ring-pink-mid/30" />
        </div>
        {state?.error && <Notice kind="err">{state.error}</Notice>}
        {state?.ok && <Notice kind="ok">Đã gửi liên kết xác minh đến email mới. Email tài khoản sẽ cập nhật sau khi bạn bấm liên kết đó.</Notice>}
        <button disabled={pending} className={primaryCls}>{pending ? "Đang gửi..." : state?.ok ? "Gửi lại liên kết xác minh" : "Gửi liên kết xác minh"}</button>
      </form>
      <Link href="/customer" className="mt-4 block text-center text-sm font-semibold text-rose-600 hover:underline">Quay lại thông tin tài khoản</Link>
    </AuthShell>
  );
}
