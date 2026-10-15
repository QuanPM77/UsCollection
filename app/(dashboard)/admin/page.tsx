'use client';

import { useEffect, useState } from 'react';
import {
  ShoppingBag,
  DollarSign,
  Clock,
  AlertTriangle,
} from 'lucide-react';
import { StatCard } from '@/components/admin/ui/StatCard';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { CardSkeleton } from '@/components/admin/ui/LoadingState';
import { analyticsService } from '@/lib/admin/services';
import { orderService, productService } from '@/lib/admin/services';
import { DashboardKPIs, RevenueDataPoint, TopProduct } from '@/lib/admin/types/analytics';
import { AdminOrder, ORDER_STATUS_LABELS } from '@/lib/admin/types/order';
import { AdminProduct, getStockStatus, STOCK_STATUS_LABELS } from '@/lib/admin/types/product';
import { formatCurrency, formatDateTime, formatCompactNumber } from '@/lib/admin/utils/formatters';
import Link from 'next/link';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, Legend,
} from 'recharts';

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

  useEffect(() => {
    async function loadDashboard() {
      try {
        const [analytics, ordersResult, productsResult] = await Promise.all([
          analyticsService.getFullAnalytics(),
          orderService.getAll(undefined, 1, 5),
          productService.getAll({ stockStatus: 'low_stock' }),
        ]);

        setKpis(analytics.kpis);
        setRevenueData(analytics.revenueByDay);
        setStatusDist(analytics.orderStatusDistribution);
        setTopProducts(analytics.topProducts);
        setRecentOrders(ordersResult.orders);
        setLowStockProducts(productsResult.products);
      } catch (err) {
        console.error('Dashboard load error:', err);
      } finally {
        setLoading(false);
      }
    }
    loadDashboard();
  }, []);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <CardSkeleton key={i} />)}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          title="Tổng đơn hàng"
          value={kpis?.totalOrders ?? 0}
          icon={ShoppingBag}
          color="brand"
        />
        <StatCard
          title="Doanh thu"
          value={formatCurrency(kpis?.totalRevenue ?? 0)}
          icon={DollarSign}
          color="green"
          subtitle="Từ đơn đã thanh toán"
        />
        <StatCard
          title="Đơn chờ xử lý"
          value={kpis?.pendingOrders ?? 0}
          icon={Clock}
          color="amber"
        />
        <StatCard
          title="Sản phẩm sắp hết"
          value={(kpis?.lowStockProducts ?? 0) + (kpis?.outOfStockProducts ?? 0)}
          icon={AlertTriangle}
          color="red"
          subtitle={`${kpis?.outOfStockProducts ?? 0} hết hàng`}
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Revenue Chart */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Doanh thu 7 ngày gần nhất</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 5, right: 5, bottom: 5, left: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F1F5F9" />
                <XAxis dataKey="label" tick={{ fontSize: 12, fill: '#94A3B8' }} axisLine={false} tickLine={false} />
                <YAxis
                  tick={{ fontSize: 12, fill: '#94A3B8' }}
                  axisLine={false}
                  tickLine={false}
                  tickFormatter={(v) => formatCompactNumber(v)}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                  formatter={(value) => [formatCurrency(Number(value) || 0), 'Doanh thu']}
                />
                <Bar dataKey="revenue" fill="#E8829A" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Distribution */}
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Trạng thái đơn hàng</h3>
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDist}
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  dataKey="count"
                  nameKey="label"
                  strokeWidth={2}
                  stroke="#fff"
                >
                  {statusDist.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'white',
                    border: '1px solid #E2E8F0',
                    borderRadius: '8px',
                    fontSize: '13px',
                  }}
                />
                <Legend
                  verticalAlign="bottom"
                  iconSize={8}
                  wrapperStyle={{ fontSize: '12px' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

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
                    {order.customer.fullName} · {formatDateTime(order.createdAt)}
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
            <Link href="/admin/products" className="text-sm text-brand-500 hover:text-brand-600 font-medium">
              Quản lý kho →
            </Link>
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm text-gray-400">
              Tất cả sản phẩm đều có đủ hàng
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {lowStockProducts.slice(0, 5).map((product) => {
                const stockStatus = getStockStatus(product.stock);
                return (
                  <div key={product.id} className="flex items-center justify-between px-5 py-3.5">
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
                  </div>
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
