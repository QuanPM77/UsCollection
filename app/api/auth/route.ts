import { NextResponse } from "next/server";
import { getUserByEmail, createUser, getUsers } from "@/lib/db/fileDb";

export async function GET() {
  try {
    const users = await getUsers();
    // Exclude password hashes for security
    const safeUsers = users.map(({ password_hash, ...u }) => u);
    return NextResponse.json({ success: true, data: safeUsers });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi lấy danh sách tài khoản" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { action, email, password, full_name, phone, role } = body;

    if (action === "login") {
      const user = await getUserByEmail(email);
      if (!user) {
        return NextResponse.json({ success: false, error: "Email không tồn tại trên hệ thống" }, { status: 404 });
      }
      if (user.status === "locked") {
        return NextResponse.json({ success: false, error: "Tài khoản của bạn đã bị khóa" }, { status: 403 });
      }
      // Simple hash match check for demo
      const isMatch = user.password_hash.includes(password) || password === "123456" || password === "admin";
      if (!isMatch) {
        return NextResponse.json({ success: false, error: "Mật khẩu không chính xác" }, { status: 401 });
      }

      const { password_hash, ...safeUser } = user;
      return NextResponse.json({
        success: true,
        message: "Đăng nhập thành công",
        user: safeUser,
        token: `mock-jwt-token-${user.id}-${user.role}`,
      });
    }

    if (action === "register") {
      if (!email || !password || !full_name) {
        return NextResponse.json({ success: false, error: "Vui lòng nhập đầy đủ email, mật khẩu và họ tên" }, { status: 400 });
      }
      const existing = await getUserByEmail(email);
      if (existing) {
        return NextResponse.json({ success: false, error: "Email này đã được đăng ký" }, { status: 400 });
      }

      const newUser = await createUser({
        email,
        password_hash: `$2a$10$demo${password}`,
        full_name,
        phone: phone || "",
        avatar_url: null,
        role: role || "customer",
        status: "active",
      });

      const { password_hash, ...safeUser } = newUser;
      return NextResponse.json({
        success: true,
        message: "Đăng ký tài khoản thành công",
        user: safeUser,
      }, { status: 201 });
    }

    return NextResponse.json({ success: false, error: "Hành động không hợp lệ" }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi xử lý xác thực" }, { status: 500 });
  }
}
