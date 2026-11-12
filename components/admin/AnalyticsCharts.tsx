"use client";
import { Calendar, Award } from "lucide-react";
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
import { formatCurrency, formatNumber } from '@/lib/admin/utils/formatters';
import type { DashboardKPIs, RevenueDataPoint, TopProduct, OrderStatusDistribution } from '@/lib/admin/types/analytics';

export default function AnalyticsCharts({ revenueData, statusDist, topProducts, kpis, timeRange }: {
  revenueData: RevenueDataPoint[]; statusDist: OrderStatusDistribution[];
  topProducts: TopProduct[]; kpis: DashboardKPIs | null; timeRange: number;
}) {
  const totalPeriodRevenue = revenueData.reduce((sum, item) => sum + item.revenue, 0);
  const totalPeriodPaidOrders = revenueData.reduce((sum, item) => sum + item.paidOrders, 0);
  return <>
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
                  formatter={(val, _name, props) => [
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
  </>;
}
