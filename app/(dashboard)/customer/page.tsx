import Link from "next/link";
import { auth, signOut } from "@/auth";
import { prisma } from "@/lib/prisma";
import MainMenu from "@/components/MainMenu";
import AvatarEditor from "./AvatarEditor";
import { avatarDisplayUrl } from "@/lib/supabase-storage";
import { addAddress, changePassword, deleteAddress, updateProfile } from "./actions";

const inputClass = "w-full rounded-xl border border-pink-mid/40 bg-white px-4 py-3 text-sm text-pink-text outline-none transition placeholder:text-pink-text/35 focus:border-pink-deep focus:ring-2 focus:ring-pink-mid/30";
const labelClass = "mb-1.5 block text-xs font-semibold text-pink-text";
const buttonClass = "rounded-xl bg-pink-deep px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-text";

const savedMessages: Record<string, string> = {
  profile: "Thông tin cá nhân đã được lưu.",
  "password-changed": "Mật khẩu đã được thay đổi.",
  "avatar-saved": "Ảnh đại diện đã được lưu.",
  "avatar-deleted": "Đã xóa ảnh đại diện.",
  "address-added": "Đã thêm địa chỉ giao hàng.",
  "address-updated": "Đã cập nhật địa chỉ.",
  "address-deleted": "Đã xóa địa chỉ.",
};

const passwordErrors: Record<string, string> = {
  incorrect: "Mật khẩu hiện tại không đúng. Mật khẩu chưa được thay đổi.",
  "too-short": "Mật khẩu mới cần có ít nhất 8 ký tự.",
  mismatch: "Mật khẩu mới và phần nhập lại không khớp.",
};

