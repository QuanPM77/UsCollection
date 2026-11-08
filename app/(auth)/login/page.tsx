import loginBackground from "@/public/images/login-bracelet.webp";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Notice } from "@/components/AuthShell";
import BrandLogo from "@/components/BrandLogo";
import { getSession as auth } from "@/lib/auth-session";
import { safeCallbackUrl } from "@/lib/auth-destination";
import { redirect } from "next/navigation";
import LoginForm from "./LoginForm";

const googleEnabled = Boolean(process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET);

export default async function LoginPage({
  searchParams,
}: { searchParams: Promise<{ registered?: string; reset?: string; expired?: string; callbackUrl?: string; phone?: string; error?: string; forgot?: string }> }) {
  const [sp, session] = await Promise.all([searchParams, auth()]);
  const callbackUrl = safeCallbackUrl(sp.callbackUrl);
  if (session?.user) redirect(callbackUrl ?? session.user.destination);
  return (
    <main
      className="grid h-dvh grid-rows-[auto_minmax(0,1fr)] gap-3 overflow-hidden bg-pink-light bg-cover bg-[position:45%_center] px-4 py-3 text-rose-950 sm:px-8 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,34%)] lg:grid-rows-[minmax(0,1fr)] lg:items-center lg:gap-8 lg:bg-center lg:px-[4vw] lg:py-[clamp(1rem,3vh,2.5rem)]"
      style={{ backgroundImage: `url("${loginBackground.src}")` }}
    >
      <div className="flex min-h-0 flex-col items-center lg:h-full lg:items-start lg:pl-[1vw]">
        <Link href="/" aria-label="UsStory – về trang chủ" className="rounded-lg transition hover:opacity-80 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-rose-700">
          <BrandLogo
            className="w-32 lg:w-48"
            sizes="(max-width: 1023px) 128px, 192px"
          />
        </Link>
        <p className="mt-[clamp(4rem,14vh,9rem)] hidden font-display text-[clamp(1.65rem,2.8vw,3.25rem)] font-semibold italic leading-tight lg:block">
          Chào mừng bạn đến với
          <span className="mt-1 block text-[clamp(3.75rem,6vw,7rem)] leading-none text-rose-700">UsStory</span>
        </p>
      </div>
      <section aria-labelledby="login-title" className="mx-auto min-h-0 max-h-full w-full max-w-lg self-center overflow-y-auto rounded-[2rem] border border-white/80 bg-[#fff5f6]/90 p-5 shadow-[0_20px_60px_rgba(127,29,57,0.15)] backdrop-blur-sm sm:p-6 lg:max-w-none xl:p-[clamp(1.25rem,3vh,2.5rem)]">
        <h1 id="login-title" className="font-display text-3xl font-bold sm:text-4xl">Đăng nhập</h1>
        <p className="mt-2 text-sm text-rose-950/85 sm:text-base">Đăng nhập bằng số điện thoại và mật khẩu</p>
        <div className="mt-4">
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
          <LoginForm callbackUrl={callbackUrl} initialPhone={sp.registered ? sp.phone : undefined} googleEnabled={googleEnabled} googleClientId={process.env.AUTH_GOOGLE_ID} />
          <Link
            href="/"
            className="mt-4 inline-flex min-h-12 w-full items-center justify-center gap-3 rounded-2xl border border-rose-900/15 bg-white/35 px-4 py-3 text-sm font-semibold text-rose-950 transition hover:bg-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-700"
          >
            <ArrowLeft aria-hidden="true" className="h-5 w-5" />
            Quay về trang chủ
          </Link>
        </div>
      </section>
    </main>
  );
}
