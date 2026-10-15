'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { Plus, Pencil, Trash2, Package, Filter, X } from 'lucide-react';
import { SearchInput } from '@/components/admin/ui/SearchInput';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { EmptyState } from '@/components/admin/ui/EmptyState';
import { LoadingState } from '@/components/admin/ui/LoadingState';
import { ErrorState } from '@/components/admin/ui/ErrorState';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { productService, ProductFilters } from '@/lib/admin/services/product.service';
import {
  AdminProduct,
  AdminBeadProduct,
  STATUS_LABELS,
  STOCK_STATUS_LABELS,
  MATERIAL_LABELS,
  getStockStatus,
  ProductStatus,
  StockStatus,
} from '@/lib/admin/types/product';
import { formatCurrency, formatDate } from '@/lib/admin/utils/formatters';
import { useToastStore } from '@/stores/admin/toast.store';

const STATUS_VARIANT: Record<ProductStatus, 'success' | 'warning' | 'neutral'> = {
  active: 'success',
  inactive: 'neutral',
  draft: 'warning',
};

const STOCK_VARIANT: Record<StockStatus, 'success' | 'warning' | 'error'> = {
  in_stock: 'success',
  low_stock: 'warning',
  out_of_stock: 'error',
};

export default function ProductsPage() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<ProductFilters>({});
  const [deleteTarget, setDeleteTarget] = useState<AdminProduct | null>(null);
  const [stockEdit, setStockEdit] = useState<{ product: AdminProduct; value: string } | null>(null);
  const addToast = useToastStore(s => s.addToast);

  const loadProducts = useCallback(async () => {
    setLoading(true);
    setError(false);
    try {
      const result = await productService.getAll({ ...filters, search: search || undefined });
      setProducts(result.products);
      setTotal(result.total);
    } catch {
      setError(true);
    } finally {
      setLoading(false);
    }
  }, [filters, search]);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const handleSearch = (value: string) => {
    setSearch(value);
  };

  const handleFilterChange = (key: keyof ProductFilters, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value || undefined }));
  };

  const clearFilters = () => {
    setFilters({});
    setSearch('');
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    const success = await productService.delete(deleteTarget.id);
    if (success) {
      addToast('success', `Đã xóa sản phẩm "${deleteTarget.name}"`);
      loadProducts();
    } else {
      addToast('error', 'Không thể xóa sản phẩm');
    }
    setDeleteTarget(null);
  };

  const handleStockUpdate = async () => {
    if (!stockEdit) return;
    const newStock = parseInt(stockEdit.value, 10);
    if (isNaN(newStock) || newStock < 0) {
      addToast('error', 'Tồn kho phải là số nguyên không âm');
      return;
    }
    const updated = await productService.updateStock(stockEdit.product.id, newStock);
    if (updated) {
      addToast('success', `Đã cập nhật tồn kho "${stockEdit.product.name}" thành ${newStock}`);
      loadProducts();
    }
    setStockEdit(null);
  };

  const hasActiveFilters = Object.values(filters).some(v => v) || search;

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <SearchInput
          value={search}
          onChange={handleSearch}
          placeholder="Tìm tên, SKU..."
          className="w-full sm:w-72"
        />
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`inline-flex items-center gap-2 px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors
              ${showFilters ? 'bg-brand-50 border-brand-200 text-brand-700' : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'}`}
          >
            <Filter className="w-4 h-4" />
            Lọc
          </button>
          {hasActiveFilters && (
            <button onClick={clearFilters} className="inline-flex items-center gap-1 px-3 py-2.5 text-sm text-gray-500 hover:text-gray-700">
              <X className="w-4 h-4" /> Xóa lọc
            </button>
          )}
          <Link
            href="/admin/products/new"
            className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-brand-400 hover:bg-brand-500 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            Thêm sản phẩm
          </Link>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <div className="bg-white rounded-xl border border-gray-200 p-4 animate-fade-in">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Loại sản phẩm</label>
              <select
                value={filters.type || ''}
                onChange={(e) => handleFilterChange('type', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">Tất cả</option>
                <option value="bead">Hạt chuỗi</option>
                <option value="bracelet">Vòng tay</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Trạng thái</label>
              <select
                value={filters.status || ''}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">Tất cả</option>
                {Object.entries(STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Chất liệu</label>
              <select
                value={filters.material || ''}
                onChange={(e) => handleFilterChange('material', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">Tất cả</option>
                {Object.entries(MATERIAL_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-500 mb-1.5">Tồn kho</label>
              <select
                value={filters.stockStatus || ''}
                onChange={(e) => handleFilterChange('stockStatus', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300"
              >
                <option value="">Tất cả</option>
                {Object.entries(STOCK_STATUS_LABELS).map(([key, label]) => (
                  <option key={key} value={key}>{label}</option>
                ))}
              </select>
            </div>
          </div>
        </div>
      )}

      <div className="text-sm text-gray-500">{total} sản phẩm</div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        {loading ? (
          <LoadingState message="Đang tải sản phẩm..." />
        ) : error ? (
          <ErrorState message="Không thể tải danh sách sản phẩm." onRetry={loadProducts} />
        ) : products.length === 0 ? (
          <EmptyState
            title="Chưa có sản phẩm nào"
            description={hasActiveFilters ? 'Không tìm thấy sản phẩm phù hợp.' : undefined}
            action={
              !hasActiveFilters ? (
                <Link href="/admin/products/new" className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white bg-brand-400 rounded-lg hover:bg-brand-500">
                  <Plus className="w-4 h-4" /> Thêm sản phẩm đầu tiên
                </Link>
              ) : undefined
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50">
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Sản phẩm</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Loại</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">Chất liệu</th>
                  <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Giá</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Tồn kho</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Trạng thái</th>
                  <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">Cập nhật</th>
                  <th className="text-center px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wider">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {products.map((product) => {
                  const stockStatus = getStockStatus(product.stock);
                  return (
                    <tr key={product.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          {product.type === 'bead' && (
                            <div
                              className="w-8 h-8 rounded-full border-2 border-white shadow-sm shrink-0"
                              style={{ backgroundColor: (product as AdminBeadProduct).color }}
                            />
                          )}
                          {product.type === 'bracelet' && (
                            <div className="w-8 h-8 rounded-full bg-brand-50 flex items-center justify-center shrink-0">
                              <Package className="w-4 h-4 text-brand-400" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-medium text-gray-900 truncate">{product.name}</p>
                            <p className="text-xs text-gray-400">{product.sku}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">
                        {product.type === 'bead' ? 'Hạt' : 'Vòng tay'}
                      </td>
                      <td className="px-4 py-3 hidden md:table-cell text-gray-600">
                        {product.type === 'bead'
                          ? MATERIAL_LABELS[(product as AdminBeadProduct).material]
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-gray-900">
                        {formatCurrency(product.price)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <button
                          onClick={() => setStockEdit({ product, value: String(product.stock) })}
                          className="inline-flex items-center gap-1.5"
                          title="Cập nhật tồn kho"
                        >
                          <span className="font-medium text-gray-700">{product.stock}</span>
                          <StatusBadge
                            label={STOCK_STATUS_LABELS[stockStatus]}
                            variant={STOCK_VARIANT[stockStatus]}
                            dot={false}
                          />
                        </button>
                      </td>
                      <td className="px-4 py-3">
                        <StatusBadge
                          label={STATUS_LABELS[product.status]}
                          variant={STATUS_VARIANT[product.status]}
                        />
                      </td>
                      <td className="px-4 py-3 hidden lg:table-cell text-gray-500 text-xs">
                        {formatDate(product.updatedAt)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-center gap-1">
                          <Link
                            href={`/admin/products/${product.id}`}
                            className="p-2 rounded-lg text-gray-400 hover:text-brand-500 hover:bg-brand-50 transition-colors"
                            title="Chỉnh sửa"
                          >
                            <Pencil className="w-4 h-4" />
                          </Link>
                          <button
                            onClick={() => setDeleteTarget(product)}
                            className="p-2 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                            title="Xóa"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        title="Xóa sản phẩm"
        message={`Bạn có chắc muốn xóa sản phẩm "${deleteTarget?.name}"? Hành động này không thể hoàn tác.`}
        confirmText="Xóa"
        variant="danger"
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />

      {/* Stock edit dialog */}
      {stockEdit && (
        <div className="fixed inset-0 z-[90] flex items-center justify-center bg-black/50 animate-fade-in" onClick={() => setStockEdit(null)}>
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-5" onClick={e => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-900 mb-1">Cập nhật tồn kho</h3>
            <p className="text-sm text-gray-500 mb-4">{stockEdit.product.name}</p>
            <input
              type="number"
              min="0"
              value={stockEdit.value}
              onChange={(e) => setStockEdit({ ...stockEdit, value: e.target.value })}
              className="w-full px-3 py-2.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-300 mb-4"
              autoFocus
              onKeyDown={(e) => { if (e.key === 'Enter') handleStockUpdate(); }}
            />
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setStockEdit(null)}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Hủy
              </button>
              <button
                onClick={handleStockUpdate}
                className="px-4 py-2 text-sm font-medium text-white bg-brand-400 rounded-lg hover:bg-brand-500"
              >
                Lưu
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
