import { AuthShell, Notice } from "@/components/AuthShell";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ registered?: string; reset?: string; expired?: string; callbackUrl?: string; phone?: string; error?: string; forgot?: string }> }) {
  const [sp, session] = await Promise.all([searchParams, auth()]);
  const callbackUrl = sp.callbackUrl?.startsWith("/") && !sp.callbackUrl.startsWith("//") ? sp.callbackUrl : undefined;
  if (session?.user) redirect(callbackUrl ?? "/post-login");
  return (
    <AuthShell title="Đăng nhập" subtitle="Đăng nhập bằng số điện thoại và mật khẩu">
      {sp.registered && <div className="mb-4"><Notice kind="ok">Đăng ký thành công. Bạn có thể đăng nhập bằng số điện thoại và mật khẩu.</Notice></div>}
      {sp.reset && <div className="mb-4"><Notice kind="ok">Đã đổi mật khẩu. Hãy đăng nhập lại.</Notice></div>}
      {sp.forgot === "not-found" && <div className="mb-4"><Notice kind="err">Email này chưa được đăng ký. Vui lòng tạo tài khoản trước khi đăng nhập.</Notice></div>}
      {sp.forgot === "google" && <div className="mb-4"><Notice kind="ok">Tài khoản này đăng nhập bằng Google và không có mật khẩu riêng. Hãy chọn “Đăng nhập bằng Google”.</Notice></div>}
      {sp.forgot === "locked" && <div className="mb-4"><Notice kind="err">Tài khoản đang bị khóa nên không thể đặt lại mật khẩu. Vui lòng liên hệ quản trị viên.</Notice></div>}
      {sp.expired && <div className="mb-4"><Notice kind="err">Phiên đăng nhập đã hết hạn do không hoạt động. Vui lòng đăng nhập lại.</Notice></div>}
      {sp.error === "AccessDenied" && <div className="mb-4"><Notice kind="err">Không thể đăng nhập bằng tài khoản Google này. Hãy dùng email Google đã xác minh và tài khoản đang hoạt động; tài khoản bị khóa không thể đăng nhập.</Notice></div>}
      {sp.error === "GoogleEmailMissing" && <div className="mb-4"><Notice kind="err">Google không trả về địa chỉ email cho tài khoản này. Hãy chọn tài khoản Google có email.</Notice></div>}
      {sp.error === "GoogleEmailUnverified" && <div className="mb-4"><Notice kind="err">Google chưa xác nhận email của tài khoản này. Hãy xác minh email trong tài khoản Google rồi thử lại.</Notice></div>}
      {sp.error === "GoogleAccountLocked" && <div className="mb-4"><Notice kind="err">Tài khoản ứng dụng đang bị khóa. Vui lòng liên hệ quản trị viên để được hỗ trợ.</Notice></div>}
      {sp.error && !["AccessDenied", "GoogleEmailMissing", "GoogleEmailUnverified", "GoogleAccountLocked"].includes(sp.error) && <div className="mb-4"><Notice kind="err">Đăng nhập Google chưa hoàn tất. Vui lòng thử lại; nếu lỗi tiếp diễn, hãy kiểm tra cấu hình OAuth và callback URL.</Notice></div>}
      <LoginForm callbackUrl={callbackUrl} initialPhone={sp.registered ? sp.phone : undefined} googleEnabled={googleEnabled} />
    </AuthShell>
  );
}
