// Admin order types — extends existing order model with fulfillment lifecycle
import { CustomerInfo, BraceletConfig, PaymentMethod, PaymentStatus } from '@/lib/store/types';

export type OrderStatus = 'new' | 'confirmed' | 'processing' | 'shipping' | 'completed' | 'cancelled';

export interface AdminOrder {
  id: string;
  orderCode: string;
  customer: CustomerInfo;
  braceletConfig: BraceletConfig;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  orderStatus: OrderStatus;
  totalPrice: number;
  note?: string;
  createdAt: string;
  updatedAt: string;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  new: 'Mới',
  confirmed: 'Đã xác nhận',
  processing: 'Đang xử lý',
  shipping: 'Đang giao',
  completed: 'Hoàn tất',
  cancelled: 'Đã hủy',
};

export const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  pending: 'Chờ thanh toán',
  paid: 'Đã thanh toán',
  failed: 'Thanh toán thất bại',
};

export const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  momo: 'MoMo',
  bank_transfer: 'Chuyển khoản',
  cod: 'Thanh toán khi nhận',
};

// Valid order status transitions
export const VALID_ORDER_TRANSITIONS: Record<OrderStatus, OrderStatus[]> = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['processing', 'cancelled'],
  processing: ['shipping', 'cancelled'],
  shipping: ['completed'],
  completed: [],
  cancelled: [],
};

export function canTransitionTo(current: OrderStatus, target: OrderStatus): boolean {
  return VALID_ORDER_TRANSITIONS[current]?.includes(target) ?? false;
}
