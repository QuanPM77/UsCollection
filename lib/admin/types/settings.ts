// Settings types for admin configuration

export interface StoreSettings {
  storeName: string;
  storeDescription: string;
  contactPhone: string;
  contactEmail: string;
  address: string;
  lowStockThreshold: number;
  currency: string;
  orderAutoConfirm: boolean;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'UsCollection - BeadStudio',
  storeDescription: 'Cửa hàng vòng tay thủ công handmade',
  contactPhone: '0901 234 567',
  contactEmail: 'contact@uscollection.vn',
  address: 'Quận 1, TP. Hồ Chí Minh',
  lowStockThreshold: 10,
  currency: 'VND',
  orderAutoConfirm: false,
};
