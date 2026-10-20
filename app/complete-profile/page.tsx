import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { AuthShell } from "@/components/AuthShell";
import { completeProfile } from "./actions";
import AddressFields from "@/components/AddressFields";

const fieldClass = "w-full rounded-xl border border-pink-mid/40 bg-white px-4 py-3 text-sm text-pink-text outline-none placeholder:text-pink-text/35 focus:border-pink-deep focus:ring-2 focus:ring-pink-mid/30";

export default async function CompleteProfilePage() {
  const session = await auth();
  if (!session?.user.id) redirect("/login");
  if (session.user.role !== "customer") redirect("/post-login");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      fullName: true,
      email: true,
      phone: true,
      emailVerifiedAt: true,
      profileCompletedAt: true,
      addresses: { where: { isDefault: true }, take: 1, select: { addressLine: true, province: true } },
    },
  });
  if (!user) redirect("/login");
  if (user.profileCompletedAt && user.emailVerifiedAt && user.phone) redirect("/customer");

  return (
    <AuthShell title="Hoàn thiện thông tin cá nhân">
      <p className="mb-6 text-sm leading-6 text-rose-900/70">Vui lòng điền đầy đủ thông tin để tiếp tục sử dụng tài khoản và giao hàng chính xác.{user.emailVerifiedAt ? " Email tài khoản của bạn đã được xác minh." : " Sau bước này, bạn sẽ nhập email và xác minh riêng."}</p>
      <form action={completeProfile} className="space-y-4">
        {user.email && <p className="text-sm text-pink-text/70">Email tài khoản: <strong>{user.email}</strong>{user.emailVerifiedAt && <span className="ml-1 text-emerald-700">(đã xác minh)</span>}</p>}
        <div>
          <label htmlFor="fullName" className="mb-1.5 block text-xs font-semibold text-pink-text">Họ và tên *</label>
          <input id="fullName" name="fullName" required minLength={2} maxLength={100} defaultValue={user.fullName ?? ""} autoComplete="name" className={fieldClass} />
        </div>
        <div>
          <label htmlFor="phone" className="mb-1.5 block text-xs font-semibold text-pink-text">Số điện thoại *</label>
          <input id="phone" name="phone" type="tel" required pattern="(0|\+84)[0-9]{9,10}" title="Nhập số điện thoại Việt Nam, ví dụ 0912345678" defaultValue={user.phone ?? ""} autoComplete="tel" className={fieldClass} />
        </div>
        <AddressFields idPrefix="complete-profile" streetName="street" provinceName="province" wardName="ward" initialAddressLine={user.addresses[0]?.addressLine ?? ""} initialProvince={user.addresses[0]?.province ?? ""} inputClass={fieldClass} labelClass="mb-1.5 block text-xs font-semibold text-pink-text" />
        <button className="w-full rounded-xl bg-pink-deep px-5 py-3 text-sm font-semibold text-white transition hover:bg-pink-text">Lưu thông tin và tiếp tục</button>
      </form>
    </AuthShell>
  );
}
