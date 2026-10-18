import { AdminOrder, AdminOrderType, OrderStatus, canTransitionTo, VALID_ORDER_TRANSITIONS } from '../types/order';
import { PaymentStatus } from '@/lib/store/types';

export interface OrderFilters {
  search?: string;
  orderTypes?: AdminOrderType[];
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

async function request<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, { ...init, headers: { 'Content-Type': 'application/json', ...init?.headers } });
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(data?.message || `Không thể xử lý đơn hàng (HTTP ${response.status}).`);
  return data as T;
}

export const orderService = {
  async getAll(filters: OrderFilters = {}, page = 1, pageSize = 10): Promise<OrderListResult> {
    const query = new URLSearchParams({ page: String(page), pageSize: String(pageSize) });
    for (const [key, value] of Object.entries(filters)) {
      if (Array.isArray(value)) value.forEach((item) => query.append('orderType', item));
      else if (value) query.set(key, value);
    }
    return request<OrderListResult>(`/api/admin/orders?${query}`);
  },

  async getById(id: string): Promise<AdminOrder | null> {
    const response = await fetch(`/api/admin/orders/${encodeURIComponent(id)}`);
    if (response.status === 404) return null;
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Không thể tải đơn hàng.');
    return data as AdminOrder;
  },

  async updateOrderStatus(id: string, newStatus: OrderStatus): Promise<AdminOrder | null> {
    const current = await this.getById(id);
    if (!current) return null;
    if (!canTransitionTo(current.orderStatus, newStatus)) {
      throw new Error(`Không thể chuyển trạng thái từ "${current.orderStatus}" sang "${newStatus}"`);
    }
    await request(`/api/admin/orders/${encodeURIComponent(id)}`, {
      method: 'PATCH', body: JSON.stringify({ orderStatus: newStatus }),
    });
    return { ...current, orderStatus: newStatus, updatedAt: new Date().toISOString() };
  },

  async cancelOrder(id: string) { return this.updateOrderStatus(id, 'cancelled'); },
  getValidTransitions(currentStatus: OrderStatus) { return VALID_ORDER_TRANSITIONS[currentStatus] ?? []; },
};
