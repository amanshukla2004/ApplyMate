export class TabManager {
  static async getActiveTab(): Promise<chrome.tabs.Tab | null> {
    if (typeof chrome === 'undefined' || !chrome.tabs) {
      return null;
    }

    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (!tab || !tab.id) return null;

      // Ensure tab is not an internal browser page
      if (
        tab.url?.startsWith('chrome://') ||
        tab.url?.startsWith('edge://') ||
        tab.url?.startsWith('chrome-extension://') ||
        tab.url?.startsWith('about:')
      ) {
        return null;
      }

      return tab;
    } catch {
      return null;
    }
  }

  static async ensureContentScriptInjected(tabId: number): Promise<boolean> {
    if (typeof chrome === 'undefined' || !chrome.scripting) {
      return false;
    }

    try {
      // Test ping first
      const isAlive = await new Promise<boolean>((resolve) => {
        chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
          if (chrome.runtime.lastError || !response) {
            resolve(false);
          } else {
            resolve(true);
          }
        });
      });

      if (isAlive) {
        return true;
      }

      // Inject content script if not responsive
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      });
      return true;
    } catch {
      return false;
    }
  }
}
