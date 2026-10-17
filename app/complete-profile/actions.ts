"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isEmail } from "@/lib/form";
import { isValidVietnamWard } from "@/lib/vietnam-addresses";

export async function completeProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user.id || session.user.role !== "customer") redirect("/login");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const street = String(formData.get("street") ?? "").trim();
  const province = String(formData.get("province") ?? "").trim();
  const ward = String(formData.get("ward") ?? "").trim();
  if (fullName.length < 2 || fullName.length > 100) throw new Error("Họ tên cần từ 2 đến 100 ký tự.");
  if (email && !isEmail(email)) throw new Error("Email không hợp lệ.");
  if (street.length < 3) throw new Error("Vui lòng nhập số nhà và tên đường.");
  if (!isValidVietnamWard(province, ward)) throw new Error("Vui lòng chọn tỉnh/thành phố và phường/xã hợp lệ.");
  const addressLine = `${street}, ${ward}`;

  const existing = await prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true } });
  const phone = existing?.phone;
  if (!phone) throw new Error("Tài khoản chưa có số điện thoại đăng nhập.");

  await prisma.$transaction(async (tx) => {
    // Claim profile completion atomically so a repeated/parallel form submit
    // cannot create another default address for the same account.
    const claimed = await tx.user.updateMany({
      where: { id: session.user.id, profileCompletedAt: null },
      data: { fullName, email: email || null, profileCompletedAt: new Date() },
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
  redirect("/customer");
}
