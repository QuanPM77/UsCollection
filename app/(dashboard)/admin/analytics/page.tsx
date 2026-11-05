'use client';

import { useEffect, useState, useRef } from 'react';
import {
  TrendingUp,
  DollarSign,
  ShoppingBag,
  Percent,
  RefreshCw,
} from 'lucide-react';
import { StatCard } from '@/components/admin/ui/StatCard';
import { CardSkeleton } from '@/components/admin/ui/LoadingState';
import { analyticsService } from '@/lib/admin/services';
import { DashboardKPIs, RevenueDataPoint, TopProduct } from '@/lib/admin/types/analytics';
import { formatCurrency, formatNumber } from '@/lib/admin/utils/formatters';
import dynamic from 'next/dynamic';
const AnalyticsCharts = dynamic(() => import('@/components/admin/AnalyticsCharts'), {
  loading: () => <div role="status" className="h-80 rounded-xl bg-white p-5 text-stone-500">Đang tải biểu đồ...</div>,
});

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

  const activeRequest = useRef<AbortController | null>(null);

  const loadData = async (days: 7 | 14 | 30) => {
    activeRequest.current?.abort();
    const controller = new AbortController();
    activeRequest.current = controller;
    setLoadError(false);
    try {
      const fullAnalytics = await analyticsService.getFullAnalytics(days, controller.signal);
      if (controller.signal.aborted) return;

      setKpis(fullAnalytics.kpis);
      setRevenueData(fullAnalytics.revenueByDay);
      setStatusDist(fullAnalytics.orderStatusDistribution);
      setTopProducts(fullAnalytics.topProducts);
      setPaymentRate(fullAnalytics.paymentSuccessRate);
    } catch (err) {
      if (controller.signal.aborted) return;
      console.error('Analytics load error:', err);
      setLoadError(true);
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  useEffect(() => {
    void loadData(timeRange);
    return () => activeRequest.current?.abort();
  }, [timeRange]);

  const handleRefresh = () => {
    setRefreshing(true);
    loadData(timeRange);
  };

  const aov = kpis && kpis.paidOrders > 0
    ? Math.round(kpis.totalRevenue / kpis.paidOrders)
    : 0;


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

      <AnalyticsCharts revenueData={revenueData} statusDist={statusDist} topProducts={topProducts} kpis={kpis} timeRange={timeRange} />
    </div>
  );
}
