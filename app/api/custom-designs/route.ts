import { NextResponse } from "next/server";
import { getCustomDesigns, getCustomDesignSlots, createCustomDesign } from "@/lib/db/fileDb";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("userId");

    if (!userId) {
      return NextResponse.json({ success: false, error: "Cần cung cấp userId để lấy danh sách thiết kế cá nhân" }, { status: 400 });
    }

    const designs = await getCustomDesigns(userId);
    const result = await Promise.all(
      designs.map(async (d) => {
        const slots = await getCustomDesignSlots(d.id);
        return { ...d, slots };
      })
    );

    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi lấy danh sách thiết kế cá nhân" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { user_id, name, wrist_circumference, thumbnail_url, is_public, slots } = body;

    if (!user_id || !name || !slots || !Array.isArray(slots)) {
      return NextResponse.json({ success: false, error: "Thiếu user_id, tên thiết kế hoặc danh sách hạt" }, { status: 400 });
    }

    const design = await createCustomDesign(
      {
        user_id,
        name,
        wrist_circumference: wrist_circumference || 160,
        thumbnail_url: thumbnail_url || null,
        is_public: is_public ?? false,
      },
      slots
    );

    return NextResponse.json({ success: true, data: design }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi khi lưu thiết kế cá nhân" }, { status: 500 });
  }
}
