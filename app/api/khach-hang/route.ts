import { NextResponse } from "next/server";
import { getKhachHang, createKhachHang } from "@/lib/db/fileDb";

export async function GET() {
  try {
    const list = await getKhachHang();
    return NextResponse.json({ success: true, data: list });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Không thể lấy danh sách khách hàng & đơn hàng" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.hoTen || !body.soDienThoai || !body.diaChi) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin khách hàng (hoTen, soDienThoai, diaChi)" },
        { status: 400 }
      );
    }

    const record = await createKhachHang({
      id: body.id,
      hoTen: body.hoTen,
      soDienThoai: body.soDienThoai,
      diaChi: body.diaChi,
      cauHinhVong: {
        chuViCoTay: body.cauHinhVong?.chuViCoTay || 160,
        danhSachCharm: body.cauHinhVong?.danhSachCharm || [],
      },
      tongTien: body.tongTien || 0,
      phuongThucThanhToan: body.phuongThucThanhToan || "momo",
      trangThaiThanhToan: body.trangThaiThanhToan || "chua_thanh_toan",
    });

    return NextResponse.json({ success: true, data: record }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Lỗi khi lưu thông tin khách hàng" },
      { status: 500 }
    );
  }
}
