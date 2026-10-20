// Settings types for admin configuration

export interface StoreSettings {
  storeName: string;
  contactPhone: string;
  contactEmail: string;
  socialLinks: StoreSocialLink[];
  lowStockThreshold: number;
  currency: string;
  orderAutoConfirm: boolean;
}

export interface StoreSocialLink {
  name: string;
  url: string;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  storeName: 'UsStory',
  contactPhone: '',
  contactEmail: '',
  socialLinks: [],
  lowStockThreshold: 5,
  currency: 'VND',
  orderAutoConfirm: false,
};
