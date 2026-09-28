'use client';

import { useState } from 'react';
import { BeadMaterial } from '@/lib/store/types';
import { ProductStatus, MATERIAL_LABELS, STATUS_LABELS, BeadProductFormData } from '@/lib/admin/types/product';
import { validateBeadProduct, ValidationError } from '@/lib/admin/utils/validators';

interface ProductFormProps {
  initialData?: BeadProductFormData;
  onSubmit: (data: BeadProductFormData) => Promise<void>;
  onCancel: () => void;
  submitLabel?: string;
  loading?: boolean;
}

const DEFAULT_DATA: BeadProductFormData = {
  name: '',
  material: 'crystal',
  color: '#F4A0B5',
  price: 0,
  metalness: 0.3,
  roughness: 0.3,
  stock: 0,
  status: 'draft',
  description: '',
  sku: '',
};

export function ProductForm({
  initialData,
  onSubmit,
  onCancel,
  submitLabel = 'Lưu',
  loading = false,
}: ProductFormProps) {
  const [form, setForm] = useState<BeadProductFormData>(initialData || DEFAULT_DATA);
  const [errors, setErrors] = useState<ValidationError[]>([]);

  const getError = (field: string) => errors.find(e => e.field === field)?.message;

  const handleChange = (field: keyof BeadProductFormData, value: string | number) => {
    setForm(prev => ({ ...prev, [field]: value }));
    setErrors(prev => prev.filter(e => e.field !== field));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const validation = validateBeadProduct(form);
    if (!validation.valid) {
      setErrors(validation.errors);
      return;
    }
    await onSubmit(form);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Basic info */}
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Thông tin cơ bản</h3>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <FormField label="Tên sản phẩm" error={getError('Tên sản phẩm')} required>
            <input
              type="text"
              value={form.name}
              onChange={(e) => handleChange('name', e.target.value)}
              placeholder="Ví dụ: Thạch anh hồng"
              className="form-input"
            />
          </FormField>

          <FormField label="SKU" error={getError('SKU')} required>
            <input
              type="text"
              value={form.sku}
              onChange={(e) => handleChange('sku', e.target.value)}
              placeholder="Ví dụ: BD-CRY-001"
              className="form-input"
            />
          </FormField>

          <FormField label="Chất liệu" error={getError('Chất liệu')} required>
            <select
              value={form.material}
              onChange={(e) => handleChange('material', e.target.value as BeadMaterial)}
              className="form-input"
            >
              {Object.entries(MATERIAL_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </FormField>

          <FormField label="Màu sắc" error={getError('color')}>
            <div className="flex items-center gap-3">
              <input
                type="color"
                value={form.color}
                onChange={(e) => handleChange('color', e.target.value)}
                className="w-10 h-10 rounded-lg border border-gray-200 cursor-pointer p-0.5"
              />
              <input
                type="text"
                value={form.color}
                onChange={(e) => handleChange('color', e.target.value)}
                placeholder="#FF0000"
                className="form-input flex-1"
              />
            </div>
          </FormField>

          <FormField label="Giá (VND)" error={getError('price')} required>
            <input
              type="number"
              min="0"
              value={form.price || ''}
              onChange={(e) => handleChange('price', Number(e.target.value))}
              placeholder="45000"
              className="form-input"
            />
          </FormField>

          <FormField label="Tồn kho" error={getError('stock')} required>
            <input
              type="number"
              min="0"
              value={form.stock}
              onChange={(e) => handleChange('stock', Number(e.target.value))}
              className="form-input"
            />
          </FormField>

          <FormField label="Trạng thái">
            <select
              value={form.status}
              onChange={(e) => handleChange('status', e.target.value as ProductStatus)}
              className="form-input"
            >
              {Object.entries(STATUS_LABELS).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </FormField>

          <div className="sm:col-span-2">
            <FormField label="Mô tả">
              <textarea
                value={form.description || ''}
                onChange={(e) => handleChange('description', e.target.value)}
                rows={3}
                placeholder="Mô tả ngắn về sản phẩm..."
                className="form-input resize-none"
              />
            </FormField>
          </div>
        </div>
      </div>

      {/* Advanced 3D params */}
      <details className="bg-white rounded-xl border border-gray-200">
        <summary className="px-5 py-4 cursor-pointer font-semibold text-gray-900 hover:bg-gray-50 rounded-xl transition-colors select-none">
          Thông số nâng cao (3D)
        </summary>
        <div className="px-5 pb-5 pt-1">
          <p className="text-xs text-gray-400 mb-4">Các thông số ảnh hưởng đến hiển thị 3D của hạt chuỗi.</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Metalness" error={getError('Metalness')}>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={form.metalness}
                  onChange={(e) => handleChange('metalness', Number(e.target.value))}
                  className="flex-1 accent-brand-400"
                />
                <span className="text-sm font-mono text-gray-600 w-10 text-right">{form.metalness}</span>
              </div>
            </FormField>

            <FormField label="Roughness" error={getError('Roughness')}>
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.05"
                  value={form.roughness}
                  onChange={(e) => handleChange('roughness', Number(e.target.value))}
                  className="flex-1 accent-brand-400"
                />
                <span className="text-sm font-mono text-gray-600 w-10 text-right">{form.roughness}</span>
              </div>
            </FormField>
          </div>
        </div>
      </details>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="px-5 py-2.5 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
        >
          Hủy
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-5 py-2.5 text-sm font-medium text-white bg-brand-400 rounded-lg hover:bg-brand-500 transition-colors disabled:opacity-50"
        >
          {loading ? 'Đang lưu...' : submitLabel}
        </button>
      </div>
    </form>
  );
}

function FormField({
  label,
  error,
  required,
  children,
}: {
  label: string;
  error?: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1.5">
        {label}
        {required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
