'use client';

import { useEffect, useState, use } from 'react';
import Link from 'next/link';
import { ArrowLeft, User, MapPin, Phone, Mail, Calendar, Hash, CreditCard } from 'lucide-react';
import { StatusBadge } from '@/components/admin/ui/StatusBadge';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { LoadingState } from '@/components/admin/ui/LoadingState';
import { ErrorState } from '@/components/admin/ui/ErrorState';
import { orderService } from '@/lib/admin/services/order.service';
import { productService } from '@/lib/admin/services/product.service';
import {
  AdminOrder,
  ORDER_STATUS_LABELS,
  PAYMENT_STATUS_LABELS,
  PAYMENT_METHOD_LABELS,
  OrderStatus,
} from '@/lib/admin/types/order';
import { AdminBeadProduct } from '@/lib/admin/types/product';
import { formatCurrency, formatDateTime } from '@/lib/admin/utils/formatters';
import { useToastStore } from '@/stores/admin/toast.store';

const ORDER_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error' | 'info' | 'neutral' | 'brand'> = {
  new: 'info',
  confirmed: 'brand',
  processing: 'warning',
  shipping: 'info',
  completed: 'success',
  cancelled: 'error',
};

const PAYMENT_STATUS_VARIANT: Record<string, 'success' | 'warning' | 'error'> = {
  pending: 'warning',
  paid: 'success',
  failed: 'error',
};

