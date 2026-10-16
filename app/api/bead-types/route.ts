import { NextResponse } from "next/server";
import { getBeadTypes, saveBeadType, addAdminAuditLog } from "@/lib/db/fileDb";

export async function GET() {
  try {
    const beads = await getBeadTypes();
    return NextResponse.json({ success: true, data: beads });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi lấy danh mục hạt" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id, code, name, material, color_hex, emissive_hex, metalness, roughness, description, cost_price, sell_price, stock_quantity, is_active, diameter, admin_id } = body;

    if (!name || !sell_price) {
      return NextResponse.json({ success: false, error: "Thiếu tên hạt hoặc giá bán" }, { status: 400 });
    }

    const beadId = id || `bead-${Date.now()}`;
    const saved = await saveBeadType({
      id: beadId,
      code: code || `BEAD-${Date.now()}`,
      name,
      material: material || "crystal",
      color_hex: color_hex || "#FFFFFF",
      emissive_hex,
      metalness: metalness ?? 0.1,
      roughness: roughness ?? 0.3,
      description: description || "",
      cost_price: cost_price || 0,
      sell_price: sell_price,
      stock_quantity: stock_quantity ?? 100,
      is_active: is_active ?? true,
      diameter: diameter || 8,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    if (admin_id) {
      await addAdminAuditLog(admin_id, "update_bead_type", "bead_types", beadId, `Cập nhật thông tin hạt ${name}`);
    }

    return NextResponse.json({ success: true, data: saved }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi khi lưu hạt mới" }, { status: 500 });
  }
}
