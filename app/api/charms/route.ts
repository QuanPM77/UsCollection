import { NextResponse } from "next/server";
import { getCharms, addCharm } from "@/lib/db/fileDb";

export async function GET() {
  try {
    const charms = await getCharms();
    return NextResponse.json({ success: true, data: charms });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Không thể lấy danh sách charms" },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (!body.name || !body.price) {
      return NextResponse.json(
        { success: false, error: "Thiếu thông tin bắt buộc (name, price)" },
        { status: 400 }
      );
    }
    const charm = await addCharm({
      id: body.id || `charm-${Date.now()}`,
      name: body.name,
      material: body.material || "crystal",
      color: body.color || "#FFFFFF",
      emissive: body.emissive,
      metalness: body.metalness ?? 0.1,
      roughness: body.roughness ?? 0.3,
      price: body.price,
      description: body.description || "",
      diameter: body.diameter || 8,
    });

    return NextResponse.json({ success: true, data: charm }, { status: 201 });
  } catch (error) {
    return NextResponse.json(
      { success: false, error: "Lỗi khi lưu charm mới" },
      { status: 500 }
    );
  }
}
