'use client';

import { useEffect, useState } from 'react';
import {
  ShoppingBag,
  Banknote,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { StatCard } from '@/components/admin/ui/StatCard';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { CardSkeleton } from '@/components/admin/ui/LoadingState';
import { analyticsService } from '@/lib/admin/services';
import { orderService, productService } from '@/lib/admin/services';
import { DashboardKPIs, RevenueDataPoint, TopProduct } from '@/lib/admin/types/analytics';
import { AdminOrder, ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from '@/lib/admin/types/order';
import { AdminProduct, getStockStatus, STOCK_STATUS_LABELS } from '@/lib/admin/types/product';
import { formatCurrency, formatDateTime } from '@/lib/admin/utils/formatters';
import Link from 'next/link';
import dynamic from 'next/dynamic';

const DashboardCharts = dynamic(() => import('@/components/admin/DashboardCharts'), {
  loading: () => <div role="status" className="h-80 rounded-xl bg-white p-5 text-gray-400">Đang tải biểu đồ...</div>,
});

const ORDER_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand'> = {
  new: 'info',
  confirmed: 'brand',
  processing: 'warning',
  shipping: 'info',
  completed: 'success',
  cancelled: 'error',
};

export default function AdminDashboardPage() {
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [statusDist, setStatusDist] = useState<{ status: string; label: string; count: number; color: string }[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [recentOrders, setRecentOrders] = useState<AdminOrder[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true);
  const [productsLoading, setProductsLoading] = useState(true);
  const [ordersError, setOrdersError] = useState(false);
  const [productsError, setProductsError] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void analyticsService.getFullAnalytics().then(analytics => {
      if (!active) return;
      setKpis(analytics.kpis);
      setRevenueData(analytics.revenueByDay);
      setStatusDist(analytics.orderStatusDistribution);
      setTopProducts(analytics.topProducts);
    }).catch(err => {
      if (active) setLoadError(err instanceof Error ? err.message : 'Không tải được thống kê.');
    }).finally(() => { if (active) setLoading(false); });
    void orderService.getAll(undefined, 1, 5).then(result => {
      if (active) setRecentOrders(result.orders);
    }).catch(() => { if (active) setOrdersError(true); })
      .finally(() => { if (active) setOrdersLoading(false); });
    void productService.getAll({ stockStatus: 'attention' }).then(result => {
      if (active) setLowStockProducts(result.products);
    }).catch(() => { if (active) setProductsError(true); })
      .finally(() => { if (active) setProductsLoading(false); });
    return () => { active = false; };
  }, []);

  return (
    <div className="space-y-6">
      {loadError && <p role="alert" className="rounded-xl border border-rose-200 bg-white p-5 text-rose-700">{loadError} <button onClick={() => window.location.reload()} className="underline">Thử lại</button></p>}
      {loading && <div role="status" aria-label="Đang tải thống kê" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">{Array.from({ length: 5 }, (_, i) => <CardSkeleton key={i} />)}</div>}
      {kpis && <>
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Tổng đơn hàng"
          value={kpis?.totalOrders ?? 0}
          icon={ShoppingBag}
          color="brand"
        />
        <StatCard
          title="Doanh thu"
          value={formatCurrency(kpis?.totalRevenue ?? 0)}
          icon={Banknote}
          color="green"
          subtitle="Từ đơn đã thanh toán"
        />
        <StatCard
          title="Lợi nhuận"
          value={formatCurrency(kpis?.grossProfit ?? 0)}
          icon={Banknote}
          color="blue"
        />
        <StatCard
          title="Đơn mới chờ xử lý"
          value={kpis?.pendingOrders ?? 0}
          icon={Clock}
          color="amber"
          subtitle="Đã thanh toán, cần xác nhận"
        />
        <StatCard
          title="Sản phẩm sắp hết"
          value={(kpis?.lowStockProducts ?? 0) + (kpis?.outOfStockProducts ?? 0)}
          icon={AlertTriangle}
          color="red"
          subtitle={`${kpis?.outOfStockProducts ?? 0} hết hàng`}
        />
      </div>

      <DashboardCharts revenueData={revenueData} statusDist={statusDist} />
      </>}

      {/* Bottom Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Đơn hàng gần đây</h3>
            <Link href="/admin/orders" className="text-sm text-brand-500 hover:text-brand-600 font-medium">
              Xem tất cả →
            </Link>
          </div>
          <div className="divide-y divide-gray-50">
            {ordersLoading ? <p role="status" className="px-5 py-8 text-gray-400">Đang tải đơn hàng...</p> : ordersError ? <p role="alert" className="px-5 py-8 text-rose-700">Không tải được đơn hàng. Hãy tải lại trang để thử lại.</p> : recentOrders.length === 0 && <p className="px-5 py-8 text-center text-sm text-gray-400">Chưa có đơn hàng.</p>}
            {recentOrders.map((order) => (
              <Link
                key={order.id}
                href={`/admin/orders/${order.id}`}
                className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50/50 transition-colors"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-medium text-gray-900">{order.orderCode}</span>
                    <StatusBadge
                      label={ORDER_STATUS_LABELS[order.orderStatus]}
                      variant={ORDER_STATUS_VARIANT[order.orderStatus]}
                      dot={false}
                    />
                  </div>
                  <p className="text-xs text-gray-400">
                    {order.orderType === 'catalog_product' ? 'Vòng có sẵn' : 'Thiết kế 3D'} · {order.customer.fullName} · {PAYMENT_STATUS_LABELS[order.paymentStatus]} · {formatDateTime(order.createdAt)}
                  </p>
                </div>
                <span className="text-sm font-semibold text-gray-900 ml-4">
                  {formatCurrency(order.totalPrice)}
                </span>
              </Link>
            ))}
          </div>
        </div>

        {/* Low Stock / Inventory Alerts */}
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Cảnh báo tồn kho</h3>
            <div className="flex gap-3 text-sm font-medium"><Link href="/admin/products/catalog?stockStatus=attention" className="text-brand-500 hover:text-brand-600">Vòng bán sẵn</Link><Link href="/admin/beads?stockStatus=attention" className="text-brand-500 hover:text-brand-600">Các loại hạt</Link></div>
          </div>
          {productsLoading ? <p role="status" className="px-5 py-8 text-gray-400">Đang tải tồn kho...</p> : productsError ? <p role="alert" className="px-5 py-8 text-rose-700">Không tải được tồn kho. Hãy tải lại trang để thử lại.</p> : lowStockProducts.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Không có sản phẩm đang bán nào sắp hết hoặc hết hàng
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {lowStockProducts.slice(0, 5).map((product) => {
                const stockStatus = getStockStatus(product.stock, product.lowStockThreshold ?? kpis?.lowStockThreshold ?? 5);
                return (
                  <Link key={product.id} href={product.type === 'bead' ? '/admin/beads?stockStatus=attention' : '/admin/products/catalog?stockStatus=attention'} className="flex items-center justify-between px-5 py-3.5 hover:bg-gray-50">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-gray-900">{product.name}</p>
                      <p className="text-xs text-gray-400">SKU: {product.sku}</p>
                    </div>
                    <div className="flex items-center gap-3 ml-4">
                      <span className="text-sm font-medium text-gray-600">{product.stock} còn lại</span>
                      <StatusBadge
                        label={STOCK_STATUS_LABELS[stockStatus]}
                        variant={stockStatus === 'out_of_stock' ? 'error' : 'warning'}
                      />
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Top Products */}
      {topProducts.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="font-semibold text-gray-900">Sản phẩm bán chạy</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">#</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Đã bán</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Doanh thu</th>
                  <th className="text-right px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Lợi nhuận gộp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {topProducts.map((product, i) => (
                  <tr key={product.id} className="hover:bg-gray-50/50">
                    <td className="px-5 py-3 text-gray-400 font-medium">{i + 1}</td>
                    <td className="px-5 py-3 font-medium text-gray-900">{product.name}</td>
                    <td className="px-5 py-3 text-gray-500">{product.type}</td>
                    <td className="px-5 py-3 text-right text-gray-700">{product.sold}</td>
                    <td className="px-5 py-3 text-right font-medium text-gray-900">{formatCurrency(product.revenue)}</td>
                    <td className="px-5 py-3 text-right font-medium text-emerald-700">{formatCurrency(product.grossProfit)}{product.profitCoverage < 100 && <span className="ml-1 text-xs text-amber-700">({product.profitCoverage.toFixed(0)}%)</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
