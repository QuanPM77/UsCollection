import { AdminProduct, AdminBeadProduct, ProductType, ProductStatus } from '../types/product';
import { BeadType } from '@/types';

export interface ProductFilters {
  search?: string;
  type?: ProductType;
  status?: ProductStatus;
  material?: string;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'attention';
}

export interface ProductListResult { products: AdminProduct[]; total: number }

export const productService = {
  async getAll(filters?: ProductFilters): Promise<ProductListResult> {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(filters ?? {})) if (value) query.set(key, value);
    const response = await fetch(`/api/admin/products?${query}`);
    const data = await response.json().catch(() => null);
    if (!response.ok) throw new Error(data?.message || `Không thể tải sản phẩm (HTTP ${response.status}).`);
    return data as ProductListResult;
  },

  async getBeadTypeMap(): Promise<Record<string, AdminBeadProduct>> {
    const response = await fetch('/api/bead-types', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok || !Array.isArray(data.data)) throw new Error('Không thể tải danh sách hạt.');
    return Object.fromEntries((data.data as BeadType[]).map((bead) => [bead.id, {
      ...bead, type: 'bead' as const, status: bead.is_active === false ? 'inactive' as const : 'active' as const, stock: 0, costPrice: null, sku: bead.id, createdAt: '', updatedAt: '',
    }]));
  },
};
