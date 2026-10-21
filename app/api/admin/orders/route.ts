import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  }

  try {
  const url = new URL(request.url);
  const page = Math.max(1, Number(url.searchParams.get("page")) || 1);
  const pageSize = Math.min(50, Math.max(1, Number(url.searchParams.get("pageSize")) || 10));
  const search = url.searchParams.get("search")?.trim();
  const orderTypes = [...new Set(url.searchParams.getAll("orderType").filter((value) => value === "catalog_product" || value === "custom_design"))];
  const status = url.searchParams.get("orderStatus");
  const paymentStatus = url.searchParams.get("paymentStatus");
  const dateFrom = url.searchParams.get("dateFrom");
  const dateTo = url.searchParams.get("dateTo");
  const validStatuses = ["new", "confirmed", "processing", "shipping", "completed", "cancelled"];
  const conditions: Prisma.OrderWhereInput[] = [];
  if (search) conditions.push({ OR: [
      { customerName: { contains: search, mode: "insensitive" as const } },
      { customerPhone: { contains: search } },
      { order_items: { some: { product_name: { contains: search, mode: "insensitive" as const } } } },
      ...(/^\d{1,19}$/.test(search) ? [{ orderCode: BigInt(search) }] : []),
  ] });
  if (orderTypes.length === 1) conditions.push(orderTypes[0] === "catalog_product"
    ? { OR: [
        { order_items: { some: { product_type: "bracelet" } } },
        { braceletConfig: { path: ["kind"], equals: "catalog_product" } },
      ] }
    : { AND: [
        { order_items: { none: { product_type: "bracelet" } } },
        { NOT: { braceletConfig: { path: ["kind"], equals: "catalog_product" } } },
      ] });
  if (status && validStatuses.includes(status)) conditions.push({ order_status: status as "new" | "confirmed" | "processing" | "shipping" | "completed" | "cancelled" });
  if (paymentStatus && ["pending", "paid", "failed"].includes(paymentStatus)) conditions.push({ paymentStatus });
  if (dateFrom || dateTo) conditions.push({ createdAt: {
      ...(dateFrom && !Number.isNaN(Date.parse(dateFrom)) ? { gte: new Date(`${dateFrom}T00:00:00`) } : {}),
      ...(dateTo && !Number.isNaN(Date.parse(dateTo)) ? { lte: new Date(`${dateTo}T23:59:59.999`) } : {}),
    } });
  const where: Prisma.OrderWhereInput = { AND: conditions };
  const [orders, total] = await Promise.all([
    prisma.order.findMany({ where, include: { order_items: true }, orderBy: { createdAt: "desc" }, skip: (page - 1) * pageSize, take: pageSize }),
    prisma.order.count({ where }),
  ]);
  return NextResponse.json({
    orders: orders.map((order) => ({
      id: order.id,
      orderCode: String(order.orderCode),
      orderType: order.order_items.some((item) => item.product_type === "bracelet") || (typeof order.braceletConfig === "object" && order.braceletConfig !== null && "kind" in order.braceletConfig && order.braceletConfig.kind === "catalog_product") ? "catalog_product" : "custom_design",
      productName: order.order_items.map((item) => item.product_name).filter((name, index, list) => list.indexOf(name) === index).join(", ") || "Vòng tay thiết kế 3D",
      customer: { fullName: order.customerName, phone: order.customerPhone, address: order.customerAddress },
      braceletConfig: order.braceletConfig,
      paymentMethod: order.payment_method,
      paymentStatus: order.paymentStatus,
      inventoryReviewRequired: order.inventoryReviewRequired,
      orderStatus: order.order_status,
      totalPrice: order.totalPrice,
      note: order.note,
      createdAt: order.createdAt.toISOString(),
      updatedAt: order.updatedAt.toISOString(),
      items: order.order_items.map((item) => ({ productName: item.product_name, productType: item.product_type, sku: item.sku, quantity: item.quantity, unitPrice: item.unit_price, unitCost: item.unit_cost, lineTotal: item.line_total, details: item.details })),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.ceil(total / pageSize),
  });
  } catch (error) {
    console.error("Admin orders request failed:", error);
    return NextResponse.json({ message: "Không thể tải danh sách đơn hàng. Vui lòng kiểm tra kết nối cơ sở dữ liệu." }, { status: 503 });
  }
}
