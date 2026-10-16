import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { uploadProductImage } from "@/lib/supabase-storage";

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
    const image = await uploadProductImage(session.user.id, Buffer.from(await file.arrayBuffer()));
    return NextResponse.json(image);
  } catch (error) {
    console.error("Product image upload failed", error);
    return NextResponse.json({ error: "Không tải được ảnh lên Supabase Storage. Kiểm tra cấu hình bucket rồi thử lại." }, { status: 502 });
  }
}
