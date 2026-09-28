// Admin product types — extends the existing store types for admin use
import { BeadType, BeadMaterial } from '@/lib/store/types';

export type ProductType = 'bead' | 'bracelet';
export type ProductStatus = 'active' | 'inactive' | 'draft';
export type StockStatus = 'in_stock' | 'low_stock' | 'out_of_stock';

// Admin-extended bead product (wraps existing BeadType)
export interface AdminBeadProduct extends BeadType {
  type: 'bead';
  status: ProductStatus;
  stock: number;
  sku: string;
  description?: string;
  updatedAt: string;
  createdAt: string;
}

// Ready-made bracelet product
export interface AdminBraceletProduct {
  id: string;
  type: 'bracelet';
  name: string;
  description?: string;
  beadTypeIds: string[];
  wristCircumference: number;
  price: number;
  status: ProductStatus;
  stock: number;
  sku: string;
  imageUrl?: string;
  updatedAt: string;
  createdAt: string;
}

export type AdminProduct = AdminBeadProduct | AdminBraceletProduct;

// Form data for creating/editing products
export interface BeadProductFormData {
  name: string;
  material: BeadMaterial;
  color: string;
  price: number;
  metalness: number;
  roughness: number;
  stock: number;
  status: ProductStatus;
  description?: string;
  sku: string;
}

export interface BraceletProductFormData {
  name: string;
  beadTypeIds: string[];
  wristCircumference: number;
  price: number;
  stock: number;
  status: ProductStatus;
  description?: string;
  sku: string;
}

export const LOW_STOCK_THRESHOLD = 10;

export function getStockStatus(stock: number): StockStatus {
  if (stock === 0) return 'out_of_stock';
  if (stock <= LOW_STOCK_THRESHOLD) return 'low_stock';
  return 'in_stock';
}

export const MATERIAL_LABELS: Record<BeadMaterial, string> = {
  glass: 'Thủy tinh',
  crystal: 'Pha lê',
  wood: 'Gỗ',
  stone: 'Đá',
  pearl: 'Ngọc trai',
};

export const STATUS_LABELS: Record<ProductStatus, string> = {
  active: 'Đang bán',
  inactive: 'Ngừng bán',
  draft: 'Bản nháp',
};

export const STOCK_STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: 'Còn hàng',
  low_stock: 'Sắp hết',
  out_of_stock: 'Hết hàng',
};
