import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hashToken } from "@/lib/token";
import { AuthShell, Notice } from "@/components/AuthShell";

export default async function VerifyEmailPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token } = await searchParams;
  let ok = false;
  if (token) {
    const rec = await prisma.emailVerificationToken.findUnique({ where: { tokenHash: hashToken(token) } });
    if (rec && rec.expiresAt > new Date()) {
      // Idempotent: quét link lần hai (hoặc bot email mở trước) vẫn không hỏng
      await prisma.user.updateMany({ where: { id: rec.userId, emailVerifiedAt: null }, data: { emailVerifiedAt: new Date() } });
      ok = true;
    }
  }
  return (
    <AuthShell title="Xác minh email">
      {ok ? (
        <Notice kind="ok">Email đã được xác minh. Bạn có thể đăng nhập.</Notice>
      ) : (
        <Notice kind="err">Liên kết không hợp lệ hoặc đã hết hạn. Hãy đăng nhập để nhận lại email xác minh.</Notice>
      )}
      <p className="mt-6 text-center text-sm">
        <Link href="/login" className="font-semibold text-rose-600 hover:underline">Đến trang đăng nhập</Link>
      </p>
    </AuthShell>
  );
}
