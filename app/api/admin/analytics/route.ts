import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "admin") {
    return NextResponse.json({ message: "Không có quyền truy cập." }, { status: 403 });
  }

  try {
  const requestedDays = Number(new URL(request.url).searchParams.get("days")) || 7;
  const days = Math.min(30, Math.max(7, requestedDays));
  const settings = await prisma.store_settings.findUnique({ where: { id: 1 }, select: { low_stock_threshold: true } });
  const threshold = settings?.low_stock_threshold ?? 5;
  const businessTimeZone = "Asia/Ho_Chi_Minh";
  const todayParts = new Intl.DateTimeFormat("en-US", { timeZone: businessTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date());
  const year = Number(todayParts.find((part) => part.type === "year")?.value);
  const month = Number(todayParts.find((part) => part.type === "month")?.value);
  const day = Number(todayParts.find((part) => part.type === "day")?.value);
  const firstDay = Date.UTC(year, month - 1, day) - 7 * 60 * 60 * 1000 - (days - 1) * 86400000;
  const endDay = firstDay + days * 86400000;
  const [totalOrders, paidSummary, successfulPayments, pendingOrders, processingOrders, products, orderGroups, createdOrders, paidOrders] = await Promise.all([
    prisma.order.count(),
    prisma.order.aggregate({ where: { paymentStatus: "paid" }, _sum: { totalPrice: true } }),
    prisma.order.count({ where: { paymentStatus: "paid" } }),
    prisma.order.count({ where: { order_status: "new", paymentStatus: "paid" } }),
    prisma.order.count({ where: { order_status: { in: ["confirmed", "processing", "shipping"] } } }),
    prisma.products.findMany({ where: { status: "active" }, select: { id: true, name: true, stock: true, status: true } }),
    prisma.order.groupBy({ by: ["order_status"], _count: { _all: true } }),
    prisma.order.findMany({ where: { createdAt: { gte: new Date(firstDay), lt: new Date(endDay) } }, select: { createdAt: true } }),
    prisma.order.findMany({ where: { paymentStatus: "paid", createdAt: { gte: new Date(firstDay), lt: new Date(endDay) } }, select: { totalPrice: true, createdAt: true } }),
  ]);

  type PaidItem = { product_id: string | null; product_name: string; product_type: string; quantity: number | bigint; line_total: number | bigint; costed_line_total: number | bigint; total_cost: number | bigint; has_cost: boolean };
  let paidItems: PaidItem[];
  try {
    // Read the snapshot cost without relying on a possibly stale generated Prisma model.
    paidItems = await prisma.$queryRaw<PaidItem[]>`
      SELECT oi.product_id, oi.product_name, oi.product_type, SUM(oi.quantity)::bigint AS quantity,
        SUM(oi.line_total)::bigint AS line_total,
        COALESCE(SUM(oi.line_total) FILTER (WHERE oi.unit_cost IS NOT NULL), 0)::bigint AS costed_line_total,
        COALESCE(SUM(oi.unit_cost * oi.quantity) FILTER (WHERE oi.unit_cost IS NOT NULL), 0)::bigint AS total_cost,
        BOOL_OR(oi.unit_cost IS NOT NULL) AS has_cost
      FROM order_items AS oi
      INNER JOIN orders AS o ON o.id = oi.order_id
      WHERE o.payment_status = 'paid'
      GROUP BY oi.product_id, oi.product_name, oi.product_type
    `;
  } catch (error) {
    console.warn("Order item cost snapshot is unavailable; profit metrics will show incomplete coverage:", error);
    paidItems = await prisma.$queryRaw<PaidItem[]>`
      SELECT oi.product_id, oi.product_name, oi.product_type, SUM(oi.quantity)::bigint AS quantity,
        SUM(oi.line_total)::bigint AS line_total, 0::bigint AS costed_line_total,
        0::bigint AS total_cost, FALSE AS has_cost
      FROM order_items AS oi
      INNER JOIN orders AS o ON o.id = oi.order_id
      WHERE o.payment_status = 'paid'
      GROUP BY oi.product_id, oi.product_name, oi.product_type
    `;
  }

  const revenueByDay = Array.from({ length: days }, (_, index) => {
    const date = new Date(firstDay + index * 86400000);
    const nextDate = new Date(date.getTime() + 86400000);
    const dayOrders = paidOrders.filter((order) => {
      // Use createdAt here so analytics remains compatible with existing generated clients
      // that predate the optional paidAt field. Orders are paid at checkout in this flow.
      const paidDate = order.createdAt;
      return paidDate >= date && paidDate < nextDate;
    });
    const dayCreatedOrders = createdOrders.filter((order) => order.createdAt >= date && order.createdAt < nextDate);
    return {
      date: new Intl.DateTimeFormat("en-CA", { timeZone: businessTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(date),
      label: new Intl.DateTimeFormat("vi-VN", { timeZone: businessTimeZone, day: "2-digit", month: "2-digit" }).format(date),
      revenue: dayOrders.reduce((sum, order) => sum + order.totalPrice, 0),
      paidOrders: dayOrders.length,
      createdOrders: dayCreatedOrders.length,
    };
  });

  const activeProducts = products.filter((product) => product.status === "active");
  const lowStockProducts = activeProducts.filter((product) => product.stock > 0 && product.stock <= threshold).length;
  const outOfStockProducts = activeProducts.filter((product) => product.stock === 0).length;
  const totalRevenue = paidSummary._sum.totalPrice ?? 0;
  const costedItems = paidItems.filter((item) => item.has_cost);
  const costedRevenue = costedItems.reduce((sum, item) => sum + Number(item.costed_line_total), 0);
  const grossProfit = costedItems.reduce((sum, item) => sum + Number(item.costed_line_total) - Number(item.total_cost), 0);
  const productTotals = new Map<string, { id: string; name: string; type: string; sold: number; revenue: number; costedRevenue: number; grossProfit: number }>();
  for (const item of paidItems) {
    const id = item.product_id ?? `${item.product_type}:${item.product_name}`;
    const current = productTotals.get(id) ?? { id, name: item.product_name, type: item.product_type === "bead" ? "Hạt" : "Vòng tay", sold: 0, revenue: 0, costedRevenue: 0, grossProfit: 0 };
    current.sold += Number(item.quantity);
    current.revenue += Number(item.line_total);
    if (item.has_cost) {
      current.costedRevenue += Number(item.costed_line_total);
      current.grossProfit += Number(item.costed_line_total) - Number(item.total_cost);
    }
    productTotals.set(id, current);
  }
  const topProducts = [...productTotals.values()].map(({ costedRevenue, ...product }) => ({ ...product, profitCoverage: product.revenue ? Math.min(100, costedRevenue / product.revenue * 100) : 0 })).sort((a, b) => b.sold - a.sold).slice(0, 5);

  return NextResponse.json({
    kpis: {
      totalOrders,
      totalRevenue,
      grossProfit,
      profitCoverage: totalRevenue ? Math.min(100, (costedRevenue / totalRevenue) * 100) : 0,
      paidOrders: paidOrders.length,
      pendingOrders,
      processingOrders,
      activeProducts: activeProducts.length,
      lowStockProducts,
      outOfStockProducts,
      lowStockThreshold: threshold,
    },
    revenueByDay,
    orderStatusDistribution: orderGroups.map(({ order_status, _count }) => ({
      status: order_status,
      label: ({ new: "Mới", confirmed: "Đã xác nhận", processing: "Đang xử lý", shipping: "Đang giao", completed: "Hoàn tất", cancelled: "Đã hủy" } as Record<string, string>)[order_status] ?? order_status,
      count: _count._all,
      color: ({ new: "#3B82F6", confirmed: "#8B5CF6", processing: "#F59E0B", shipping: "#06B6D4", completed: "#10B981", cancelled: "#9CA3AF" } as Record<string, string>)[order_status] ?? "#E8829A",
    })),
    topProducts,
    paymentSuccessRate: totalOrders ? (successfulPayments / totalOrders) * 100 : 0,
  });
  } catch (error) {
    console.error("Admin analytics request failed:", error);
    return NextResponse.json({ message: "Không thể truy vấn dữ liệu tổng quan. Vui lòng kiểm tra kết nối cơ sở dữ liệu và cấu trúc bảng." }, { status: 503 });
  }
}
