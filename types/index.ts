// ─── Bead ────────────────────────────────────────────────────────────────────

export type BeadMaterial = "glass" | "crystal" | "wood" | "stone" | "pearl";

export interface BeadType {
  id: string;
  name: string;
  material: BeadMaterial;
  color: string;       // hex
  emissive?: string;   // optional glow
  metalness: number;   // 0-1
  roughness: number;   // 0-1
  price: number;       // VND per bead
  description: string;
}

// ─── Bracelet Slot ────────────────────────────────────────────────────────────

export interface BraceletSlot {
  index: number;
  beadTypeId: string | null; // null = empty slot
}

// ─── Bracelet Config ──────────────────────────────────────────────────────────

export interface BraceletConfig {
  wristCircumference: number; // mm
  slots: BraceletSlot[];
}

// ─── Guest Order ──────────────────────────────────────────────────────────────

export type PaymentStatus = "pending" | "paid" | "failed";

export interface GuestOrder {
  id?: string;
  name: string;
  phone: string;
  address: string;
  braceletConfig: BraceletConfig;
  totalPrice: number;
  paymentStatus: PaymentStatus;
  createdAt?: string;
}

// ─── Payment Strategy ─────────────────────────────────────────────────────────

export interface PaymentPayload {
  orderId: string;
  amount: number;
  orderInfo: string;
  returnUrl: string;
  notifyUrl: string;
}

export interface PaymentResult {
  success: boolean;
  payUrl?: string;
  message?: string;
}

export interface PaymentStrategy {
  name: string;
  pay(payload: PaymentPayload): Promise<PaymentResult>;
}
