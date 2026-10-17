"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guard";
import { isEmail } from "@/lib/form";
import bcrypt from "bcryptjs";
import { removeAvatar, uploadAvatar } from "@/lib/supabase-storage";
import { isValidVietnamWard } from "@/lib/vietnam-addresses";
import { sendVerificationEmail } from "@/lib/verify";
import { headers } from "next/headers";
import { clientIp, rateLimit, limitError } from "@/lib/ratelimit";

function value(formData: FormData, key: string) {
  return String(formData.get(key) ?? "").trim();
}

function finish(message: string) {
  revalidatePath("/customer");
  redirect(`/customer?saved=${message}`);
}

export async function changePassword(formData: FormData) {
  const session = await requireRole("customer");
  const currentPassword = String(formData.get("currentPassword") ?? "");
  const newPassword = String(formData.get("newPassword") ?? "");
  const confirmPassword = String(formData.get("confirmPassword") ?? "");
  if (newPassword.length < 8) redirect("/customer?passwordError=too-short");
  if (newPassword !== confirmPassword) redirect("/customer?passwordError=mismatch");

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!user?.passwordHash || !(await bcrypt.compare(currentPassword, user.passwordHash))) {
    redirect("/customer?passwordError=incorrect");
  }
  await prisma.user.update({ where: { id: session.user.id }, data: { passwordHash: await bcrypt.hash(newPassword, 10) } });
  finish("password-changed");
}

export async function updateProfile(formData: FormData) {
  const session = await requireRole("customer");
  const fullName = value(formData, "fullName");
  const email = value(formData, "profileEmail").toLowerCase();

  if (fullName.length < 2 || fullName.length > 100) throw new Error("Họ tên cần từ 2 đến 100 ký tự.");
  if (email && !isEmail(email)) throw new Error("Email không hợp lệ.");

  const emailValue = email || null;
  const [existing, duplicate] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id }, select: { email: true } }),
    emailValue
      ? prisma.user.findFirst({ where: { email: emailValue, id: { not: session.user.id } }, select: { id: true } })
      : Promise.resolve(null),
  ]);
  if (duplicate) throw new Error("Email này đã được sử dụng bởi tài khoản khác.");

  try {
    await prisma.$transaction(async (tx) => {
      await tx.user.update({
        where: { id: session.user.id },
        data: {
          fullName,
          email: emailValue,
          ...(existing?.email !== emailValue ? { emailVerifiedAt: null } : {}),
        },
      });

      const addresses = await tx.userAddress.findMany({
        where: { userId: session.user.id },
        select: { id: true, isDefault: true },
      });
      const selectedDefaultId = String(formData.get("defaultAddressId") ?? "");
      if (selectedDefaultId && !addresses.some((address) => address.id === selectedDefaultId && !address.isDefault)) {
        throw new Error("Địa chỉ mặc định không hợp lệ.");
      }

      if (selectedDefaultId) {
        await tx.userAddress.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } });
        await tx.userAddress.update({ where: { id: selectedDefaultId }, data: { isDefault: true } });
      }

      for (const address of addresses) {
        const street = String(formData.get(`street_${address.id}`) ?? "").trim();
        const province = String(formData.get(`province_${address.id}`) ?? "").trim();
        const ward = String(formData.get(`ward_${address.id}`) ?? "").trim();
        if (street.length < 3) throw new Error("Vui lòng nhập số nhà và tên đường.");
        if (!isValidVietnamWard(province, ward)) throw new Error("Vui lòng chọn tỉnh/thành phố và phường/xã hợp lệ.");
        await tx.userAddress.update({
          where: { id: address.id },
          data: { addressLine: `${street}, ${ward}`, province },
        });
      }
    });
  } catch (error: unknown) {
    if ((error as { code?: string }).code === "P2002") throw new Error("Email này đã được sử dụng bởi tài khoản khác.");
    throw error;
  }
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
  const previous = await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } });
  if (!previous) throw new Error("Không tìm thấy tài khoản.");
  const uploadedPath = await uploadAvatar(session.user.id, imageBytes);
  try {
    await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: uploadedPath } });
  } catch (error) {
    await removeAvatar(uploadedPath).catch(() => undefined);
    throw error;
  }
  await removeAvatar(previous.avatarUrl).catch(() => undefined);
  finish("avatar-saved");
}

export async function deleteAvatar(_formData: FormData) {
  const session = await requireRole("customer");
  const previous = await prisma.user.findUnique({ where: { id: session.user.id }, select: { avatarUrl: true } });
  await prisma.user.update({ where: { id: session.user.id }, data: { avatarUrl: null } });
  await removeAvatar(previous?.avatarUrl).catch(() => undefined);
  finish("avatar-deleted");
}

export async function addAddress(formData: FormData) {
  const session = await requireRole("customer");
  const street = value(formData, "street");
  const province = value(formData, "province");
  const ward = value(formData, "ward");
  if (street.length < 3) throw new Error("Vui lòng nhập số nhà và tên đường.");
  if (!isValidVietnamWard(province, ward)) throw new Error("Vui lòng chọn tỉnh/thành phố và phường/xã hợp lệ.");
  const addressLine = `${street}, ${ward}`;

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
        recipientName: user.fullName?.trim() || user.email || "Khách hàng",
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
  const street = value(formData, "street");
  const province = value(formData, "province");
  const ward = value(formData, "ward");
  const isDefault = formData.get("isDefault") === "on";
  if (!id || street.length < 3) throw new Error("Vui lòng nhập số nhà và tên đường.");
  if (!isValidVietnamWard(province, ward)) throw new Error("Vui lòng chọn tỉnh/thành phố và phường/xã hợp lệ.");

  await prisma.$transaction(async (tx) => {
    const owned = await tx.userAddress.findFirst({ where: { id, userId: session.user.id }, select: { id: true } });
    if (!owned) throw new Error("Không tìm thấy địa chỉ.");
    if (isDefault) await tx.userAddress.updateMany({ where: { userId: session.user.id }, data: { isDefault: false } });
    await tx.userAddress.update({
      where: { id },
      data: { addressLine: `${street}, ${ward}`, province, isDefault },
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

export async function sendVerifyEmail(): Promise<{ error?: string; ok?: boolean }> {
  const session = await requireRole("customer");
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { email: true, emailVerifiedAt: true },
  });
  if (!user?.email) return { error: "Bạn chưa có email trong hồ sơ." };
  if (user.emailVerifiedAt) return { error: "Email này đã được xác thực rồi." };

  const ip = clientIp(await headers());
  const message = limitError(
    await rateLimit(`verify:e:${user.email}`, 3, 3600),
    await rateLimit(`verify:ip:${ip}`, 10, 3600),
  );
  if (message) return { error: message };

  await sendVerificationEmail(session.user.id, user.email);
  return { ok: true };
}
