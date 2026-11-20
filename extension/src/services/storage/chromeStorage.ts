import { AppSettings } from '../../types/profile';

const DEFAULT_SETTINGS: AppSettings = {
  aiEnabled: false,
  aiProvider: 'groq',
  autofillHighlight: true,
  showConfidenceScores: true,
  soundEffects: false,
  theme: 'light',
};

const SETTINGS_KEY = 'jobmate_settings';

export class ChromeStorageClient {
  private hasChromeStorage(): boolean {
    return typeof chrome !== 'undefined' && !!chrome?.storage?.local;
  }

  async getSettings(): Promise<AppSettings> {
    if (this.hasChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.get([SETTINGS_KEY], (result) => {
          if (result && result[SETTINGS_KEY]) {
            resolve({ ...DEFAULT_SETTINGS, ...result[SETTINGS_KEY] });
          } else {
            resolve(DEFAULT_SETTINGS);
          }
        });
      });
    }

    // LocalStorage fallback for tests / standalone browser dev
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) {
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
      }
    } catch {
      // Ignore fallback errors
    }
    return DEFAULT_SETTINGS;
  }

  async saveSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
    const current = await this.getSettings();
    const updated = { ...current, ...settings };

    if (this.hasChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.set({ [SETTINGS_KEY]: updated }, () => {
          resolve(updated);
        });
      });
    }

    try {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(updated));
    } catch {
      // Ignore fallback errors
    }
    return updated;
  }

  async clearSettings(): Promise<void> {
    if (this.hasChromeStorage()) {
      return new Promise((resolve) => {
        chrome.storage.local.remove([SETTINGS_KEY], () => resolve());
      });
    }
    localStorage.removeItem(SETTINGS_KEY);
  }
}

export const chromeStorageClient = new ChromeStorageClient();
