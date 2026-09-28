// Analytics types for the admin dashboard

export interface DashboardKPIs {
  totalOrders: number;
  totalRevenue: number;
  paidOrders: number;
  pendingOrders: number;
  processingOrders: number;
  activeProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
}

export interface RevenueDataPoint {
  date: string;
  label: string;
  revenue: number;
  orders: number;
}

export interface OrderStatusDistribution {
  status: string;
  label: string;
  count: number;
  color: string;
}

export interface TopProduct {
  id: string;
  name: string;
  type: string;
  sold: number;
  revenue: number;
}

export interface AnalyticsData {
  kpis: DashboardKPIs;
  revenueByDay: RevenueDataPoint[];
  orderStatusDistribution: OrderStatusDistribution[];
  topProducts: TopProduct[];
  paymentSuccessRate: number;
}
