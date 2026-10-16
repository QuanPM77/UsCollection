import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AuthShell } from "@/components/AuthShell";
import { completeProfile } from "./actions";

const fieldClass = "w-full rounded-xl border border-pink-mid/40 bg-white px-4 py-3 text-sm text-pink-text outline-none placeholder:text-pink-text/35 focus:border-pink-deep focus:ring-2 focus:ring-pink-mid/30";

export default async function CompleteProfilePage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");
  if (session.user.role !== "customer") redirect("/post-login");
  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { fullName: true, phone: true, email: true, profileCompletedAt: true } });
  if (!user) redirect("/login");
  if (user.profileCompletedAt) redirect("/customer");

  return (
    <AuthShell title="Hoàn thiện thông tin cá nhân">
      <p className="mb-6 text-sm leading-6 text-rose-900/70">Vui lòng điền đầy đủ thông tin để tiếp tục sử dụng tài khoản và giao hàng chính xác.</p>
      <form action={completeProfile} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="mb-1.5 block text-xs font-semibold text-pink-text">Họ và tên *</label>
          <input id="fullName" name="fullName" required minLength={2} maxLength={100} defaultValue={user.fullName ?? ""} autoComplete="name" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="email" className="mb-1.5 block text-xs font-semibold text-pink-text">Email (không bắt buộc)</label>
          <input id="email" name="email" type="email" defaultValue={user.email ?? ""} autoComplete="email" placeholder="ban@email.com" className={fieldClass} />
          <p className="mt-1 text-xs text-pink-text/60">Email giúp bạn nhận liên kết đặt lại mật khẩu khi cần.</p>
        </div>
        <p className="text-sm text-pink-text/70">Số điện thoại đăng nhập: <strong>{user.phone}</strong></p>
        <div>
          <label htmlFor="addressLine" className="mb-1.5 block text-xs font-semibold text-pink-text">Địa chỉ giao hàng *</label>
          <input id="addressLine" name="addressLine" required minLength={8} autoComplete="street-address" placeholder="Số nhà, đường, phường/xã, quận/huyện" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="province" className="mb-1.5 block text-xs font-semibold text-pink-text">Tỉnh / thành phố *</label>
          <input id="province" name="province" required autoComplete="address-level1" className={fieldClass} />
        </div>
        <button className="w-full rounded-xl bg-pink-deep px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-text">Lưu thông tin và tiếp tục</button>
      </form>
    </AuthShell>
  );
}
