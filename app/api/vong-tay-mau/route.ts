import { NextResponse } from "next/server";
import { getVongTayMau, addVongTayMau } from "@/lib/db/fileDb";

export async function GET() {
  try {
    const list = await getVongTayMau();
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Không thể lấy danh sách vòng tay mẫu" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.ten || !body.danhSachCharm) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin bắt buộc (ten, danhSachCharm)" },
        { status: 400 }
      );
    }
    const item = await addVongTayMau({
      id: body.id || `vong-${Date.now()}`,
      ten: body.ten,
      moTa: body.moTa || "",
      chuViCoTay: body.chuViCoTay || 160,
      danhSachCharm: body.danhSachCharm,
      tongTien: body.tongTien || 0,
    });

    return NextResponse.json({ success: true, data: item }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Lỗi khi lưu vòng tay mẫu mới" },
      { status: 500 }
    );
  }
}
