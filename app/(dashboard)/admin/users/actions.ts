"use server";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/guard";

// Server action là endpoint công khai: phải kiểm tra role lại, layout không bảo vệ được.
export async function setStatus(fd: FormData) {
  const admin = await requireRole("admin");
  const id = String(fd.get("id") ?? "");
  const to = fd.get("to") === "blocked" ? "blocked" : "active";
  if (!id || id === admin.user.id) return; // không tự khóa chính mình
  await prisma.user.update({ where: { id }, data: { status: to } });
  revalidatePath("/admin/users");
}
