// Settings service — abstracts data access for store configuration
// Currently uses mock state, designed to be replaced with backend API

import { StoreSettings, DEFAULT_SETTINGS } from '../types/settings';

let currentSettings: StoreSettings = { ...DEFAULT_SETTINGS };

function delay(ms: number = 300): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export const settingsService = {
  async getSettings(): Promise<StoreSettings> {
    await delay();
    return { ...currentSettings };
  },

  async updateSettings(newSettings: Partial<StoreSettings>): Promise<StoreSettings> {
    await delay();
    currentSettings = {
      ...currentSettings,
      ...newSettings,
    };
    return { ...currentSettings };
  },

  async reset(): Promise<StoreSettings> {
    await delay();
    currentSettings = { ...DEFAULT_SETTINGS };
    return { ...currentSettings };
  },
};
