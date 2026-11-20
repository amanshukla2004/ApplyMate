import { TabManager } from './tabManager';
import { ExtensionMessage } from '../types/messaging';

export class MessageRouter {
  static init(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;

    chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
      // Keep channel open for async response
      this.handleMessage(message)
        .then((res) => sendResponse(res))
        .catch((err) => sendResponse({ success: false, error: err.message }));
      return true;
    });
  }

  private static async handleMessage(message: ExtensionMessage): Promise<unknown> {
    switch (message.type) {
      case 'PING':
        return { type: 'PONG', version: '1.0.0' };

      case 'GET_ACTIVE_TAB_INFO': {
        const tab = await TabManager.getActiveTab();
        return {
          type: 'ACTIVE_TAB_INFO_RESULT',
          tabId: tab?.id,
          url: tab?.url,
          title: tab?.title,
        };
      }

      case 'SCAN_FORM': {
        const tab = await TabManager.getActiveTab();
        if (!tab || !tab.id) {
          return {
            success: false,
            error: 'No active job application tab found. Please open a job posting page.',
          };
        }

        await TabManager.ensureContentScriptInjected(tab.id);

        return new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id!, { type: 'SCAN_FORM' }, (response) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message || 'Failed to communicate with page',
              });
            } else {
              resolve(response);
            }
          });
        });
      }

      case 'FILL_FIELDS': {
        const tab = await TabManager.getActiveTab();
        if (!tab || !tab.id) {
          return {
            success: false,
            error: 'No active job application tab found.',
          };
        }

        return new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id!, message, (response) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: chrome.runtime.lastError.message || 'Failed to fill fields on page',
              });
            } else {
              resolve(response);
            }
          });
        });
      }

      case 'OPEN_OPTIONS': {
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        }
        return { success: true };
      }

      default:
        return { success: false, error: `Unhandled message type` };
    }
  }
}
