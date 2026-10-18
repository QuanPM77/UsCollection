import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const defaults = { store_name: "UsStory", store_description: "", contact_phone: "", contact_email: "", address: "", low_stock_threshold: 5, currency: "VND", order_auto_confirm: false };
async function requireAdmin() {
  const session = await auth();
  return session?.user?.id && session.user.role === "admin";
}

export async function GET() {
  if (!(await requireAdmin())) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  const settings = await prisma.store_settings.upsert({ where: { id: 1 }, create: { id: 1 }, update: {} });
  return NextResponse.json(settings);
}

export async function PUT(request: Request) {
  if (!(await requireAdmin())) return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  const body = await request.json().catch(() => null) as Record<string, unknown> | null;
  if (!body || typeof body.storeName !== "string" || typeof body.storeDescription !== "string" ||
    typeof body.contactPhone !== "string" || typeof body.contactEmail !== "string" || typeof body.address !== "string" ||
    !Number.isSafeInteger(body.lowStockThreshold) || Number(body.lowStockThreshold) < 1 || typeof body.orderAutoConfirm !== "boolean") {
    return NextResponse.json({ message: "Thông tin cài đặt không hợp lệ." }, { status: 400 });
  }
  const settings = await prisma.store_settings.upsert({
    where: { id: 1 },
    create: { id: 1, ...defaults, store_name: body.storeName.trim(), store_description: body.storeDescription.trim(), contact_phone: body.contactPhone.trim(), contact_email: body.contactEmail.trim(), address: body.address.trim(), low_stock_threshold: Number(body.lowStockThreshold), order_auto_confirm: body.orderAutoConfirm },
    update: { store_name: body.storeName.trim(), store_description: body.storeDescription.trim(), contact_phone: body.contactPhone.trim(), contact_email: body.contactEmail.trim(), address: body.address.trim(), low_stock_threshold: Number(body.lowStockThreshold), order_auto_confirm: body.orderAutoConfirm },
  });
  return NextResponse.json(settings);
}