export default function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [order, setOrder] = useState<AdminOrder | null>(null);
  const [beadMap, setBeadMap] = useState<Record<string, AdminBeadProduct>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [statusDialog, setStatusDialog] = useState<{ open: boolean; status: OrderStatus | null }>({
    open: false,
    status: null,
  });
  const [cancelDialog, setCancelDialog] = useState(false);
  const addToast = useToastStore(s => s.addToast);

  useEffect(() => {
    async function load() {
      try {
        const [orderData] = await Promise.all([orderService.getById(id)]);
        if (!orderData) {
          setError(true);
          return;
        }
        setOrder(orderData);
        setBeadMap(await productService.getBeadTypeMap());
      } catch {
        setError(true);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  const handleStatusChange = async () => {
    if (!order || !statusDialog.status) return;
    try {
      const updated = await orderService.updateOrderStatus(order.id, statusDialog.status);
      if (updated) {
        setOrder(updated);
        addToast('success', `Đã cập nhật trạng thái đơn hàng thành "${ORDER_STATUS_LABELS[statusDialog.status]}"`);
      }
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Không thể cập nhật trạng thái');
    }
    setStatusDialog({ open: false, status: null });
  };

  const handleCancel = async () => {
    if (!order) return;
    try {
      const updated = await orderService.cancelOrder(order.id);
      if (updated) {
        setOrder(updated);
        addToast('success', 'Đã hủy đơn hàng');
      }
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Không thể hủy đơn hàng');
    }
    setCancelDialog(false);
  };

  if (loading) return <LoadingState message="Đang tải thông tin đơn hàng..." />;
  if (error || !order) {
    return <ErrorState title="Không tìm thấy đơn hàng" message="Đơn hàng không tồn tại hoặc đã bị xóa." />;
  }

  const validTransitions = orderService.getValidTransitions(order.orderStatus);
  const costedItems = (order.items ?? []).filter((item) => item.unitCost !== null);
  const costedRevenue = costedItems.reduce((sum, item) => sum + item.lineTotal, 0);
  const costTotal = costedItems.reduce((sum, item) => sum + item.unitCost! * item.quantity, 0);
  const grossProfit = costedRevenue - costTotal;

  // Summarize bead configuration
  const beadSummary: { beadId: string; bead: AdminBeadProduct | undefined; count: number }[] = [];
  const beadCounts: Record<string, number> = {};
  for (const slot of order.braceletConfig.slots ?? []) {
    if (!slot.beadTypeId) continue;
    beadCounts[slot.beadTypeId] = (beadCounts[slot.beadTypeId] || 0) + 1;
  }
  for (const [beadId, count] of Object.entries(beadCounts)) {
    beadSummary.push({ beadId, bead: beadMap[beadId], count });
  }

  return (
    <div className="space-y-6">
      {/* Back link */}
      <Link
        href="/admin/orders"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Quay lại danh sách đơn hàng
      </Link>

      {/* Order header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-gray-900">{order.orderCode}</h2>
          <p className="text-sm text-gray-500 mt-1">Tạo lúc {formatDateTime(order.createdAt)}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <span className="rounded-full bg-brand-50 px-3 py-1.5 text-sm font-semibold text-brand-700">{order.orderType === 'catalog_product' ? 'Vòng tay có sẵn' : 'Thiết kế 3D'}</span>
          <StatusBadge
            label={PAYMENT_STATUS_LABELS[order.paymentStatus]}
            variant={PAYMENT_STATUS_VARIANT[order.paymentStatus]}
            size="md"
          />
          <StatusBadge
            label={ORDER_STATUS_LABELS[order.orderStatus]}
            variant={ORDER_STATUS_VARIANT[order.orderStatus]}
            size="md"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left column */}
        <div className="lg:col-span-2 space-y-6">
          {/* Order info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Thông tin đơn hàng</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InfoRow icon={Hash} label="Mã đơn" value={order.orderCode} />
              <InfoRow icon={Calendar} label="Ngày tạo" value={formatDateTime(order.createdAt)} />
              <InfoRow icon={CreditCard} label="Phương thức thanh toán" value={PAYMENT_METHOD_LABELS[order.paymentMethod]} />
              <InfoRow
                icon={CreditCard}
                label="Tổng tiền"
                value={formatCurrency(order.totalPrice)}
                valueClassName="text-lg font-bold text-brand-600"
              />
            </div>
            {order.note && (
              <div className="mt-4 p-3 rounded-lg bg-amber-50 border border-amber-100">
                <p className="text-xs font-medium text-amber-600 mb-1">Ghi chú</p>
                <p className="text-sm text-amber-800">{order.note}</p>
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Giá vốn và lợi nhuận gộp</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
              <InfoRow icon={CreditCard} label="Giá vốn đã đối chiếu" value={formatCurrency(costTotal)} />
              <InfoRow icon={CreditCard} label="Lợi nhuận gộp" value={formatCurrency(grossProfit)} valueClassName="text-lg font-bold text-emerald-700" />
              <InfoRow icon={CreditCard} label="Độ phủ giá vốn" value={`${order.totalPrice ? Math.min(100, costedRevenue / order.totalPrice * 100).toFixed(0) : 0}%`} />
            </div>
            {costedItems.length < (order.items?.length ?? 0) && <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-xs text-amber-800">Một số sản phẩm chưa có giá vốn tại thời điểm mua; lợi nhuận đang được tính trên phần đã đối chiếu.</p>}
          </div>

          {/* Product or 3D design details */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">{order.orderType === 'catalog_product' ? 'Chi tiết sản phẩm có sẵn' : 'Chi tiết thiết kế 3D'}</h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-5">
              {order.orderType === 'custom_design' ? <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Kích thước cổ tay</p>
                <p className="text-sm font-semibold text-gray-900">{order.braceletConfig.wristCircumference ?? '—'} mm</p>
              </div> : <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">Sản phẩm</p>
                <p className="text-sm font-semibold text-gray-900">{order.productName}</p>
              </div>}
              <div className="p-3 rounded-lg bg-gray-50">
                <p className="text-xs text-gray-500 mb-1">{order.orderType === 'catalog_product' ? 'Số lượng mua' : 'Số lượng hạt'}</p>
                <p className="text-sm font-semibold text-gray-900">{order.orderType === 'catalog_product' ? order.braceletConfig.quantity ?? order.items?.[0]?.quantity ?? 1 : order.braceletConfig.slots?.length ?? order.items?.reduce((sum, item) => sum + item.quantity, 0) ?? 0} {order.orderType === 'catalog_product' ? 'vòng' : 'hạt'}</p>
              </div>
            </div>

            {/* Bead summary */}
            <h4 className="text-sm font-medium text-gray-700 mb-3">Sản phẩm trong đơn</h4>
            <div className="space-y-2">
              {order.items?.map((item, index) => (
                <div key={`${item.productName}-${index}`} className="flex items-center justify-between rounded-lg border border-gray-100 p-3">
                  <span className="text-sm font-medium text-gray-900">{item.productName}{item.sku ? <span className="ml-1 text-xs text-gray-500">({item.sku})</span> : null} × {item.quantity}<span className="block text-xs font-normal text-gray-500">Đơn giá: {formatCurrency(item.unitPrice)}</span></span>
                  <span className="text-right text-sm text-gray-600">{formatCurrency(item.lineTotal)}<span className="mt-1 block text-xs">Giá vốn: {item.unitCost === null ? 'Chưa nhập' : formatCurrency(item.unitCost * item.quantity)}</span></span>
                </div>
              ))}
              {beadSummary.map(({ beadId, bead, count }) => (
                <div key={beadId} className="flex items-center gap-3 p-3 rounded-lg border border-gray-100">
                  <div
                    className="w-8 h-8 rounded-full border-2 border-white shadow-sm shrink-0"
                    style={{ backgroundColor: bead?.color || '#ccc' }}
                    title={bead?.name || beadId}
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{bead?.name || beadId}</p>
                    <p className="text-xs text-gray-400">
                      {bead?.material ? `${bead.material}` : ''} · {formatCurrency(bead?.price || 0)}/hạt
                    </p>
                  </div>
                  <span className="text-sm font-semibold text-gray-600">×{count}</span>
                </div>
              ))}
            </div>

            {/* Visual bead layout */}
            {order.orderType === 'custom_design' && <div className="mt-4 p-4 rounded-lg bg-gray-50">
              <p className="text-xs text-gray-500 mb-2">Thứ tự hạt trên vòng</p>
              <div className="flex flex-wrap gap-1.5">
              {(order.braceletConfig.slots ?? []).filter((slot) => slot.beadTypeId).map((slot, i) => {
                  const bead = beadMap[slot.beadTypeId];
                  return (
                    <div
                      key={i}
                      className="w-7 h-7 rounded-full border-2 border-white shadow-sm"
                      style={{ backgroundColor: bead?.color || '#ccc' }}
                      title={`Vị trí ${i + 1}: ${bead?.name || slot.beadTypeId}`}
                    />
                  );
                })}
              </div>
            </div>}
          </div>
        </div>

        {/* Right column */}
        <div className="space-y-6">
          {/* Customer info */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Khách hàng</h3>
            <div className="space-y-3">
              <InfoRow icon={User} label="Họ tên" value={order.customer.fullName} />
              <InfoRow icon={Phone} label="Số điện thoại" value={order.customer.phone} />
              <InfoRow icon={MapPin} label="Địa chỉ" value={order.customer.address} />
              {order.customer.email && (
                <InfoRow icon={Mail} label="Email" value={order.customer.email} />
              )}
            </div>
          </div>

          {/* Status management */}
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Quản lý trạng thái</h3>

            <div className="space-y-3 mb-4">
              <div>
                <p className="text-xs text-gray-500 mb-1">Trạng thái đơn hàng</p>
                <StatusBadge
                  label={ORDER_STATUS_LABELS[order.orderStatus]}
                  variant={ORDER_STATUS_VARIANT[order.orderStatus]}
                  size="md"
                />
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-1">Trạng thái thanh toán</p>
                <StatusBadge
                  label={PAYMENT_STATUS_LABELS[order.paymentStatus]}
                  variant={PAYMENT_STATUS_VARIANT[order.paymentStatus]}
                  size="md"
                />
              </div>
            </div>

            {validTransitions.length > 0 && (
              <div>
                <p className="text-xs text-gray-500 mb-2">Chuyển sang</p>
                <div className="flex flex-wrap gap-2">
                  {validTransitions.filter(s => s !== 'cancelled').map((status) => (
                    <button
                      key={status}
                      onClick={() => setStatusDialog({ open: true, status })}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg border border-gray-200 text-gray-700 hover:bg-gray-50 transition-colors"
                    >
                      {ORDER_STATUS_LABELS[status]}
                    </button>
                  ))}
                  {validTransitions.includes('cancelled') && (
                    <button
                      onClick={() => setCancelDialog(true)}
                      className="px-3 py-1.5 text-sm font-medium rounded-lg border border-red-200 text-red-600 hover:bg-red-50 transition-colors"
                    >
                      Hủy đơn
                    </button>
                  )}
                </div>
              </div>
            )}

            {validTransitions.length === 0 && (
              <p className="text-sm text-gray-400 italic">
                {order.orderStatus === 'completed' ? 'Đơn hàng đã hoàn tất.' : 'Đơn hàng đã bị hủy.'}
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <ConfirmDialog
        open={statusDialog.open}
        title="Cập nhật trạng thái"
        message={`Chuyển trạng thái đơn hàng sang "${statusDialog.status ? ORDER_STATUS_LABELS[statusDialog.status] : ''}"?`}
        confirmText="Cập nhật"
        onConfirm={handleStatusChange}
        onCancel={() => setStatusDialog({ open: false, status: null })}
      />
      <ConfirmDialog
        open={cancelDialog}
        title="Hủy đơn hàng"
        message={`Bạn có chắc muốn hủy đơn hàng ${order.orderCode}? Hành động này không thể hoàn tác.`}
        confirmText="Hủy đơn"
        variant="danger"
        onConfirm={handleCancel}
        onCancel={() => setCancelDialog(false)}
      />
    </div>
  );
}

function InfoRow({
  icon: Icon,
  label,
  value,
  valueClassName = 'text-sm font-medium text-gray-900',
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  valueClassName?: string;
}) {
  return (
    <div className="flex items-start gap-3">
      <Icon className="w-4 h-4 text-gray-400 mt-0.5 shrink-0" />
      <div>
        <p className="text-xs text-gray-500">{label}</p>
        <p className={valueClassName}>{value}</p>
      </div>
    </div>
  );
}
