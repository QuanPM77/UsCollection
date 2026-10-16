import { AuthShell, Notice } from "@/components/AuthShell";
import LoginForm from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ registered?: string; reset?: string; expired?: string }> }) {
  const sp = await searchParams;
  return (
    <AuthShell title="Đăng nhập" subtitle="Đăng nhập bằng số điện thoại và mật khẩu">
      {sp.registered && <div className="mb-4"><Notice kind="ok">Đăng ký thành công. Bạn có thể đăng nhập bằng số điện thoại và mật khẩu.</Notice></div>}
      {sp.reset && <div className="mb-4"><Notice kind="ok">Đã đổi mật khẩu. Hãy đăng nhập lại.</Notice></div>}
      {sp.expired && <div className="mb-4"><Notice kind="err">Phiên đăng nhập đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.</Notice></div>}
      <LoginForm />
    </AuthShell>
  );
}
