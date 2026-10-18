import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

type Role = "admin" | "staff" | "customer";

// Gọi trong layout của từng khu vực. Chặn thật sự nằm ở server.
export async function requireRole(...allowed: Role[]) {
  const s = await auth();
  if (!s) redirect("/login");
  if (!allowed.includes(s.user.role)) redirect(`/${s.user.role}`);
  if (s.user.role === "customer") {
    const user = await prisma.user.findUnique({ where: { id: s.user.id }, select: { email: true, emailVerifiedAt: true, profileCompletedAt: true } });
    if (!user?.profileCompletedAt) redirect("/complete-profile");
    if (!user.email || !user.emailVerifiedAt) redirect("/verify-required");
  }
  return s;
}
