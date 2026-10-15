'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { ProductForm } from '@/components/admin/products/ProductForm';
import { productService } from '@/lib/admin/services/product.service';
import { AdminBeadProduct, BeadProductFormData } from '@/lib/admin/types/product';
import { LoadingState } from '@/components/admin/ui/LoadingState';
import { ErrorState } from '@/components/admin/ui/ErrorState';
import { useToastStore } from '@/stores/admin/toast.store';

export default function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const addToast = useToastStore(s => s.addToast);
  const [product, setProduct] = useState<AdminBeadProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const data = await productService.getById(id);
        if (!data || data.type !== 'bead') {
          setError(true);
          return;
        }
        setProduct(data as AdminBeadProduct);
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleSubmit = async (data: BeadProductFormData) => {
    setSaving(true);
    try {
      await productService.update(id, data);
      addToast('success', 'Đã cập nhật sản phẩm');
      router.push('/admin/products');
    } catch {
      addToast('error', 'Không thể cập nhật sản phẩm');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <LoadingState message="Đang tải thông tin sản phẩm..." />;
  if (error || !product) {
    return <ErrorState title="Không tìm thấy sản phẩm" message="Sản phẩm không tồn tại hoặc đã bị xóa." />;
  }

  const initialData: BeadProductFormData = {
    name: product.name,
    material: product.material,
    color: product.color,
    price: product.price,
    metalness: product.metalness,
    roughness: product.roughness,
    stock: product.stock,
    status: product.status,
    description: product.description,
    sku: product.sku,
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

      <div>
        <h2 className="text-lg font-bold text-gray-900">{product.name}</h2>
        <p className="text-sm text-gray-500">SKU: {product.sku}</p>
      </div>

      <ProductForm
        initialData={initialData}
        onSubmit={handleSubmit}
        onCancel={() => router.push('/admin/products')}
        submitLabel="Lưu thay đổi"
        loading={saving}
      />
    </div>
  );
}
