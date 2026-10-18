// ─── Bead & Slot Base Interfaces ──────────────────────────────────────────────

export type BeadMaterial = "glass" | "crystal" | "wood" | "stone" | "pearl";

export interface BeadType {
  id: string;
  code?: string;
  name: string;
  material: BeadMaterial;
  color: string;       // hex
  emissive?: string;   // optional glow
  metalness: number;   // 0-1
  roughness: number;   // 0-1
  price: number;       // VND per bead (sell_price)
  cost_price?: number; // Cost price (giá vốn)
  sell_price?: number; // Sell price (giá bán)
  stock_quantity?: number;
  /** Current sellable inventory for this bead type. */
  stock?: number;
  is_active?: boolean;
  description: string;
  diameter: number;    // diameter in mm
  created_at?: string;
  updated_at?: string;
}

export interface BraceletSlot {
  index: number;
  beadTypeId: string | null;
}

export interface BraceletConfig {
  wristCircumference: number;
  slots: BraceletSlot[];
}

export type PaymentStatus = "pending" | "paid" | "failed";
export type FulfillmentStatus = "pending" | "processing" | "completed" | "cancelled";
export type UserRole = "customer" | "manager" | "admin";
export type UserStatus = "active" | "locked";

// ─── Payment Strategy ─────────────────────────────────────────────────────────

export interface PaymentPayload {
  customer: { name: string; phone: string; address: string };
  braceletConfig: BraceletConfig;
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

// ─── 12 ERD Entity Schemas (Teammate Spec) ───────────────────────────────────

// 1. Users — Accounts
export interface UserRecord {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  phone: string;
  avatar_url?: string | null;
  role: UserRole;
  status: UserStatus;
  last_login_at?: string | null;
  created_at: string;
  updated_at: string;
}

// 2. User Addresses
export interface UserAddressRecord {
  id: string;
  user_id: string;
  recipient_name: string;
  phone: string;
  address_line: string;
  province: string;
  is_default: boolean;
  created_at: string;
}

// 3. Bead Types (Catalog)
export interface BeadTypeRecord {
  id: string;
  code: string;
  name: string;
  material: BeadMaterial;
  color_hex: string;
  emissive_hex?: string;
  metalness: number;
  roughness: number;
  description: string;
  cost_price: number;  // Giá vốn
  sell_price: number;  // Giá bán
  stock_quantity: number;
  is_active: boolean;
  diameter: number;
  created_at: string;
  updated_at: string;
}

// 4. Bracelet Templates
export interface BraceletTemplateRecord {
  id: string;
  name: string;
  description: string;
  wrist_circumference: number;
  thumbnail_url?: string;
  category: string;
  is_featured: boolean;
  status: "draft" | "published";
  created_by: string; // FK -> users (Manager)
  created_at: string;
  updated_at: string;
}

// 5. Bracelet Template Slots
export interface BraceletTemplateSlotRecord {
  id: string;
  template_id: string;
  slot_index: number;
  bead_type_id: string;
}

// 6. Custom Designs (Customer Personal Designs)
export interface CustomDesignRecord {
  id: string;
  user_id: string; // FK -> users
  name: string;
  wrist_circumference: number;
  thumbnail_url?: string | null;
  is_public: boolean;
  created_at: string;
  updated_at: string;
}

// 7. Custom Design Slots
export interface CustomDesignSlotRecord {
  id: string;
  design_id: string;
  slot_index: number;
  bead_type_id: string;
}

// 8. Favorites
export interface FavoriteRecord {
  id: string;
  user_id: string;
  template_id?: string | null;
  bead_type_id?: string | null;
  created_at: string;
}

// 9. Orders
export interface OrderRecord {
  id: string;
  order_code: string;
  user_id?: string | null;
  source_design_id?: string | null;
  source_template_id?: string | null;
  customer_name: string;
  phone: string;
  address: string;
  wrist_circumference: number;
  total_price: number;
  payment_status: PaymentStatus;
  fulfillment_status: FulfillmentStatus;
  created_at: string;
  updated_at: string;
}

// 10. Order Slots
export interface OrderSlotRecord {
  id: string;
  order_id: string;
  slot_index: number;
  bead_type_id: string;
  unit_price: number; // Snapshot of sell_price at purchase time
}

// 11. Payment Logs
export interface PaymentLogRecord {
  id: string;
  order_id: string;
  method: string;
  amount: number;
  status: "initiated" | "success" | "failed";
  transaction_id?: string;
  raw_response?: string;
  created_at: string;
}

// 12. Admin Audit Logs
export interface AdminAuditLogRecord {
  id: string;
  admin_id: string; // FK -> users (Manager / Admin)
  action: string;
  target_table: string;
  target_id: string;
  detail: string;
  created_at: string;
}

// ─── Backward Compatibility Legacy Interfaces ────────────────────────────────
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

export interface CharmRecord extends BeadTypeRecord {}
export interface VongTayMauRecord {
  id: string;
  ten: string;
  moTa: string;
  chuViCoTay: number;
  danhSachCharm: string[];
  tongTien: number;
}
export interface KhachHangRecord {
  id: string;
  hoTen: string;
  soDienThoai: string;
  diaChi: string;
  cauHinhVong: {
    chuViCoTay: number;
    danhSachCharm: (string | null)[];
  };
  tongTien: number;
  phuongThucThanhToan: string;
  trangThaiThanhToan: "chua_thanh_toan" | "da_thanh_toan" | "that_bai";
  ngayTao: string;
}
