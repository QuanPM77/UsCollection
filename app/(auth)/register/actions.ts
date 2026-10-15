"use server";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormState, isEmail } from "@/lib/form";
import { clientIp, rateLimit, limitError } from "@/lib/ratelimit";
import { sendVerificationEmail } from "@/lib/verify";

export async function registerUser(_: FormState, fd: FormData): Promise<FormState> {
  const fullName = String(fd.get("fullName") ?? "").trim();
  const email = String(fd.get("email") ?? "").trim().toLowerCase();
  const phone = String(fd.get("phone") ?? "").trim() || null;
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  if (fullName.length < 2) return { error: "Nhập họ và tên." };
  if (!isEmail(email)) return { error: "Email không hợp lệ." };
  if (phone && !/^(0|\+84)\d{9,10}$/.test(phone)) return { error: "Số điện thoại không hợp lệ." };
  if (password.length < 8) return { error: "Mật khẩu cần ít nhất 8 ký tự." };
  if (password !== confirm) return { error: "Mật khẩu nhập lại không khớp." };

  const ip = clientIp(await headers());
  const lim = limitError(await rateLimit(`register:ip:${ip}`, 5, 3600)); // 5 tài khoản / giờ / IP
  if (lim) return { error: lim };

  const exists = await prisma.user.findUnique({ where: { email }, select: { id: true } });
  if (exists) return { error: "Email này đã được đăng ký. Hãy đăng nhập, hoặc dùng Quên mật khẩu." };

  let user;
  try {
    user = await prisma.user.create({
      data: { email, fullName, phone, passwordHash: await bcrypt.hash(password, 10) }, // role mặc định: customer
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "Email này đã được đăng ký." };
    throw e;
  }
  await sendVerificationEmail(user.id, user.email);
  redirect("/login?registered=1");
}
