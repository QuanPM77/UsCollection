import { redirect } from "next/navigation";
import type { Session } from "next-auth";
import { getSession as auth } from "@/lib/auth-session";

type Role = "admin" | "staff" | "customer";

// Gọi trong layout của từng khu vực. Chặn thật sự nằm ở server.
export async function requireRole(...allowed: Role[]) {
  const s = await auth();
  if (!s?.user?.id) redirect("/login");
  if (!allowed.includes(s.user.role)) redirect(`/${s.user.role}`);
  if (s.user.role === "customer") {
    // The session callback has already checked the current account in the DB.
    if (s.user.destination === "/complete-profile" || s.user.destination === "/verify-required") redirect(s.user.destination);
  }
  return s;
}

type ApiAccess = { ok: true; session: Session } | { ok: false; response: Response };

export async function requireApiRole(...allowed: Role[]): Promise<ApiAccess> {
  const session = await auth();
  if (!session?.user?.id) {
    return { ok: false, response: Response.json({ success: false, message: "Vui lòng đăng nhập." }, { status: 401 }) };
  }
  if (!allowed.includes(session.user.role)) {
    return { ok: false, response: Response.json({ success: false, message: "Bạn không có quyền sử dụng tính năng này." }, { status: 403 }) };
  }
  if (session.user.role === "customer" &&
    (session.user.destination === "/complete-profile" || session.user.destination === "/verify-required")) {
    return { ok: false, response: Response.json({
      success: false,
      message: "Vui lòng hoàn thiện thông tin cá nhân và xác minh email trước khi sử dụng tính năng này.",
      redirectTo: session.user.destination,
    }, { status: 403 }) };
  }
  return { ok: true, session };
}
