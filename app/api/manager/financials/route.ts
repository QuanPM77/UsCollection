import { NextResponse } from "next/server";
import { getFinancialReport } from "@/lib/db/fileDb";

export async function GET() {
  try {
    const report = await getFinancialReport();
    return NextResponse.json({
      success: true,
      description: "Báo cáo Doanh thu, Giá vốn, Lợi nhuận theo tháng",
      data: report,
    });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi tạo báo cáo tài chính" }, { status: 500 });
  }
}
