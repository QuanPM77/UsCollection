import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadProductImage } from "@/lib/supabase-storage";
import { normalizeWebpImage } from "@/lib/image-validation";

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user.id) return NextResponse.json({ error: "Vui lòng đăng nhập." }, { status: 401 });
  if (session.user.role !== "admin") return NextResponse.json({ error: "Bạn không có quyền tải ảnh sản phẩm." }, { status: 403 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File) || file.type !== "image/webp" || file.size === 0 || file.size > 150_000) {
    return NextResponse.json({ error: "Ảnh cần là WebP và nhỏ hơn 150 KB." }, { status: 400 });
  }

  try {
    const bytes = Buffer.from(await file.arrayBuffer());
    const normalized = await normalizeWebpImage(bytes).catch(() => null);
    if (!normalized || normalized.byteLength === 0 || normalized.byteLength > 150_000) {
      return NextResponse.json({ error: "Nội dung ảnh không hợp lệ hoặc ảnh WebP sau khi chuẩn hóa vượt quá 150 KB." }, { status: 400 });
    }
    const image = await uploadProductImage(session.user.id, normalized);
    return NextResponse.json(image);
  } catch (error) {
    console.error("Product image upload failed", error);
    return NextResponse.json({ error: "Không tải được ảnh lên Supabase Storage. Kiểm tra cấu hình bucket rồi thử lại." }, { status: 502 });
  }
}
