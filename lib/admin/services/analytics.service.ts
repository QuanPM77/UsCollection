import { AnalyticsData, DashboardKPIs, RevenueDataPoint } from '../types/analytics';

async function getAnalytics(days = 7): Promise<AnalyticsData> {
  const response = await fetch(`/api/admin/analytics?days=${days}`);
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Không thể tải báo cáo (HTTP ${response.status}).`);
  return data as AnalyticsData;
}

export const analyticsService = {
  async getDashboardKPIs(): Promise<DashboardKPIs> { return (await getAnalytics()).kpis; },
  async getRevenueByDay(days = 7): Promise<RevenueDataPoint[]> { return (await getAnalytics(days)).revenueByDay; },
  async getOrderStatusDistribution() { return (await getAnalytics()).orderStatusDistribution; },
  async getTopProducts(limit = 5) { return (await getAnalytics()).topProducts.slice(0, limit); },
  async getFullAnalytics(days = 7): Promise<AnalyticsData> { return getAnalytics(days); },
};
