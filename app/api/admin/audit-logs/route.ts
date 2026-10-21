import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { getAdminAuditLogs } from "@/lib/db/fileDb";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ success: false, error: "Không có quyền truy cập." }, { status: 403 });
  }

  try {
    const logs = await getAdminAuditLogs();
    return NextResponse.json({
      success: true,
      description: "Nhật ký thao tác hệ thống (Admin Audit Logs)",
      data: logs,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi lấy nhật ký thao tác" }, { status: 500 });
  }
}
