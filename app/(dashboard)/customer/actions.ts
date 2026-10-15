"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guard";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function finish(message: string) {
  revalidatePath("/customer");
  redirect(`/customer?saved=${message}`);
}

export async function updateProfile(formData: FormData) {
  const session = await requireRole("customer");
  const fullName = value(formData, "fullName");
  const phone = value(formData, "phone");

  if (fullName.length < 2 || fullName.length > 100) throw new Error("Họ tên cần từ 2 đến 100 ký tự.");
  if (phone && !/^(0|\+84)[0-9]{8,10}$/.test(phone.replace(/\s/g, ""))) {
    throw new Error("Số điện thoại không hợp lệ.");
  }
  await prisma.user.update({
    where: { id: session.user.id },
    data: { fullName, phone: phone || null },
  });
  finish("profile");
}

export async function saveAvatar(formData: FormData) {
  const session = await requireRole("customer");
  const avatarData = value(formData, "avatarData");
  const match = avatarData.match(/^data:image\/(webp|jpeg|png);base64,([A-Za-z0-9+/]+={0,2})$/);
  if (!match || Buffer.byteLength(avatarData, "utf8") > 200_000) {
    throw new Error("Ảnh không hợp lệ hoặc quá lớn. Vui lòng chọn ảnh khác.");
  }
  const imageBytes = Buffer.from(match[2], "base64");
  if (imageBytes.byteLength > 150_000) throw new Error("Ảnh sau khi nén cần nhỏ hơn 150 KB.");

  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: avatarData } });
  finish("avatar-saved");
}

export async function deleteAvatar(_formData: FormData) {
  const session = await requireRole("customer");
  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: null } });
  finish("avatar-deleted");
}

export async function addAddress(formData: FormData) {
  const session = await requireRole("customer");
  const addressLine = value(formData, "addressLine");
  const province = value(formData, "province");
  if (addressLine.length < 8) throw new Error("Vui lòng nhập địa chỉ đầy đủ.");

  const [user, existingCount] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true, fullName: true, phone: true } }),
    prisma.userAddress.count({ where: { userId: session.user.id } }),
  ]);
  if (!user) throw new Error("Không tìm thấy tài khoản.");
  const shouldBeDefault = formData.get("isDefault") === "on" || existingCount === 0;
  await prisma.$transaction(async (tx) => {
    if (shouldBeDefault) await tx.userAddress.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } });
    await tx.userAddress.create({
      data: {
        userId: session.user.id,
        recipientName: user.fullName?.trim() || user.email,
        phone: user.phone?.replace(/\s/g, "") || "",
        addressLine,
        province: province || null,
        isDefault: shouldBeDefault,
      },
    });
  });
  finish("address-added");
}

export async function updateAddress(formData: FormData) {
  const session = await requireRole("customer");
  const id = value(formData, "id");
  const addressLine = value(formData, "addressLine");
  const province = value(formData, "province");
  const isDefault = formData.get("isDefault") === "on";
  if (!id || addressLine.length < 8) throw new Error("Vui lòng nhập địa chỉ đầy đủ.");

  await prisma.$transaction(async (tx) => {
    const owned = await tx.userAddress.findFirst({ where: { id, userId: session.user.id }, select: { id: true } });
    if (!owned) throw new Error("Không tìm thấy địa chỉ.");
    if (isDefault) await tx.userAddress.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } });
    await tx.userAddress.update({
      where: { id },
      data: { addressLine, province: province || null, isDefault },
    });
  });
  finish("address-updated");
}

export async function deleteAddress(formData: FormData) {
  const session = await requireRole("customer");
  const id = value(formData, "id");
  if (!id) throw new Error("Địa chỉ không hợp lệ.");

  await prisma.$transaction(async (tx) => {
    const address = await tx.userAddress.findFirst({ where: { id, userId: session.user.id } });
    if (!address) return;
    await tx.userAddress.delete({ where: { id } });
    if (address.isDefault) {
      const nextAddress = await tx.userAddress.findFirst({ where: { userId: session.user.id }, orderBy: { createdAt: "asc" } });
      if (nextAddress) await tx.userAddress.update({ where: { id: nextAddress.id }, data: { isDefault: true } });
    }
  });
  finish("address-deleted");
}
