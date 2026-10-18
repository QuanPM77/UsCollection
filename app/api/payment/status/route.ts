import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ message: "Invalid orderId" }, { status: 400 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "Vui lòng đăng nhập." }, { status: 401 });
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { user_id: true, orderCode: true, paymentStatus: true, braceletConfig: true, order_items: { select: { product_type: true, product_name: true } } } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  if (order.user_id !== session.user.id && session.user.role !== "admin") return NextResponse.json({ message: "Không có quyền xem đơn hàng." }, { status: 403 });
  const isCatalog = order.order_items.some((item) => item.product_type === "bracelet") || (typeof order.braceletConfig === "object" && order.braceletConfig !== null && "kind" in order.braceletConfig && order.braceletConfig.kind === "catalog_product");
  return NextResponse.json({ paymentStatus: order.paymentStatus, orderCode: String(order.orderCode), orderType: isCatalog ? "catalog_product" : "custom_design" });
}
