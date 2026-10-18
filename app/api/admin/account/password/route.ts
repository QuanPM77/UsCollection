import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function PATCH(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  }

  const body = await request.json().catch(() => null) as { currentPassword?: unknown; newPassword?: unknown } | null;
  if (typeof body?.currentPassword !== "string" || typeof body.newPassword !== "string" || body.newPassword.length < 8) {
    return NextResponse.json({ message: "Mật khẩu mới phải có ít nhất 8 ký tự." }, { status: 400 });
  }

  const user = await prisma.user.findUnique({ where: { id: session.user.id }, select: { passwordHash: true } });
  if (!user?.passwordHash || !(await bcrypt.compare(body.currentPassword, user.passwordHash))) {
    return NextResponse.json({ message: "Mật khẩu hiện tại không chính xác." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: { passwordHash: await bcrypt.hash(body.newPassword, 10) },
  });
  return NextResponse.json({ message: "Đã đổi mật khẩu thành công." });
}
