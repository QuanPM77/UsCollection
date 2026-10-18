import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

const transitions: Record<string, string[]> = {
  new: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["shipping", "cancelled"],
  shipping: ["completed"],
  completed: [],
  cancelled: [],
};

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  }
  const { id } = await params;
  const order = await prisma.order.findUnique({ where: { id }, include: { order_items: true } });
  if (!order) return NextResponse.json({ message: "Không tìm thấy đơn hàng." }, { status: 404 });
  return NextResponse.json({
    id: order.id,
    orderCode: String(order.orderCode),
    orderType: order.order_items.some((item) => item.product_type === "bracelet") || (typeof order.braceletConfig === "object" && order.braceletConfig !== null && "kind" in order.braceletConfig && order.braceletConfig.kind === "catalog_product") ? "catalog_product" : "custom_design",
    productName: order.order_items.map((item) => item.product_name).filter((name, index, list) => list.indexOf(name) === index).join(", ") || "Vòng tay thiết kế 3D",
    customer: { fullName: order.customerName, phone: order.customerPhone, address: order.customerAddress },
    braceletConfig: order.braceletConfig,
    paymentMethod: order.payment_method,
    paymentStatus: order.paymentStatus,
    orderStatus: order.order_status,
    totalPrice: order.totalPrice,
    note: order.note,
    createdAt: order.createdAt.toISOString(),
    updatedAt: order.updatedAt.toISOString(),
    items: order.order_items.map((item) => ({ productName: item.product_name, productType: item.product_type, sku: item.sku, quantity: item.quantity, unitPrice: item.unit_price, unitCost: item.unit_cost, lineTotal: item.line_total, details: item.details })),
  });
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  }
  const { id } = await params;
  const body = await request.json().catch(() => null) as { orderStatus?: string } | null;
  if (!body?.orderStatus || !Object.hasOwn(transitions, body.orderStatus)) {
    return NextResponse.json({ message: "Trạng thái đơn hàng không hợp lệ." }, { status: 400 });
  }
  const current = await prisma.order.findUnique({ where: { id }, include: { order_items: true } });
  if (!current) return NextResponse.json({ message: "Không tìm thấy đơn hàng." }, { status: 404 });
  if (!transitions[current.order_status].includes(body.orderStatus)) {
    return NextResponse.json({ message: "Không thể chuyển sang trạng thái này." }, { status: 409 });
  }
  const updated = await prisma.$transaction(async (tx) => {
    await tx.$queryRaw`SELECT id FROM orders WHERE id = ${id}::uuid FOR UPDATE`;
    const locked = await tx.order.findUnique({ where: { id }, include: { order_items: true } });
    if (!locked) throw new Error("Không tìm thấy đơn hàng.");
    if (!transitions[locked.order_status].includes(body.orderStatus!)) throw new Error("Không thể chuyển sang trạng thái này.");
    if (body.orderStatus === "cancelled" && locked.paymentStatus === "paid") {
      const stockedItems = locked.order_items.filter((item) => item.product_id).sort((a, b) => a.product_id!.localeCompare(b.product_id!));
      for (const item of stockedItems) {
        await tx.$queryRaw`SELECT id FROM products WHERE id = ${item.product_id}::uuid FOR UPDATE`;
        await tx.products.update({ where: { id: item.product_id! }, data: { stock: { increment: item.quantity } } });
        await tx.inventory_movements.create({ data: {
          product_id: item.product_id!, changed_by: session.user.id, order_id: locked.id,
          quantity_delta: item.quantity, reason: "cancelled_order_return",
        } });
      }
    }
    return tx.order.update({
      where: { id },
      data: { order_status: body.orderStatus as "new" | "confirmed" | "processing" | "shipping" | "completed" | "cancelled" },
      select: { id: true, order_status: true, updatedAt: true },
    });
  }).catch((error: unknown) => {
    if (error instanceof Error && error.message === "Không tìm thấy đơn hàng.") return null;
    if (error instanceof Error && error.message === "Không thể chuyển sang trạng thái này.") return false;
    throw error;
  });
  if (updated === null) return NextResponse.json({ message: "Không tìm thấy đơn hàng." }, { status: 404 });
  if (updated === false) return NextResponse.json({ message: "Không thể chuyển sang trạng thái này." }, { status: 409 });
  return NextResponse.json({ orderStatus: updated.order_status, updatedAt: updated.updatedAt.toISOString() });
}
