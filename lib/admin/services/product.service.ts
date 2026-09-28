// Product service — abstracts data access for products
// Currently uses mock data, designed to be replaced with API calls

import { AdminProduct, AdminBeadProduct, ProductType, ProductStatus, BeadProductFormData, getStockStatus } from '../types/product';
import { mockProducts, mockBeadProducts } from '../mock-data';

// In-memory state (simulates database)
let products: AdminProduct[] = [...mockProducts];

function delay(ms: number = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export interface ProductFilters {
  search?: string;
  type?: ProductType;
  status?: ProductStatus;
  material?: string;
  stockStatus?: 'in_stock' | 'low_stock' | 'out_of_stock';
}

export interface ProductListResult {
  products: AdminProduct[];
  total: number;
}

export const productService = {
  async getAll(filters?: ProductFilters): Promise<ProductListResult> {
    await delay();
    let filtered = [...products];

    if (filters?.search) {
      const query = filters.search.toLowerCase();
      filtered = filtered.filter(p =>
        p.name.toLowerCase().includes(query) ||
        p.sku.toLowerCase().includes(query)
      );
    }

    if (filters?.type) {
      filtered = filtered.filter(p => p.type === filters.type);
    }

    if (filters?.status) {
      filtered = filtered.filter(p => p.status === filters.status);
    }

    if (filters?.material) {
      filtered = filtered.filter(p => p.type === 'bead' && (p as AdminBeadProduct).material === filters.material);
    }

    if (filters?.stockStatus) {
      filtered = filtered.filter(p => getStockStatus(p.stock) === filters.stockStatus);
    }

    return { products: filtered, total: filtered.length };
  },

  async getById(id: string): Promise<AdminProduct | null> {
    await delay();
    return products.find(p => p.id === id) ?? null;
  },

  async create(data: BeadProductFormData): Promise<AdminBeadProduct> {
    await delay();
    const newProduct: AdminBeadProduct = {
      id: `bt-${String(Date.now()).slice(-6)}`,
      type: 'bead',
      ...data,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    products = [newProduct, ...products];
    return newProduct;
  },

  async update(id: string, data: Partial<BeadProductFormData>): Promise<AdminProduct | null> {
    await delay();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;

    products[index] = {
      ...products[index],
      ...data,
      updatedAt: new Date().toISOString(),
    } as AdminProduct;

    return products[index];
  },

  async delete(id: string): Promise<boolean> {
    await delay();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return false;
    products.splice(index, 1);
    return true;
  },

  async updateStock(id: string, newStock: number): Promise<AdminProduct | null> {
    await delay();
    const index = products.findIndex(p => p.id === id);
    if (index === -1) return null;

    products[index] = {
      ...products[index],
      stock: newStock,
      updatedAt: new Date().toISOString(),
    } as AdminProduct;

    return products[index];
  },

  // Get bead types for order detail display
  getBeadTypeMap(): Record<string, AdminBeadProduct> {
    const map: Record<string, AdminBeadProduct> = {};
    for (const p of products) {
      if (p.type === 'bead') {
        map[p.id] = p as AdminBeadProduct;
      }
    }
    // Also check initial mock data in case in-memory was modified
    for (const p of mockBeadProducts) {
      if (!map[p.id]) {
        map[p.id] = p;
      }
    }
    return map;
  },

  // Reset to initial mock state (useful for development)
  reset(): void {
    products = [...mockProducts];
  },
};