export default async function CustomerPage({
  searchParams,
}: {
  searchParams: Promise<{ saved?: string; passwordError?: string }>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  if (!session?.user.id) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: { addresses: { orderBy: [{ isDefault: "desc" }, { createdAt: "asc" }] } },
  });
  if (!user) return null;

  const passwordError = params.passwordError ? passwordErrors[params.passwordError] : undefined;
  const savedMessage = !passwordError && params.saved ? savedMessages[params.saved] : undefined;
  const dateFormatter = new Intl.DateTimeFormat("vi-VN", { dateStyle: "long" });

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-light via-cream to-white text-pink-text">
      <header className="border-b border-pink-mid/25 bg-white/70 backdrop-blur">
        <div className="flex w-full items-center gap-4 px-4 py-4 sm:px-8 lg:px-12">
          <MainMenu />
          <Link href="/" className="font-display text-xl font-bold">UsStory</Link>
          <form className="ml-auto" action={async () => { "use server"; await signOut({ redirectTo: "/" }); }}>
            <button className="rounded-xl border border-pink-mid/40 bg-white px-4 py-2.5 text-sm font-medium text-pink-deep transition hover:bg-pink-light">
              Đăng xuất
            </button>
          </form>
        </div>
      </header>

      <div className="w-full px-4 py-6 sm:px-8 sm:py-8 lg:px-12">
        <div className="mb-8">
          <p className="text-sm font-medium text-pink-deep">Tài khoản của tôi</p>
          <h1 className="mt-1 font-display text-3xl font-bold">Thông tin cá nhân</h1>
        </div>

        {savedMessage && (
          <p role="status" className="mb-6 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {savedMessage}
          </p>
        )}
        {passwordError && (
          <p role="alert" className="mb-6 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
            {passwordError}
          </p>
        )}

        <section className="rounded-3xl border border-pink-mid/25 bg-white/85 p-5 shadow-sm sm:p-8">
          <div className="grid gap-8 xl:grid-cols-[minmax(0,0.9fr)_minmax(0,1.1fr)]">
          <div className="min-w-0">
          <div className="mb-6">
            <h2 className="text-lg font-bold">Hồ sơ tài khoản</h2>
          </div>

          <div className="mb-6">
            <AvatarEditor key={user.updatedAt.getTime()} avatarUrl={await avatarDisplayUrl(user.avatarUrl)} />
          </div>

          <form id="profile-form" action={updateProfile} className="grid gap-5 sm:grid-cols-2">
            <div>
              <label className={labelClass} htmlFor="phone">Số điện thoại đăng ký</label>
              <input id="phone" type="tel" value={user.phone ?? ""} readOnly className={`${inputClass} cursor-not-allowed bg-pink-light/60`} />
              <p className="mt-1 text-xs text-pink-text/55">Số điện thoại dùng để đăng nhập và không thể thay đổi.</p>
            </div>
            <div>
              <label className={labelClass} htmlFor="fullName">Họ và tên *</label>
              <input id="fullName" name="fullName" required minLength={2} maxLength={100} defaultValue={user.fullName ?? ""} className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="email">Email (không bắt buộc)</label>
              <input id="email" name="profileEmail" type="email" defaultValue={user.email ?? ""} autoComplete="off" spellCheck={false} className={inputClass} />
            </div>
            <div className="grid gap-3 rounded-2xl bg-pink-light/60 p-4 text-sm sm:col-span-2 sm:grid-cols-3">
              <p><span className="block text-xs text-pink-text/55">Trạng thái tài khoản</span><strong>{user.status === "active" ? "Đang hoạt động" : "Đã khóa"}</strong></p>
              <p><span className="block text-xs text-pink-text/55">Ngày tạo tài khoản</span><strong>{dateFormatter.format(user.createdAt)}</strong></p>
              <p><span className="block text-xs text-pink-text/55">Đăng nhập gần nhất</span><strong>{user.lastLoginAt ? dateFormatter.format(user.lastLoginAt) : "Chưa có"}</strong></p>
            </div>

          </form>
          </div>

        <div className="min-w-0 border-t border-pink-mid/25 pt-7 xl:mt-0 xl:border-l xl:border-t-0 xl:pl-8 xl:pt-0">
          <div className="mb-6">
            <h2 className="text-lg font-bold">Địa chỉ giao hàng</h2>
          </div>

          {user.addresses.length > 0 ? (
            <div className="space-y-4">
              {user.addresses.map((address) => (
                <article key={address.id} className="rounded-2xl border border-pink-mid/25 bg-white p-4 sm:p-5">
                  <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
                    <h3 className="font-semibold">Địa chỉ {address.isDefault && <span className="ml-2 rounded-full bg-pink-light px-2.5 py-1 text-xs font-medium text-pink-deep">Mặc định</span>}</h3>
                  <form action={deleteAddress}>
                      <input type="hidden" name="id" value={address.id} />
                      <button className="text-xs font-medium text-rose-600 hover:underline">Xóa địa chỉ</button>
                    </form>
                  </div>
                  <p className="mb-4 text-xs text-pink-text/60">
                    Người nhận: {address.recipientName} · {address.phone || "Chưa có số điện thoại trong hồ sơ"}
                  </p>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="sm:col-span-2">
                      <label className={labelClass} htmlFor={`line-${address.id}`}>Địa chỉ chi tiết *</label>
                      <input form="profile-form" id={`line-${address.id}`} name={`addressLine_${address.id}`} required minLength={8} defaultValue={address.addressLine} className={inputClass} />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor={`province-${address.id}`}>Tỉnh / thành phố</label>
                      <input form="profile-form" id={`province-${address.id}`} name={`province_${address.id}`} defaultValue={address.province ?? ""} className={inputClass} />
                    </div>
                    {user.addresses.length > 1 && !address.isDefault && (
                      <label className="flex items-center gap-2 self-center text-sm text-pink-text/80">
                        <input form="profile-form" type="checkbox" name="defaultAddressId" value={address.id} className="h-4 w-4 accent-pink-deep" />
                        Đặt làm địa chỉ mặc định
                      </label>
                    )}
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <p className="mb-5 rounded-2xl bg-pink-light/60 p-4 text-sm text-pink-text/65">Bạn chưa lưu địa chỉ giao hàng nào.</p>
          )}

          <details className="mt-5 rounded-2xl border border-dashed border-pink-mid/60 p-4 sm:p-5">
            <summary className="cursor-pointer font-semibold text-pink-deep">Thêm địa chỉ mới</summary>
            <form action={addAddress} className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <label className={labelClass} htmlFor="new-address">Địa chỉ chi tiết *</label>
                <input id="new-address" name="addressLine" required minLength={8} className={inputClass} />
              </div>
              <div>
                <label className={labelClass} htmlFor="new-province">Tỉnh / thành phố</label>
                <input id="new-province" name="province" className={inputClass} />
              </div>
              <label className="flex items-center gap-2 self-center text-sm text-pink-text/80">
                <input type="checkbox" name="isDefault" className="h-4 w-4 accent-pink-deep" />
                Đặt làm địa chỉ mặc định
              </label>
              <div className="sm:col-span-2">
                <button className={buttonClass}>Thêm địa chỉ</button>
              </div>
            </form>
          </details>
        </div>
        </div>

        <details className="mt-7 border-t border-pink-mid/25 pt-6">
          <summary className="cursor-pointer font-semibold text-pink-deep">Đổi mật khẩu</summary>
          <form action={changePassword} className="mt-5 grid gap-4 sm:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="currentPassword">Mật khẩu hiện tại *</label>
              <input id="currentPassword" name="currentPassword" type="password" required autoComplete="current-password" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="newPassword">Mật khẩu mới *</label>
              <input id="newPassword" name="newPassword" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="confirmPassword">Nhập lại mật khẩu mới *</label>
              <input id="confirmPassword" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className={inputClass} />
            </div>
            <div className="sm:col-span-3">
              <button className={buttonClass}>Cập nhật mật khẩu</button>
            </div>
          </form>
        </details>

        <div className="mt-6 flex justify-end">
          <button form="profile-form" className={buttonClass}>Lưu thông tin</button>
        </div>
        </section>
      </div>
    </main>
  );
}
