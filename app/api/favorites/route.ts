import { NextResponse } from "next/server";
import { getFavorites, toggleFavorite } from "@/lib/db/fileDb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "Cần cung cấp userId" }, { status: 400 });
    }

    const favorites = await getFavorites(userId);
    return NextResponse.json({ success: true, data: favorites });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi lấy danh sách yêu thích" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, template_id, bead_type_id } = body;

    if (!user_id || (!template_id && !bead_type_id)) {
      return NextResponse.json({ success: false, error: "Thiếu user_id hoặc đối tượng yêu thích" }, { status: 400 });
    }

    const result = await toggleFavorite(user_id, { template_id, bead_type_id });
    return NextResponse.json({ success: true, ...result });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi xử lý mục yêu thích" }, { status: 500 });
  }
}
