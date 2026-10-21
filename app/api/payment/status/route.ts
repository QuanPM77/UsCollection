import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { PayOS } from "@payos/node";
import { deleteUnpaidOrder, settlePaidOrder } from "@/lib/payment-settlement";

export async function GET(req: NextRequest) {
  const orderId = req.nextUrl.searchParams.get("orderId");
  if (!orderId || !/^[0-9a-f-]{36}$/i.test(orderId)) return NextResponse.json({ message: "Invalid orderId" }, { status: 400 });
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ message: "Vui lòng đăng nhập." }, { status: 401 });
  const order = await prisma.order.findUnique({ where: { id: orderId }, select: { user_id: true, orderCode: true, totalPrice: true, paymentStatus: true, inventoryReviewRequired: true, braceletConfig: true, order_items: { select: { product_type: true, product_name: true } } } });
  if (!order) return NextResponse.json({ message: "Order not found" }, { status: 404 });
  if (order.user_id !== session.user.id && session.user.role !== "admin") return NextResponse.json({ message: "Không có quyền xem đơn hàng." }, { status: 403 });
  const shouldSyncPayOS = req.nextUrl.searchParams.get("syncPayOS") === "1";
  if (shouldSyncPayOS && order.paymentStatus === "pending" && process.env.PAYOS_CLIENT_ID && process.env.PAYOS_API_KEY && process.env.PAYOS_CHECKSUM_KEY) {
    try {
      const payos = new PayOS({ clientId: process.env.PAYOS_CLIENT_ID, apiKey: process.env.PAYOS_API_KEY, checksumKey: process.env.PAYOS_CHECKSUM_KEY });
      const link = await payos.paymentRequests.get(Number(order.orderCode));
      if (link.amount === order.totalPrice && link.status === "PAID") {
        await settlePaidOrder(order.orderCode, link.amount);
      } else if (["CANCELLED", "EXPIRED", "FAILED"].includes(link.status)) {
        await deleteUnpaidOrder(order.orderCode);
      }
    } catch (error) {
      console.error("[PayOS Status Sync] Could not refresh payment status", error);
    }
  }
  const latestPayment = order.paymentStatus === "pending"
    ? await prisma.order.findUnique({ where: { id: orderId }, select: { paymentStatus: true, inventoryReviewRequired: true } })
    : null;
  const isCatalog = order.order_items.some((item) => item.product_type === "bracelet") || (typeof order.braceletConfig === "object" && order.braceletConfig !== null && "kind" in order.braceletConfig && order.braceletConfig.kind === "catalog_product");
  return NextResponse.json({ paymentStatus: latestPayment?.paymentStatus ?? (order.paymentStatus === "pending" ? "failed" : order.paymentStatus), inventoryReviewRequired: latestPayment?.inventoryReviewRequired ?? order.inventoryReviewRequired, orderCode: String(order.orderCode), orderType: isCatalog ? "catalog_product" : "custom_design" });
}
