// Admin order types — extends existing order model with fulfillment lifecycle
import { BeadType, CustomerInfo, PaymentMethod, PaymentStatus } from '@/lib/store/types';

export type OrderStatus = 'new' | 'confirmed' | 'processing' | 'shipping' | 'completed' | 'cancelled';
export type AdminOrderType = 'catalog_product' | 'custom_design';
export type OrderBeadSnapshot = BeadType & { diameter: number };

export interface AdminOrder {
  id: string;
  orderCode: string;
  orderType: AdminOrderType;
  productName: string;
  customer: CustomerInfo;
  braceletConfig: {
    wristCircumference?: number;
    slots?: { beadTypeId: string | null; position?: number; index?: number }[];
    kind?: string;
    name?: string;
    quantity?: number;
  };
  items?: { productName: string; productType: string; sku?: string | null; quantity: number; unitPrice: number; unitCost: number | null; lineTotal: number; details?: unknown }[];
  beadCatalog?: Record<string, OrderBeadSnapshot>;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  inventoryReviewRequired?: boolean;
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
  payos: 'PayOS',
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
