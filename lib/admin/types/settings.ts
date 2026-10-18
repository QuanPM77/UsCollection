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
  storeName: 'UsStory',
  storeDescription: 'Cửa hàng vòng tay thủ công handmade',
  contactPhone: '',
  contactEmail: '',
  address: '',
  lowStockThreshold: 5,
  currency: 'VND',
  orderAutoConfirm: false,
};
