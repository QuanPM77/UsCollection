import Link from "next/link";
import MainMenu from "@/components/MainMenu";
import { requireRole } from "@/lib/guard";
import { prisma } from "@/lib/prisma";

const paymentLabels: Record<string, string> = { pending: "Chờ thanh toán", paid: "Đã thanh toán", failed: "Thanh toán thất bại" };
const orderLabels: Record<string, string> = { new: "Chờ cửa hàng xác nhận", confirmed: "Đã xác nhận", processing: "Đang xử lý", shipping: "Đang giao", completed: "Hoàn tất", cancelled: "Đã hủy" };
const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

export default async function TransactionsPage() {
  const session = await requireRole("customer");
  const orders = await prisma.order.findMany({
    where: { user_id: session.user.id },
    include: { order_items: true },
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-light via-cream to-white text-pink-text">
      <header className="flex items-center gap-4 border-b border-pink-mid/25 bg-white/70 px-6 py-4">
        <MainMenu />
        <Link href="/" className="font-display text-xl font-bold">UsStory</Link>
      </header>
      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="font-display text-3xl font-bold">Lịch sử giao dịch</h1><p className="mt-2 text-sm text-pink-text/65">Theo dõi đơn vòng tay có sẵn và thiết kế 3D của bạn.</p></div>
          <span className="text-sm text-pink-text/60">{orders.length} đơn hàng</span>
        </div>
        {orders.length === 0 ? (
          <div className="rounded-2xl border border-pink-mid/30 bg-white p-10 text-center shadow-sm"><div className="mb-3 text-4xl">🧾</div><p>Bạn chưa có giao dịch nào.</p><Link href="/customizer" className="mt-5 inline-block rounded-xl bg-pink-deep px-5 py-3 text-sm font-semibold text-white">Thiết kế vòng tay</Link></div>
        ) : (
          <div className="space-y-4">{orders.map((order) => {
            const isCatalog = order.order_items.some((item) => item.product_type === "bracelet") || (typeof order.braceletConfig === "object" && order.braceletConfig !== null && "kind" in order.braceletConfig && order.braceletConfig.kind === "catalog_product");
            return <article key={order.id} className="rounded-2xl border border-pink-mid/30 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-pink-mid/20 pb-4">
                <div><p className="text-xs text-pink-text/55">Mã đơn</p><p className="mt-1 font-mono text-lg font-bold text-pink-deep">{String(order.orderCode)}</p><p className="mt-1 text-xs text-pink-text/55">{order.createdAt.toLocaleString("vi-VN")}</p></div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-pink-light px-3 py-1.5">{isCatalog ? "Vòng tay có sẵn" : "Thiết kế 3D"}</span><span className="rounded-full bg-gray-100 px-3 py-1.5">{orderLabels[order.order_status] ?? order.order_status}</span><span className="rounded-full bg-gray-100 px-3 py-1.5">{paymentLabels[order.paymentStatus] ?? order.paymentStatus}</span></div>
              </div>
              <div className="grid gap-5 pt-4 sm:grid-cols-[1fr_auto]">
                <div><h2 className="text-sm font-semibold">{isCatalog ? "Sản phẩm" : "Các loại hạt trong thiết kế"}</h2><ul className="mt-2 space-y-1.5 text-sm text-pink-text/75">{order.order_items.length ? order.order_items.map((item) => <li key={item.id}>{item.product_name}{item.sku ? ` (${item.sku})` : ""} × {item.quantity} · {money(item.line_total)}</li>) : <li>Vòng tay thiết kế 3D</li>}</ul><p className="mt-4 text-xs text-pink-text/60">Người nhận: {order.customerName} · {order.customerPhone}<br />Địa chỉ: {order.customerAddress}</p></div>
                <div className="text-right"><p className="text-xs text-pink-text/55">Tổng thanh toán</p><p className="mt-1 text-lg font-bold text-pink-deep">{money(order.totalPrice)}</p></div>
              </div>
            </article>;
          })}</div>
        )}
      </section>
    </main>
  );
}
