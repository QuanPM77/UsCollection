'use client';

import { useEffect, useState } from 'react';
import {
  Save,
  RotateCcw,
  Store,
  Bell,
  Layers,
  Server,
  Database,
  CheckCircle2,
} from 'lucide-react';
import { settingsService } from '@/lib/admin/services';
import { StoreSettings, DEFAULT_SETTINGS } from '@/lib/admin/types/settings';
import { useToastStore } from '@/stores/admin/toast.store';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';

export default function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { addToast } = useToastStore();

  useEffect(() => {
    async function loadSettings() {
      try {
        const data = await settingsService.getSettings();
        setSettings(data);
      } catch (err) {
        console.error('Failed to load settings:', err);
        addToast('error', 'Không thể tải cấu hình cửa hàng');
      } finally {
        setLoading(false);
      }
    }
    loadSettings();
  }, [addToast]);

  const handleChange = (
    field: keyof StoreSettings,
    value: string | number | boolean
  ) => {
    setSettings((prev) => ({
      ...prev,
      [field]: value,
    }));
    // Clear field error on edit
    if (errors[field]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {};
    if (!settings.storeName.trim()) {
      newErrors.storeName = 'Tên cửa hàng không được để trống';
    }
    if (!settings.contactEmail.trim() || !settings.contactEmail.includes('@')) {
      newErrors.contactEmail = 'Email liên hệ không hợp lệ';
    }
    if (!settings.contactPhone.trim()) {
      newErrors.contactPhone = 'Số điện thoại không được để trống';
    }
    if (settings.lowStockThreshold < 1) {
      newErrors.lowStockThreshold = 'Ngưỡng cảnh báo phải lớn hơn hoặc bằng 1';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) {
      addToast('error', 'Vui lòng kiểm tra lại thông tin cài đặt');
      return;
    }

    setSaving(true);
    try {
      const updated = await settingsService.updateSettings(settings);
      setSettings(updated);
      addToast('success', 'Đã lưu cấu hình cửa hàng thành công');
    } catch (err) {
      console.error('Failed to save settings:', err);
      addToast('error', 'Lỗi khi lưu cấu hình');
    } finally {
      setSaving(false);
    }
  };

  const handleReset = async () => {
    setShowResetDialog(false);
    setSaving(true);
    try {
      const reset = await settingsService.reset();
      setSettings(reset);
      setErrors({});
      addToast('info', 'Đã khôi phục cài đặt về mặc định');
    } catch (err) {
      console.error('Failed to reset settings:', err);
      addToast('error', 'Lỗi khi khôi phục cài đặt');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6 max-w-4xl">
        <div className="h-8 w-48 bg-stone-200 animate-pulse rounded" />
        <div className="bg-white border border-stone-200 rounded-xl p-6 space-y-4 animate-pulse">
          <div className="h-6 w-32 bg-stone-200 rounded" />
          <div className="h-10 w-full bg-stone-100 rounded" />
          <div className="h-10 w-full bg-stone-100 rounded" />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-stone-900 tracking-tight">
            Cài đặt hệ thống
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Quản lý thông tin cửa hàng, ngưỡng cảnh báo tồn kho và cấu hình vận hành
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setShowResetDialog(true)}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-stone-600 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors disabled:opacity-50"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Khôi phục mặc định
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50 shadow-xs"
          >
            <Save className="w-3.5 h-3.5" />
            {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
          </button>
        </div>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Section 1: Store Information */}
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-stone-100">
            <div className="p-2 bg-pink-50 text-pink-600 rounded-lg">
              <Store className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                Thông tin thương hiệu & Cửa hàng
              </h2>
              <p className="text-xs text-stone-500">
                Thông tin xuất hiện trên hóa đơn và liên hệ khách hàng
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Tên thương hiệu / Cửa hàng <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={settings.storeName}
                onChange={(e) => handleChange('storeName', e.target.value)}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 ${
                  errors.storeName ? 'border-red-400' : 'border-stone-200'
                }`}
                placeholder="VD: UsCollection - BeadStudio"
              />
              {errors.storeName && (
                <p className="text-xs text-red-500 mt-1">{errors.storeName}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Mô tả ngắn
              </label>
              <input
                type="text"
                value={settings.storeDescription}
                onChange={(e) => handleChange('storeDescription', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                placeholder="Cửa hàng vòng tay thủ công handmade"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Số điện thoại liên hệ <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={settings.contactPhone}
                onChange={(e) => handleChange('contactPhone', e.target.value)}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 ${
                  errors.contactPhone ? 'border-red-400' : 'border-stone-200'
                }`}
                placeholder="0901 234 567"
              />
              {errors.contactPhone && (
                <p className="text-xs text-red-500 mt-1">{errors.contactPhone}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Email hỗ trợ <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                value={settings.contactEmail}
                onChange={(e) => handleChange('contactEmail', e.target.value)}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 ${
                  errors.contactEmail ? 'border-red-400' : 'border-stone-200'
                }`}
                placeholder="contact@uscollection.vn"
              />
              {errors.contactEmail && (
                <p className="text-xs text-red-500 mt-1">{errors.contactEmail}</p>
              )}
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Địa chỉ showroom / xưởng sản xuất
              </label>
              <input
                type="text"
                value={settings.address}
                onChange={(e) => handleChange('address', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
                placeholder="Quận 1, TP. Hồ Chí Minh"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Inventory & Order Settings */}
        <div className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-stone-100">
            <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                Kho hàng & Xử lý đơn
              </h2>
              <p className="text-xs text-stone-500">
                Quy định cảnh báo tồn kho và trạng thái đơn hàng tự động
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Ngưỡng cảnh báo sắp hết hạt (hạt) <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                min="1"
                max="500"
                value={settings.lowStockThreshold}
                onChange={(e) => handleChange('lowStockThreshold', parseInt(e.target.value, 10) || 0)}
                className={`w-full px-3 py-2 text-sm bg-white border rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 ${
                  errors.lowStockThreshold ? 'border-red-400' : 'border-stone-200'
                }`}
              />
              <p className="text-[11px] text-stone-400 mt-1">
                Hệ thống sẽ gắn cờ cảnh báo màu vàng khi số lượng hạt dưới mức này.
              </p>
              {errors.lowStockThreshold && (
                <p className="text-xs text-red-500 mt-1">{errors.lowStockThreshold}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-stone-700 mb-1">
                Đơn vị tiền tệ hiển thị
              </label>
              <select
                value={settings.currency}
                onChange={(e) => handleChange('currency', e.target.value)}
                className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500"
              >
                <option value="VND">VND (₫) - Việt Nam Đồng</option>
                <option value="USD">USD ($) - US Dollar</option>
              </select>
            </div>

            <div className="sm:col-span-2 pt-2">
              <label className="flex items-start gap-3 p-3 rounded-lg border border-stone-200 hover:bg-stone-50/50 cursor-pointer transition-colors">
                <input
                  type="checkbox"
                  checked={settings.orderAutoConfirm}
                  onChange={(e) => handleChange('orderAutoConfirm', e.target.checked)}
                  className="mt-1 h-4 w-4 rounded border-stone-300 text-pink-600 focus:ring-pink-500"
                />
                <div>
                  <span className="text-sm font-medium text-stone-900">
                    Tự động xác nhận đơn hàng khi thanh toán MoMo hoàn tất
                  </span>
                  <p className="text-xs text-stone-500 mt-0.5">
                    Nếu bật, các đơn hàng thanh toán thành công qua MoMo sẽ tự động chuyển sang trạng thái &quot;Đã xác nhận&quot; mà không cần admin duyệt thủ công.
                  </p>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Section 3: Architecture & Integration Roadmap */}
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-stone-200">
            <div className="p-2 bg-stone-200 text-stone-700 rounded-lg">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">
                Kiến trúc hạ tầng & Lộ trình tích hợp (Roadmap)
              </h2>
              <p className="text-xs text-stone-500">
                Tình trạng kết nối các dịch vụ trong giai đoạn Foundation
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="bg-white p-3.5 rounded-lg border border-stone-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Server className="w-3.5 h-3.5 text-blue-500" />
                  Service Layer
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                  Hoạt động
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Tầng trừu tượng hóa dịch vụ độc lập, sẵn sàng trỏ API
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-stone-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <Database className="w-3.5 h-3.5 text-amber-500" />
                  Database
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200">
                  Lộ trình Phase 3
                </span>
              </div>
              <p className="text-xs text-stone-500">
                AWS DynamoDB & S3 lưu trữ mô hình và media
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-lg border border-stone-200">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-xs font-semibold text-stone-700 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-pink-500" />
                  Cổng MoMo
                </span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-blue-50 text-blue-700 border border-blue-200">
                  Strategy Mock
                </span>
              </div>
              <p className="text-xs text-stone-500">
                Tích hợp sẵn luồng thanh toán và cập nhật đơn
              </p>
            </div>
          </div>
        </div>
      </form>

      {/* Reset Confirmation Dialog */}
      <ConfirmDialog
        open={showResetDialog}
        title="Khôi phục cài đặt mặc định?"
        message="Hành động này sẽ đặt lại toàn bộ thông tin cấu hình cửa hàng về giá trị ban đầu."
        confirmText="Khôi phục"
        cancelText="Hủy bỏ"
        variant="danger"
        onConfirm={handleReset}
        onCancel={() => setShowResetDialog(false)}
      />
    </div>
  );
}
