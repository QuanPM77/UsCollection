import { redirect } from "next/navigation";
import { getSession as auth } from "@/lib/auth-session";

type Role = "admin" | "staff" | "customer";

// Gọi trong layout của từng khu vực. Chặn thật sự nằm ở server.
export async function requireRole(...allowed: Role[]) {
  const s = await auth();
  if (!s) redirect("/login");
  if (!allowed.includes(s.user.role)) redirect(`/${s.user.role}`);
  if (s.user.role === "customer") {
    // The session callback has already checked the current account in the DB.
    if (s.user.destination === "/complete-profile" || s.user.destination === "/verify-required") redirect(s.user.destination);
  }
  return s;
}
