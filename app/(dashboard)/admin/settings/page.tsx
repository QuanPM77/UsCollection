'use client';

import { useEffect, useState } from 'react';
import {
  Save,
  RotateCcw,
  Store,
  UserRound,
  Upload,
  Trash2,
} from 'lucide-react';
import { settingsService } from '@/lib/admin/services';
import { StoreSettings, DEFAULT_SETTINGS } from '@/lib/admin/types/settings';
import { useToastStore } from '@/stores/admin/toast.store';
import { ConfirmDialog } from '@/components/admin/ui/ConfirmDialog';
import { getAdminAvatar, setAdminAvatar } from '@/lib/admin/avatar';

export default function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showResetDialog, setShowResetDialog] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [adminAvatar, setAvatar] = useState<string | null>(null);

  const { addToast } = useToastStore();

  useEffect(() => {
    setAvatar(getAdminAvatar());
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
        {/* Admin profile image */}
        <section className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
          <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-stone-100">
            <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><UserRound className="w-5 h-5" /></div>
            <div>
              <h2 className="text-base font-semibold text-stone-900">Ảnh đại diện admin</h2>
              <p className="text-xs text-stone-500">Ảnh được lưu trên trình duyệt này và hiển thị ở thanh bên.</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-pink-100 overflow-hidden flex items-center justify-center text-pink-700 font-bold">
              {adminAvatar ? <img src={adminAvatar} alt="Ảnh đại diện admin" className="w-full h-full object-cover" /> : 'A'}
            </div>
            <div className="flex flex-wrap gap-2">
              <label className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 cursor-pointer">
                <Upload className="w-3.5 h-3.5" /> Chọn ảnh
                <input type="file" accept="image/png,image/jpeg,image/webp" className="sr-only" onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (!file) return;
                  if (!['image/png', 'image/jpeg', 'image/webp'].includes(file.type) || file.size > 1024 * 1024) {
                    addToast('error', 'Chọn ảnh PNG, JPG hoặc WebP nhỏ hơn 1 MB');
                    event.target.value = '';
                    return;
                  }
                  const reader = new FileReader();
                  reader.onload = () => {
                    if (typeof reader.result !== 'string') return;
                    try {
                      setAdminAvatar(reader.result);
                      setAvatar(reader.result);
                      addToast('success', 'Đã cập nhật ảnh đại diện');
                    } catch {
                      addToast('error', 'Không thể lưu ảnh trên trình duyệt này');
                    }
                  };
                  reader.readAsDataURL(file);
                  event.target.value = '';
                }} />
              </label>
              {adminAvatar && <button type="button" onClick={() => { setAdminAvatar(null); setAvatar(null); }} className="inline-flex items-center gap-2 px-3 py-2 text-xs font-medium text-red-600 bg-white border border-red-200 rounded-lg hover:bg-red-50"><Trash2 className="w-3.5 h-3.5" /> Xóa ảnh</button>}
            </div>
          </div>
        </section>

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
                placeholder="VD: UsStory"
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
