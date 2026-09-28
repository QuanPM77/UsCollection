'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ProductForm } from '@/components/admin/products/ProductForm';
import { productService } from '@/lib/admin/services/product.service';
import { BeadProductFormData } from '@/lib/admin/types/product';
import { useToastStore } from '@/stores/admin/toast.store';

export default function NewProductPage() {
  const router = useRouter();
  const addToast = useToastStore(s => s.addToast);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (data: BeadProductFormData) => {
    setLoading(true);
    try {
      await productService.create(data);
      addToast('success', 'Đã thêm sản phẩm mới');
      router.push('/admin/products');
    } catch {
      addToast('error', 'Không thể thêm sản phẩm');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-3xl">
      <Link
        href="/admin/products"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại danh sách sản phẩm
      </Link>

      <ProductForm
        onSubmit={handleSubmit}
        onCancel={() => router.push('/admin/products')}
        submitLabel="Thêm sản phẩm"
        loading={loading}
      />
    </div>
  );
}
