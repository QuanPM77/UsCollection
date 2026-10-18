"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isValidVietnamWard } from "@/lib/vietnam-addresses";

export async function completeProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user.id || session.user.role !== "customer") redirect("/login");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const street = String(formData.get("street") ?? "").trim();
  const province = String(formData.get("province") ?? "").trim();
  const ward = String(formData.get("ward") ?? "").trim();
  if (fullName.length < 2 || fullName.length > 100) throw new Error("Họ tên cần từ 2 đến 100 ký tự.");
  const existing = await prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true, emailVerifiedAt: true, profileCompletedAt: true } });
  if (!existing) throw new Error("Tài khoản không tồn tại.");
  if (street.length < 3) throw new Error("Vui lòng nhập số nhà và tên đường.");
  if (!isValidVietnamWard(province, ward)) throw new Error("Vui lòng chọn tỉnh/thành phố và phường/xã hợp lệ.");
  const addressLine = `${street}, ${ward}`;

  const phone = existing?.phone;
  if (!phone) throw new Error("Tài khoản chưa có số điện thoại đăng nhập.");

  await prisma.$transaction(async (tx) => {
    if (existing.profileCompletedAt) {
      await tx.user.update({ where: { id: session.user.id }, data: { fullName } });
      const address = await tx.userAddress.findFirst({ where: { userId: session.user.id, isDefault: true }, select: { id: true } });
      if (address) {
        await tx.userAddress.update({ where: { id: address.id }, data: { addressLine: `${street}, ${ward}`, province } });
      } else {
        await tx.userAddress.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } });
        await tx.userAddress.create({
          data: { userId: session.user.id, recipientName: fullName, phone, addressLine: `${street}, ${ward}`, province, isDefault: true },
        });
      }
      return;
    }
    // Claim profile completion atomically so parallel submissions cannot create duplicate addresses.
    const claimed = await tx.user.updateMany({
      where: { id: session.user.id, profileCompletedAt: null },
      data: { fullName, profileCompletedAt: new Date() },
    });
    if (claimed.count === 0) return;

    await tx.userAddress.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } });
    await tx.userAddress.create({
      data: {
        userId: session.user.id,
        recipientName: fullName,
        phone,
        addressLine,
        province: province || null,
        isDefault: true,
      },
    });
  });
  if (!existing.emailVerifiedAt) redirect("/verify-required");
  redirect("/post-login");
}
