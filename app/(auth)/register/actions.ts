"use server";
import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { FormState } from "@/lib/form";
import { clearLimit, clientIp, limitError, progressiveFailureLimit, recordProgressiveFailure } from "@/lib/ratelimit";

export async function registerUser(_: FormState, fd: FormData): Promise<FormState> {
  const ip = clientIp(await headers());
  const perIp = `register:fail:ip:${ip}`;
  const lock = await progressiveFailureLimit(perIp);
  if (!lock.ok) return { error: limitError(lock)! };
  // Cho phép 5 lần như yêu cầu, sau đó áp dụng thời gian chờ tăng dần như đăng nhập.
  await recordProgressiveFailure(perIp, 5);

  const phone = String(fd.get("phone") ?? "").replace(/\s/g, "");
  const password = String(fd.get("password") ?? "");
  const confirm = String(fd.get("confirm") ?? "");

  if (!/^(0|\+84)\d{9,10}$/.test(phone)) return { error: "Nhập số điện thoại Việt Nam hợp lệ." };
  if (password.length < 8) return { error: "Mật khẩu cần ít nhất 8 ký tự." };
  if (password !== confirm) return { error: "Mật khẩu nhập lại không khớp." };

  const exists = await prisma.user.findFirst({ where: { phone }, select: { id: true } });
  if (exists) return { error: "Số điện thoại này đã được đăng ký. Hãy đăng nhập." };

  let user;
  try {
    user = await prisma.user.create({
      data: { phone, passwordHash: await bcrypt.hash(password, 10) }, // role mặc định: customer
    });
  } catch (e: unknown) {
    if ((e as { code?: string }).code === "P2002") return { error: "Số điện thoại này đã được đăng ký. Hãy đăng nhập." };
    throw e;
  }
  await clearLimit(perIp);
  redirect(`/login?registered=1&phone=${encodeURIComponent(phone)}`);
}
