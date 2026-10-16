"use server";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { isEmail } from "@/lib/form";

export async function completeProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user.id || session.user.role !== "customer") redirect("/login");

  const fullName = String(formData.get("fullName") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const addressLine = String(formData.get("addressLine") ?? "").trim();
  const province = String(formData.get("province") ?? "").trim();
  if (fullName.length < 2 || fullName.length > 100) throw new Error("Họ tên cần từ 2 đến 100 ký tự.");
  if (email && !isEmail(email)) throw new Error("Email không hợp lệ.");
  if (addressLine.length < 8) throw new Error("Vui lòng nhập địa chỉ giao hàng đầy đủ.");

  const existing = await prisma.user.findUnique({ where: { id: session.user.id }, select: { phone: true } });
  const phone = existing?.phone;
  if (!phone) throw new Error("Tài khoản chưa có số điện thoại đăng nhập.");

  await prisma.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: session.user.id },
      data: { fullName, email: email || null, profileCompletedAt: new Date() },
    });
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
