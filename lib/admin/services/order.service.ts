// Order service — abstracts data access for orders
// Currently uses mock data, designed to be replaced with API calls

import { AdminOrder, OrderStatus, canTransitionTo, VALID_ORDER_TRANSITIONS } from '../types/order';
import { PaymentStatus } from '@/lib/store/types';
import { mockOrders } from '../mock-data';

// In-memory state
let orders: AdminOrder[] = [...mockOrders];

function delay(ms: number = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface OrderFilters {
  search?: string;
  orderStatus?: OrderStatus;
  paymentStatus?: PaymentStatus;
  dateFrom?: string;
  dateTo?: string;
}

export interface OrderListResult {
  orders: AdminOrder[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const orderService = {
  async getAll(
    filters?: OrderFilters,
    page: number = 1,
    pageSize: number = 10
  ): Promise<OrderListResult> {
    await delay();
    let filtered = [...orders];

    if (filters?.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(o =>
        o.orderCode.toLowerCase().includes(query) ||
        o.customer.fullName.toLowerCase().includes(query) ||
        o.customer.phone.includes(query)
      );
    }

    if (filters?.orderStatus) {
      filtered = filtered.filter(o => o.orderStatus === filters.orderStatus);
    }

    if (filters?.paymentStatus) {
      filtered = filtered.filter(o => o.paymentStatus === filters.paymentStatus);
    }

    if (filters?.dateFrom) {
      const from = new Date(filters.dateFrom);
      filtered = filtered.filter(o => new Date(o.createdAt) >= from);
    }

    if (filters?.dateTo) {
      const to = new Date(filters.dateTo);
      to.setHours(23, 59, 59, 999);
      filtered = filtered.filter(o => new Date(o.createdAt) <= to);
    }

    // Sort by creation date, newest first
    filtered.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

    const total = filtered.length;
    const totalPages = Math.ceil(total / pageSize);
    const startIndex = (page - 1) * pageSize;
    const paginatedOrders = filtered.slice(startIndex, startIndex + pageSize);

    return {
      orders: paginatedOrders,
      total,
      page,
      pageSize,
      totalPages,
    };
  },

  async getById(id: string): Promise<AdminOrder | null> {
    await delay();
    return orders.find(o => o.id === id) ?? null;
  },

  async updateOrderStatus(id: string, newStatus: OrderStatus): Promise<AdminOrder | null> {
    await delay();
    const index = orders.findIndex(o => o.id === id);
    if (index === -1) return null;

    const currentStatus = orders[index].orderStatus;
    if (!canTransitionTo(currentStatus, newStatus)) {
      throw new Error(`Không thể chuyển trạng thái từ "${currentStatus}" sang "${newStatus}"`);
    }

    orders[index] = {
      ...orders[index],
      orderStatus: newStatus,
      updatedAt: new Date().toISOString(),
    };

    return orders[index];
  },

  async cancelOrder(id: string): Promise<AdminOrder | null> {
    return this.updateOrderStatus(id, 'cancelled');
  },

  getValidTransitions(currentStatus: OrderStatus): OrderStatus[] {
    return VALID_ORDER_TRANSITIONS[currentStatus] ?? [];
  },

  // Reset to initial mock state
  reset(): void {
    orders = [...mockOrders];
  },
};
