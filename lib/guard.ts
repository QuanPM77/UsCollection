import { redirect } from "next/navigation";
import { auth } from "@/auth";

type Role = "admin" | "staff" | "customer";

// Gọi trong layout của từng khu vực. Chặn thật sự nằm ở server.
export async function requireRole(...allowed: Role[]) {
  const s = await auth();
  if (!s) redirect("/login");
  if (!allowed.includes(s.user.role)) redirect(`/${s.user.role}`);
  return s;
}
