import { StoreSettings, StoreSocialLink, DEFAULT_SETTINGS } from '../types/settings';

type DatabaseSettings = {
  store_name: string; contact_phone: string; contact_email: string;
  low_stock_threshold: number; currency: string;
  socialLinks: StoreSocialLink[];
};
function fromDatabase(value: DatabaseSettings): StoreSettings {
  return { storeName: value.store_name, contactPhone: value.contact_phone,
    contactEmail: value.contact_email, socialLinks: value.socialLinks ?? [], lowStockThreshold: value.low_stock_threshold,
    currency: value.currency };
}
async function save(settings: StoreSettings): Promise<StoreSettings> {
  const response = await fetch('/api/admin/settings', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(settings) });
  const data = await response.json();
  if (!response.ok) throw new Error(data.message || 'Không thể lưu cài đặt.');
  return fromDatabase(data as DatabaseSettings);
}

export const settingsService = {
  async getSettings(): Promise<StoreSettings> {
    const response = await fetch('/api/admin/settings');
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || 'Không thể tải cài đặt.');
    return fromDatabase(data as DatabaseSettings);
  },
  async updateSettings(settings: Partial<StoreSettings>): Promise<StoreSettings> { return save({ ...DEFAULT_SETTINGS, ...settings }); },
  async reset(): Promise<StoreSettings> { return save(DEFAULT_SETTINGS); },
};
