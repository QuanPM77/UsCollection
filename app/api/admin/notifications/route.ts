import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });

  const settings = await prisma.store_settings.findUnique({ where: { id: 1 }, select: { low_stock_threshold: true } });
  const threshold = settings?.low_stock_threshold ?? 5;
  const [products, orders] = await Promise.all([
    prisma.products.findMany({ where: { status: "active", stock: { lte: threshold } }, select: { id: true, name: true, type: true, stock: true, updated_at: true }, orderBy: { updated_at: "desc" }, take: 10 }),
    prisma.order.findMany({ where: { order_status: "new", paymentStatus: "paid" }, include: { order_items: { select: { product_name: true } } }, orderBy: { createdAt: "desc" }, take: 10 }),
  ]);
  const notifications = [
    ...products.map((product) => ({ id: `stock:${product.id}:${product.stock}`, type: "stock" as const, title: product.stock === 0 ? "Sản phẩm đã hết hàng" : "Sản phẩm sắp hết hàng", message: `${product.name} · còn ${product.stock}`, href: product.type === "bead" ? "/admin/beads?stockStatus=attention" : "/admin/products/catalog?stockStatus=attention", createdAt: product.updated_at.toISOString() })),
    ...orders.map((order) => ({ id: `order:${order.id}`, type: "order" as const, title: "Đơn hàng cần xử lý", message: `#${order.orderCode} · ${order.order_items.map((item) => item.product_name).filter((name, index, list) => list.indexOf(name) === index).join(", ") || "Vòng tay thiết kế 3D"}`, href: "/admin/orders?orderStatus=new&paymentStatus=paid", createdAt: order.createdAt.toISOString() })),
  ].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 10);
  return NextResponse.json({ notifications });
}
