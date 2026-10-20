'use client';

import { useEffect, useState } from 'react';
import {
  Save,
  Store,
  KeyRound,
  Link2,
  Plus,
  Trash2,
} from 'lucide-react';
import { settingsService } from '@/lib/admin/services';
import { StoreSettings, DEFAULT_SETTINGS } from '@/lib/admin/types/settings';
import { useToastStore } from '@/stores/admin/toast.store';

export default function SettingsPage() {
  const [settings, setSettings] = useState<StoreSettings>(DEFAULT_SETTINGS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [passwordSaving, setPasswordSaving] = useState(false);
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

  const handleSocialLinkChange = (index: number, field: 'name' | 'url', value: string) => {
    setSettings((prev) => ({
      ...prev,
      socialLinks: prev.socialLinks.map((link, linkIndex) => linkIndex === index ? { ...link, [field]: value } : link),
    }));
  };

  const addSocialLink = () => setSettings((prev) => ({
    ...prev,
    socialLinks: [...prev.socialLinks, { name: '', url: '' }],
  }));

  const removeSocialLink = (index: number) => setSettings((prev) => ({
    ...prev,
    socialLinks: prev.socialLinks.filter((_, linkIndex) => linkIndex !== index),
  }));

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
    settings.socialLinks.forEach((link, index) => {
      let validUrl = false;
      try {
        const parsed = new URL(link.url);
        validUrl = parsed.protocol === 'http:' || parsed.protocol === 'https:';
      } catch { /* An incomplete URL is reported below. */ }
      if (!link.name.trim() || !validUrl) {
        newErrors.socialLinks = `Vui lòng điền tên và đường dẫn hợp lệ cho liên kết ${index + 1}.`;
      }
    });

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

  const handlePasswordChange = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const values = new FormData(form);
    const currentPassword = String(values.get('currentPassword') ?? '');
    const newPassword = String(values.get('newPassword') ?? '');
    const confirmPassword = String(values.get('confirmPassword') ?? '');
    if (newPassword.length < 8) {
      addToast('error', 'Mật khẩu mới phải có ít nhất 8 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      addToast('error', 'Mật khẩu xác nhận không khớp');
      return;
    }

    setPasswordSaving(true);
    try {
      const response = await fetch('/api/admin/account/password', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok) throw new Error(data?.message || 'Không thể đổi mật khẩu');
      form.reset();
      addToast('success', 'Đã đổi mật khẩu admin thành công');
    } catch (err) {
      addToast('error', err instanceof Error ? err.message : 'Không thể đổi mật khẩu');
    } finally {
      setPasswordSaving(false);
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
                placeholder="VD: UsStory"
              />
              {errors.storeName && (
                <p className="text-xs text-red-500 mt-1">{errors.storeName}</p>
              )}
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

          </div>

          <div className="mt-6 border-t border-stone-100 pt-5">
            <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="flex items-center gap-1.5 text-sm font-semibold text-stone-800"><Link2 className="h-4 w-4 text-pink-600" /> Liên kết fanpage</h3>
                <p className="mt-0.5 text-xs text-stone-500">Các liên kết sẽ hiển thị ở cuối trang chính của khách hàng.</p>
              </div>
              <button type="button" onClick={addSocialLink} className="inline-flex items-center justify-center gap-1.5 rounded-lg border border-pink-200 px-3 py-2 text-xs font-semibold text-pink-700 transition hover:bg-pink-50">
                <Plus className="h-3.5 w-3.5" /> Thêm liên kết
              </button>
            </div>
            {settings.socialLinks.length === 0 ? <p className="rounded-lg bg-stone-50 px-3 py-3 text-xs text-stone-500">Chưa có liên kết nào. Nhấn “Thêm liên kết” để tạo.</p> : <div className="space-y-3">
              {settings.socialLinks.map((link, index) => <div key={index} className="grid grid-cols-1 gap-3 rounded-lg border border-stone-200 p-3 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)_auto] sm:items-end">
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-700">Tên</label>
                  <input type="text" maxLength={100} value={link.name} onChange={(event) => handleSocialLinkChange(index, 'name', event.target.value)} placeholder="Facebook, Instagram..." className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20" />
                </div>
                <div>
                  <label className="mb-1 block text-xs font-medium text-stone-700">Đường dẫn</label>
                  <input type="url" maxLength={2048} value={link.url} onChange={(event) => handleSocialLinkChange(index, 'url', event.target.value)} placeholder="https://facebook.com/..." className="w-full rounded-lg border border-stone-200 px-3 py-2 text-sm focus:border-pink-500 focus:outline-none focus:ring-2 focus:ring-pink-500/20" />
                </div>
                <button type="button" onClick={() => removeSocialLink(index)} aria-label={`Xóa liên kết ${index + 1}`} className="inline-flex h-9 items-center justify-center gap-1.5 rounded-lg px-3 text-xs font-medium text-red-600 transition hover:bg-red-50">
                  <Trash2 className="h-3.5 w-3.5" /> Xóa
                </button>
              </div>)}
            </div>}
            {errors.socialLinks && <p className="mt-2 text-xs text-red-500">{errors.socialLinks}</p>}
          </div>
        </div>

      </form>

      <section className="bg-white border border-stone-200 rounded-xl p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 mb-4 border-b border-stone-100">
          <div className="p-2 bg-pink-50 text-pink-600 rounded-lg"><KeyRound className="w-5 h-5" /></div>
          <div>
            <h2 className="text-base font-semibold text-stone-900">Đổi mật khẩu admin</h2>
            <p className="text-xs text-stone-500">Xác nhận mật khẩu hiện tại để cập nhật mật khẩu mới.</p>
          </div>
        </div>
        <form onSubmit={handlePasswordChange} className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1" htmlFor="admin-current-password">Mật khẩu hiện tại *</label>
            <input id="admin-current-password" name="currentPassword" type="password" required autoComplete="current-password" className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1" htmlFor="admin-new-password">Mật khẩu mới *</label>
            <input id="admin-new-password" name="newPassword" type="password" required minLength={8} autoComplete="new-password" className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500" />
          </div>
          <div>
            <label className="block text-xs font-medium text-stone-700 mb-1" htmlFor="admin-confirm-password">Nhập lại mật khẩu mới *</label>
            <input id="admin-confirm-password" name="confirmPassword" type="password" required minLength={8} autoComplete="new-password" className="w-full px-3 py-2 text-sm bg-white border border-stone-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500" />
          </div>
          <div className="sm:col-span-3">
            <button type="submit" disabled={passwordSaving} className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-pink-600 rounded-lg hover:bg-pink-700 transition-colors disabled:opacity-50">
              <KeyRound className="w-3.5 h-3.5" />
              {passwordSaving ? 'Đang cập nhật...' : 'Cập nhật mật khẩu'}
            </button>
          </div>
        </form>
      </section>

    </div>
  );
}
