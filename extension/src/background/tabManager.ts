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
      // Test ping first with a timeout
      const isAlive = await new Promise<boolean>((resolve) => {
        let responded = false;
        const timer = setTimeout(() => {
          if (!responded) resolve(false);
        }, 500);

        try {
          chrome.tabs.sendMessage(tabId, { type: 'PING' }, (response) => {
            responded = true;
            clearTimeout(timer);
            if (chrome.runtime.lastError || !response) {
              resolve(false);
            } else {
              resolve(true);
            }
          });
        } catch {
          resolve(false);
        }
      });

      if (isAlive) {
        return true;
      }

      // Inject content script if not responsive
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js'],
      });

      // Brief delay to allow the content script to execute and register listeners
      await new Promise((r) => setTimeout(r, 150));
      return true;
    } catch (err) {
      console.warn('[ApplyMate] Script injection warning:', err);
      return false;
    }
  }
}
