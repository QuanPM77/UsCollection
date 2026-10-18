'use client';

import { useEffect, useState } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Percent,
  Calendar,
  Award,
  RefreshCw,
} from 'lucide-react';
import { StatCard } from '@/components/admin/ui/StatCard';
import { CardSkeleton } from '@/components/admin/ui/LoadingState';
import { analyticsService } from '@/lib/admin/services';
import { DashboardKPIs, RevenueDataPoint, TopProduct } from '@/lib/admin/types/analytics';
import { formatCurrency, formatNumber } from '@/lib/admin/utils/formatters';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  AreaChart,
  Area,
} from 'recharts';

export default function AnalyticsPage() {
  const [timeRange, setTimeRange] = useState<7 | 14 | 30>(7);
  const [kpis, setKpis] = useState<DashboardKPIs | null>(null);
  const [revenueData, setRevenueData] = useState<RevenueDataPoint[]>([]);
  const [statusDist, setStatusDist] = useState<{ status: string; label: string; count: number; color: string }[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [paymentRate, setPaymentRate] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadError, setLoadError] = useState(false);

  const loadData = async (days: 7 | 14 | 30) => {
    setLoadError(false);
    try {
      const fullAnalytics = await analyticsService.getFullAnalytics(days);

      setKpis(fullAnalytics.kpis);
      setRevenueData(fullAnalytics.revenueByDay);
      setStatusDist(fullAnalytics.orderStatusDistribution);
      setTopProducts(fullAnalytics.topProducts);
      setPaymentRate(fullAnalytics.paymentSuccessRate);
    } catch (err) {
      console.error('Analytics load error:', err);
      setLoadError(true);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadData(timeRange);
  }, [timeRange]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(timeRange);
  };

  const aov = kpis && kpis.paidOrders > 0
    ? Math.round(kpis.totalRevenue / kpis.paidOrders)
    : 0;

  const totalPeriodRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalPeriodPaidOrders = revenueData.reduce((sum, item) => sum + item.paidOrders, 0);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div className="h-8 w-48 bg-stone-200 animate-pulse rounded" />
          <div className="h-10 w-36 bg-stone-200 animate-pulse rounded" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
          <CardSkeleton />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="h-80 bg-white border border-stone-200 rounded-xl animate-pulse" />
          <div className="h-80 bg-white border border-stone-200 rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (loadError && !kpis) return <div role="alert" className="rounded-xl border border-rose-200 bg-white p-8 text-center"><h2 className="font-semibold text-stone-900">Không tải được báo cáo</h2><p className="mt-2 text-sm text-stone-500">Không thể hiển thị số liệu cho đến khi máy chủ trả dữ liệu.</p><button onClick={() => { setLoading(true); loadData(timeRange); }} className="mt-4 rounded-lg bg-rose-600 px-4 py-2 text-sm font-semibold text-white">Thử lại</button></div>;

  return (
    <div className="space-y-6">
      {loadError && <p role="alert" className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">Làm mới thất bại; đang hiển thị dữ liệu tải thành công gần nhất.</p>}
      {/* Header with Title and Range Picker */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Báo cáo & Phân tích
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Hiệu suất kinh doanh, doanh thu, lợi nhuận gộp và xu hướng đơn hàng
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Time range buttons */}
          <div className="inline-flex items-center bg-stone-100 p-1 rounded-lg border border-stone-200">
            <button
              onClick={() => setTimeRange(7)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                timeRange === 7
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              7 ngày
            </button>
            <button
              onClick={() => setTimeRange(14)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                timeRange === 14
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              14 ngày
            </button>
            <button
              onClick={() => setTimeRange(30)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${
                timeRange === 30
                  ? 'bg-white text-stone-900 shadow-sm'
                  : 'text-stone-600 hover:text-stone-900'
              }`}
            >
              30 ngày
            </button>
          </div>

          {/* Refresh button */}
          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="p-2 text-stone-600 hover:text-stone-900 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin text-pink-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          title="Doanh thu trọn đời"
          value={formatCurrency(kpis?.totalRevenue || 0)}
          icon={DollarSign}
          color="brand"
        />
        <StatCard
          title="Đơn mới chờ xác nhận"
          value={kpis?.pendingOrders || 0}
          icon={ShoppingBag}
          color="amber"
        />
        <StatCard
          title="Lợi nhuận gộp theo giá vốn đã ghi nhận"
          value={formatCurrency(kpis?.grossProfit || 0)}
          icon={DollarSign}
          color="green"
          trend={{ value: `${(kpis?.profitCoverage ?? 0).toFixed(0)}% doanh số có giá vốn`, positive: (kpis?.profitCoverage ?? 0) > 0 }}
        />
        <StatCard
          title="Giá trị đơn trung bình (AOV)"
          value={formatCurrency(aov)}
          icon={TrendingUp}
          color="blue"
          trend={{ value: 'Dựa trên tổng tiền của các đơn đã thanh toán', positive: true }}
        />
        <StatCard
          title="Tỷ lệ thanh toán thành công"
          value={`${paymentRate.toFixed(1)}%`}
          icon={Percent}
          color="purple"
          trend={{ value: 'Đã thanh toán / tổng đơn đã tạo', positive: true }}
        />
      </div>

      {/* Revenue & Volume Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Revenue Trend Chart */}
        <div className="lg:col-span-2 bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                Xu hướng doanh thu ({timeRange} ngày gần nhất)
              </h2>
              <p className="text-xs text-stone-500 mt-0.5">
                Tổng tiền các đơn đã thanh toán: <span className="font-semibold text-stone-800">{formatCurrency(totalPeriodRevenue)}</span> • {totalPeriodPaidOrders} đơn. Đơn cũ dùng ngày tạo làm mốc ước tính.
              </p>
            </div>
            <span className="inline-flex items-center gap-1.5 text-xs font-medium text-pink-600 bg-pink-50 px-2.5 py-1 rounded-full border border-pink-100">
              <Calendar className="w-3.5 h-3.5" />
              {timeRange} ngày qua
            </span>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={revenueData} margin={{ top: 10, right: 10, left: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#E05273" stopOpacity={0.25} />
                    <stop offset="95%" stopColor="#E05273" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(val) => `${val / 1000}k`}
                />
                <Tooltip
                  formatter={(val) => [formatCurrency(Number(val) || 0), 'Doanh thu']}
                  labelFormatter={(lbl) => `Ngày ${lbl}`}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#E5E7EB',
                    borderRadius: '8px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
                    fontSize: '12px',
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="revenue"
                  stroke="#E05273"
                  strokeWidth={2.5}
                  fillOpacity={1}
                  fill="url(#colorRevenue)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Order Status Distribution Pie Chart */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-stone-900">
              Phân bổ trạng thái đơn
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Cơ cấu đơn hàng theo tiến độ xử lý
            </p>
          </div>

          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusDist}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={75}
                  paddingAngle={4}
                  dataKey="count"
                >
                  {statusDist.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val, name, props) => [
                    `${val} đơn (${Math.round((Number(val) / (kpis?.totalOrders || 1)) * 100)}%)`,
                    props.payload.label,
                  ]}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#E5E7EB',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Custom Status Legend List */}
          <div className="space-y-1.5 pt-2 border-t border-stone-100 max-h-36 overflow-y-auto">
            {statusDist.map((item) => (
              <div key={item.status} className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-stone-600">{item.label}</span>
                </div>
                <div className="flex items-center gap-2 font-medium text-stone-900">
                  <span>{item.count}</span>
                  <span className="text-stone-400 text-[10px]">
                    ({Math.round((item.count / (kpis?.totalOrders || 1)) * 100)}%)
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Daily Order Volume Bar Chart & Top Products */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Orders Bar Chart */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs">
          <div className="mb-4">
            <h2 className="text-base font-semibold text-stone-900">
              Số lượng đơn theo ngày
            </h2>
            <p className="text-xs text-stone-500 mt-0.5">
              Số đơn hàng được tạo mỗi ngày trong giai đoạn chọn
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#F3F4F6" vertical={false} />
                <XAxis
                  dataKey="label"
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={{ stroke: '#E5E7EB' }}
                />
                <YAxis
                  stroke="#9CA3AF"
                  fontSize={12}
                  tickLine={false}
                  axisLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  formatter={(val) => [`${val} đơn`, 'Số đơn']}
                  labelFormatter={(lbl) => `Ngày ${lbl}`}
                  contentStyle={{
                    backgroundColor: '#ffffff',
                    borderColor: '#E5E7EB',
                    borderRadius: '8px',
                    fontSize: '12px',
                  }}
                />
                <Bar dataKey="createdOrders" fill="#F472B6" radius={[4, 4, 0, 0]} maxBarSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top Bead Types / Products Table */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <h2 className="text-base font-semibold text-stone-900">
                  Sản phẩm bán chạy nhất
                </h2>
                <p className="text-xs text-stone-500 mt-0.5">
                  Xếp hạng theo số lượng sản phẩm trong các đơn đã thanh toán
                </p>
              </div>
              <Award className="w-5 h-5 text-amber-500" />
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-stone-200 text-stone-500">
                    <th className="pb-2.5 font-medium">Xếp hạng</th>
                    <th className="pb-2.5 font-medium">Sản phẩm</th>
                    <th className="pb-2.5 font-medium text-right">Đã bán</th>
                    <th className="pb-2.5 font-medium text-right">Doanh số</th>
                    <th className="pb-2.5 font-medium text-right">Lợi nhuận gộp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {topProducts.map((prod, idx) => (
                    <tr key={prod.id} className="hover:bg-stone-50/60 transition-colors">
                      <td className="py-2.5 font-semibold text-stone-400">
                        <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[11px] ${
                          idx === 0 ? 'bg-amber-100 text-amber-800 font-bold' :
                          idx === 1 ? 'bg-stone-200 text-stone-700' :
                          idx === 2 ? 'bg-amber-50 text-amber-700' :
                          'text-stone-500'
                        }`}>
                          {idx + 1}
                        </span>
                      </td>
                      <td className="py-2.5 font-medium text-stone-900">
                        {prod.name} <span className="font-normal text-stone-500">({prod.type})</span>
                      </td>
                      <td className="py-2.5 text-right font-medium text-stone-700">
                        {formatNumber(prod.sold)} sản phẩm
                      </td>
                      <td className="py-2.5 text-right font-semibold text-pink-600">
                        {formatCurrency(prod.revenue)}
                      </td>
                      <td className="py-2.5 text-right font-semibold text-emerald-700">
                        {formatCurrency(prod.grossProfit)}{prod.profitCoverage < 100 && <span className="ml-1 text-amber-700">({prod.profitCoverage.toFixed(0)}%)</span>}
                      </td>
                    </tr>
                  ))}
                  {topProducts.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-6 text-center text-stone-400">
                        Chưa có dữ liệu sản phẩm bán ra
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 flex items-center justify-between text-xs text-stone-500">
            <span>Số liệu lấy từ đơn đã thanh toán; lợi nhuận gộp chỉ tính phần có giá vốn</span>
            <span className="font-medium text-stone-700">{topProducts.length} sản phẩm nổi bật</span>
          </div>
        </div>
      </div>
    </div>
  );
}
