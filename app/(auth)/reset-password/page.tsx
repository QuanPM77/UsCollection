import Link from "next/link";
import { AuthShell, Notice } from "@/components/AuthShell";
import ResetForm from "./ResetForm";

export default async function ResetPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  return (
    <AuthShell title="Đặt mật khẩu mới">
      {token ? (
        <ResetForm token={token} />
      ) : (
        <>
          <Notice kind="err">Thiếu mã đặt lại. Hãy mở liên kết trong email, hoặc yêu cầu liên kết mới.</Notice>
          <p className="mt-6 text-center text-sm"><Link href="/forgot-password" className="text-rose-600 hover:underline">Yêu cầu liên kết mới</Link></p>
        </>
      )}
    </AuthShell>
  );
}
