import { NextResponse } from "next/server";
import { getAdminAuditLogs } from "@/lib/db/fileDb";

export async function GET() {
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
