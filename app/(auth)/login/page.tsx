import { AuthShell, Notice } from "@/components/AuthShell";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ registered?: string; reset?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Đăng nhập" subtitle="Nhập thông tin tài khoản của bạn">
      {sp.registered && <div className="mb-4"><Notice kind="ok">Đăng ký thành công. Hãy mở email để xác minh trước khi đăng nhập.</Notice></div>}
      {sp.reset && <div className="mb-4"><Notice kind="ok">Đã đổi mật khẩu. Hãy đăng nhập lại.</Notice></div>}
      <LoginForm />
    </AuthShell>
  );
}
