import { NextResponse } from "next/server";
import { getBraceletTemplates, createBraceletTemplate, getBraceletTemplateSlots, addAdminAuditLog } from "@/lib/db/fileDb";

export async function GET() {
  try {
    const templates = await getBraceletTemplates();
    const result = await Promise.all(
      templates.map(async (t) => {
        const slots = await getBraceletTemplateSlots(t.id);
        return { ...t, slots };
      })
    );
    return NextResponse.json({ success: true, data: result });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi lấy danh sách mẫu vòng tay" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { name, description, wrist_circumference, thumbnail_url, category, is_featured, status, created_by, slots } = body;

    if (!name || !slots || !Array.isArray(slots)) {
      return NextResponse.json({ success: false, error: "Thiếu tên mẫu vòng hoặc danh sách hạt" }, { status: 400 });
    }

    const template = await createBraceletTemplate(
      {
        name,
        description: description || "",
        wrist_circumference: wrist_circumference || 160,
        thumbnail_url,
        category: category || "thong_dung",
        is_featured: is_featured ?? false,
        status: status || "published",
        created_by: created_by || "usr-manager-01",
      },
      slots
    );

    if (created_by) {
      await addAdminAuditLog(created_by, "create_template", "bracelet_templates", template.id, `Tạo mẫu vòng tay ${name}`);
    }

    return NextResponse.json({ success: true, data: template }, { status: 201 });
  } catch (error) {
    return NextResponse.json({ success: false, error: "Lỗi khi lưu mẫu vòng tay mới" }, { status: 500 });
  }
}
