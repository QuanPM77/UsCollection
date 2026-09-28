// Analytics service — computes analytics from mock data
// Designed to be replaced with real analytics API

import { AnalyticsData, DashboardKPIs, RevenueDataPoint, OrderStatusDistribution, TopProduct } from '../types/analytics';
import { mockOrders } from '../mock-data';
import { mockProducts, mockBeadProducts } from '../mock-data';
import { ORDER_STATUS_LABELS } from '../types/order';
import { getStockStatus } from '../types/product';

function delay(ms: number = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

const ORDER_STATUS_COLORS: Record<string, string> = {
  new: '#3B82F6',
  confirmed: '#8B5CF6',
  processing: '#F59E0B',
  shipping: '#06B6D4',
  completed: '#10B981',
  cancelled: '#EF4444',
};

export const analyticsService = {
  async getDashboardKPIs(): Promise<DashboardKPIs> {
    await delay();
    const orders = mockOrders;
    const products = mockProducts;

    const paidOrders = orders.filter(o => o.paymentStatus === 'paid');
    const totalRevenue = paidOrders.reduce((sum, o) => sum + o.totalPrice, 0);

    return {
      totalOrders: orders.length,
      totalRevenue,
      paidOrders: paidOrders.length,
      pendingOrders: orders.filter(o => o.orderStatus === 'new').length,
      processingOrders: orders.filter(o => ['confirmed', 'processing', 'shipping'].includes(o.orderStatus)).length,
      activeProducts: products.filter(p => p.status === 'active').length,
      lowStockProducts: products.filter(p => getStockStatus(p.stock) === 'low_stock').length,
      outOfStockProducts: products.filter(p => getStockStatus(p.stock) === 'out_of_stock').length,
    };
  },

  async getRevenueByDay(days: number = 7): Promise<RevenueDataPoint[]> {
    await delay();
    const result: RevenueDataPoint[] = [];
    const now = new Date('2025-09-28T23:59:59Z');

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];
      const dayLabel = new Intl.DateTimeFormat('vi-VN', { day: '2-digit', month: '2-digit' }).format(date);

      const dayOrders = mockOrders.filter(o => {
        const orderDate = new Date(o.createdAt).toISOString().split('T')[0];
        return orderDate === dateStr && o.paymentStatus === 'paid';
      });

      result.push({
        date: dateStr,
        label: dayLabel,
        revenue: dayOrders.reduce((sum, o) => sum + o.totalPrice, 0),
        orders: dayOrders.length,
      });
    }

    return result;
  },

  async getOrderStatusDistribution(): Promise<OrderStatusDistribution[]> {
    await delay();
    const statusCounts: Record<string, number> = {};

    for (const order of mockOrders) {
      statusCounts[order.orderStatus] = (statusCounts[order.orderStatus] || 0) + 1;
    }

    return Object.entries(statusCounts).map(([status, count]) => ({
      status,
      label: ORDER_STATUS_LABELS[status as keyof typeof ORDER_STATUS_LABELS] || status,
      count,
      color: ORDER_STATUS_COLORS[status] || '#6B7280',
    }));
  },

  async getTopProducts(limit: number = 5): Promise<TopProduct[]> {
    await delay();
    // Calculate product popularity from orders
    const productSales: Record<string, { count: number; revenue: number }> = {};
    const beadMap = Object.fromEntries(mockBeadProducts.map(b => [b.id, b]));

    for (const order of mockOrders) {
      if (order.paymentStatus !== 'paid') continue;

      const beadCounts: Record<string, number> = {};
      for (const slot of order.braceletConfig.slots) {
        beadCounts[slot.beadTypeId] = (beadCounts[slot.beadTypeId] || 0) + 1;
      }

      for (const [beadId, count] of Object.entries(beadCounts)) {
        if (!productSales[beadId]) {
          productSales[beadId] = { count: 0, revenue: 0 };
        }
        productSales[beadId].count += count;
        const bead = beadMap[beadId];
        if (bead) {
          productSales[beadId].revenue += count * bead.price;
        }
      }
    }

    return Object.entries(productSales)
      .map(([id, data]) => ({
        id,
        name: beadMap[id]?.name || id,
        type: 'Hạt',
        sold: data.count,
        revenue: data.revenue,
      }))
      .sort((a, b) => b.sold - a.sold)
      .slice(0, limit);
  },

  async getFullAnalytics(): Promise<AnalyticsData> {
    const [kpis, revenueByDay, orderStatusDistribution, topProducts] = await Promise.all([
      this.getDashboardKPIs(),
      this.getRevenueByDay(7),
      this.getOrderStatusDistribution(),
      this.getTopProducts(5),
    ]);

    const paidCount = mockOrders.filter(o => o.paymentStatus === 'paid').length;
    const paymentSuccessRate = mockOrders.length > 0 ? (paidCount / mockOrders.length) * 100 : 0;

    return {
      kpis,
      revenueByDay,
      orderStatusDistribution,
      topProducts,
      paymentSuccessRate,
    };
  },
};
