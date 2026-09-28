// Existing store types - these represent the customer-facing data model

export type BeadMaterial = 'glass' | 'crystal' | 'wood' | 'stone' | 'pearl';

export interface BeadType {
  id: string;
  name: string;
  material: BeadMaterial;
  color: string;
  metalness: number;
  roughness: number;
  price: number;
}

export interface BraceletSlot {
  position: number;
  beadTypeId: string;
}

export interface BraceletConfig {
  wristCircumference: number;
  slots: BraceletSlot[];
}

export interface CustomerInfo {
  fullName: string;
  phone: string;
  address: string;
  email?: string;
}

export type PaymentMethod = 'momo' | 'bank_transfer' | 'cod';
export type PaymentStatus = 'pending' | 'paid' | 'failed';

export interface Order {
  id: string;
  customer: CustomerInfo;
  braceletConfig: BraceletConfig;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  totalPrice: number;
  createdAt: string;
  note?: string;
}
