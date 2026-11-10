import Link from "next/link";
import SiteHeader from "@/components/SiteHeader";
import { requireRole } from "@/lib/guard";
import { prisma } from "@/lib/prisma";
import { transactionFilters, type TransactionQuery } from "@/lib/transaction-filters";
import { pageNumber } from "@/lib/pagination";

const paymentLabels: Record<string, string> = { pending: "Chờ thanh toán", paid: "Đã thanh toán", failed: "Thanh toán thất bại" };
const orderLabels: Record<string, string> = { new: "Chờ cửa hàng xác nhận", confirmed: "Đã xác nhận", processing: "Đang xử lý", shipping: "Đang giao", completed: "Hoàn tất", cancelled: "Đã hủy" };
const money = (value: number) => new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(value);

export default async function TransactionsPage({ searchParams }: { searchParams: Promise<TransactionQuery> }) {
  const [session, query] = await Promise.all([requireRole("customer"), searchParams]);
  const page = pageNumber(query.page);
  const pageSize = 20;
  const filters = transactionFilters(session.user.id, query);
  const [orders, total] = filters.error ? [[], 0] : await Promise.all([prisma.order.findMany({
    where: filters.where,
    select: {
      id: true, orderCode: true, createdAt: true, braceletConfig: true,
      order_status: true, paymentStatus: true, totalPrice: true,
      customerName: true, customerPhone: true, customerAddress: true,
      order_items: { select: { id: true, product_type: true, product_name: true, sku: true, quantity: true, line_total: true } },
    },
    orderBy: [{ createdAt: "desc" }, { id: "desc" }],
    take: pageSize, skip: (page - 1) * pageSize,
  }), prisma.order.count({ where: filters.where })]);
  const pages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <main className="min-h-screen bg-gradient-to-br from-pink-light via-cream to-white text-pink-text">
      <SiteHeader />
      <section className="w-full px-4 py-10 sm:px-8 lg:px-12">
        <div className="mb-7 flex flex-wrap items-end justify-between gap-3">
          <div><h1 className="font-display text-3xl font-bold">Lịch sử giao dịch</h1><p className="mt-2 text-sm text-pink-text/65">Theo dõi đơn vòng tay có sẵn và thiết kế 3D của bạn.</p></div>
          <span className="text-sm text-pink-text/60">{total} đơn hàng</span>
        </div>
        <form key={JSON.stringify([filters.search, filters.dateFrom, filters.dateTo])} action="/transactions" method="get" className="mb-6 grid items-end gap-4 rounded-2xl border border-pink-mid/30 bg-white p-4 shadow-sm sm:grid-cols-2 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)_minmax(0,1fr)_auto]">
          <label className="text-sm font-semibold">Mã đơn hoặc tên sản phẩm
            <input type="search" name="search" defaultValue={filters.search} maxLength={200} placeholder="Nhập mã đơn hoặc tên sản phẩm..." className="mt-2 w-full rounded-xl border border-pink-mid/40 px-3 py-3 text-base font-normal outline-none focus:border-pink-deep" />
          </label>
          <label className="text-sm font-semibold">Từ ngày
            <input type="date" name="dateFrom" defaultValue={filters.dateFrom} className="mt-2 w-full min-w-0 rounded-xl border border-pink-mid/40 px-3 py-3 text-base font-normal outline-none focus:border-pink-deep" />
          </label>
          <label className="text-sm font-semibold">Đến ngày
            <input type="date" name="dateTo" defaultValue={filters.dateTo} className="mt-2 w-full min-w-0 rounded-xl border border-pink-mid/40 px-3 py-3 text-base font-normal outline-none focus:border-pink-deep" />
          </label>
          <div className="flex min-h-12 items-center gap-3">
            <button type="submit" className="rounded-xl bg-rose-600 px-5 py-3 text-sm font-semibold text-white hover:bg-rose-700">Tìm kiếm</button>
            {filters.active && <Link href="/transactions" className="whitespace-nowrap px-2 py-3 text-sm font-semibold text-pink-text underline">Xóa lọc</Link>}
          </div>
          <p className="text-xs text-pink-text/60 sm:col-span-2 lg:col-span-4">Lọc theo ngày tạo đơn, theo giờ Việt Nam.</p>
        </form>
        {filters.error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{filters.error}</p> : orders.length === 0 && total > 0 ? <p className="py-8">Không có đơn hàng ở trang này. <Link href={filters.href()} className="underline">Về trang đầu</Link></p> : orders.length === 0 ? (
          <div className="rounded-2xl border border-pink-mid/30 bg-white p-10 text-center shadow-sm"><div className="mb-3 text-4xl">🧾</div><p>{filters.active ? "Không tìm thấy đơn hàng phù hợp. Hãy thử từ khóa hoặc khoảng ngày khác." : "Bạn chưa có giao dịch nào."}</p></div>
        ) : (
          <div className="space-y-4">{orders.map((order) => {
            const isCatalog = order.order_items.some((item) => item.product_type === "bracelet") || (typeof order.braceletConfig === "object" && order.braceletConfig !== null && "kind" in order.braceletConfig && order.braceletConfig.kind === "catalog_product");
            return <article key={order.id} className="rounded-2xl border border-pink-mid/30 bg-white p-5 shadow-sm sm:p-6">
              <div className="flex flex-wrap items-start justify-between gap-4 border-b border-pink-mid/20 pb-4">
                <div><p className="text-xs text-pink-text/55">Mã đơn</p><p className="mt-1 font-mono text-lg font-bold text-pink-deep">{String(order.orderCode)}</p><p className="mt-1 text-xs text-pink-text/55">{order.createdAt.toLocaleString("vi-VN", { timeZone: "Asia/Ho_Chi_Minh" })}</p></div>
                <div className="flex flex-wrap gap-2 text-xs font-semibold"><span className="rounded-full bg-pink-light px-3 py-1.5">{isCatalog ? "Vòng tay có sẵn" : "Thiết kế 3D"}</span><span className="rounded-full bg-gray-100 px-3 py-1.5">{orderLabels[order.order_status] ?? order.order_status}</span><span className="rounded-full bg-gray-100 px-3 py-1.5">{paymentLabels[order.paymentStatus] ?? order.paymentStatus}</span></div>
              </div>
              <div className="grid gap-5 pt-4 sm:grid-cols-[1fr_auto]">
                <div><h2 className="text-sm font-semibold">{isCatalog ? "Sản phẩm" : "Các loại hạt trong thiết kế"}</h2><ul className="mt-2 space-y-1.5 text-sm text-pink-text/75">{order.order_items.length ? order.order_items.map((item) => <li key={item.id}>{item.product_name}{item.sku ? ` (${item.sku})` : ""} × {item.quantity} · {money(item.line_total)}</li>) : <li>Vòng tay thiết kế 3D</li>}</ul><p className="mt-4 text-xs text-pink-text/60">Người nhận: {order.customerName} · {order.customerPhone}<br />Địa chỉ: {order.customerAddress}</p></div>
                <div className="text-right"><p className="text-xs text-pink-text/55">Tổng thanh toán</p><p className="mt-1 text-lg font-bold text-pink-deep">{money(order.totalPrice)}</p></div>
              </div>
            </article>;
          })}</div>
        )}
        {pages > 1 && <nav aria-label="Phân trang giao dịch" className="mt-6 flex items-center justify-between gap-4 text-sm">
          {page > 1 ? <Link href={filters.href(Math.min(page - 1, pages))} className="rounded-xl border bg-white px-4 py-2">Trang trước</Link> : <span />}
          <span>Trang {page} / {pages}</span>
          {page < pages ? <Link href={filters.href(page + 1)} className="rounded-xl border bg-white px-4 py-2">Trang sau</Link> : <span />}
        </nav>}
      </section>
    </main>
  );
}
