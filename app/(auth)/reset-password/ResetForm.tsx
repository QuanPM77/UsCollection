"use client";
import { useActionState } from "react";
import { Notice, inputCls, primaryCls } from "@/components/AuthShell";
import { resetPassword } from "./actions";

export default function ResetForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(resetPassword, undefined);
  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <input name="password" type="password" required minLength={8} placeholder="Mật khẩu mới (ít nhất 8 ký tự)" autoComplete="new-password" className={inputCls} />
      <input name="confirm" type="password" required placeholder="Nhập lại mật khẩu mới" autoComplete="new-password" className={inputCls} />
      {state?.error && <Notice kind="err">{state.error}</Notice>}
      <button disabled={pending} className={primaryCls}>{pending ? "Đang lưu..." : "Đổi mật khẩu"}</button>
    </form>
  );
}
