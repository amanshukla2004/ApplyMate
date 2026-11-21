import { TabManager } from './tabManager';
import { ExtensionMessage } from '../types/messaging';
import { profileService } from '../services/profileService';
import { applicationService } from '../services/applicationService';
import { ApplicationRecord } from '../types/profile';

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
            error: 'No active job application tab found. Please open or switch to a job posting tab.',
          };
        }

        await TabManager.ensureContentScriptInjected(tab.id);

        return new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id!, { type: 'SCAN_FORM' }, (response) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: 'Could not connect to the webpage tab. Please refresh the webpage tab (F5) once and try again.',
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

        await TabManager.ensureContentScriptInjected(tab.id);

        return new Promise((resolve) => {
          chrome.tabs.sendMessage(tab.id!, message, (response) => {
            if (chrome.runtime.lastError) {
              resolve({
                success: false,
                error: 'Could not connect to the webpage tab. Please refresh the webpage tab (F5) once and try again.',
              });
            } else {
              resolve(response);
            }
          });
        });
      }

      case 'RELOAD_ACTIVE_TAB': {
        const tab = await TabManager.getActiveTab();
        if (tab && tab.id) {
          await chrome.tabs.reload(tab.id);
          return { success: true };
        }
        return { success: false, error: 'No active tab found to reload' };
      }

      case 'OPEN_OPTIONS': {
        if (chrome.runtime.openOptionsPage) {
          chrome.runtime.openOptionsPage();
        }
        return { success: true };
      }

      case 'OPEN_SIDE_PANEL': {
        const tab = await TabManager.getActiveTab();
        if (tab && tab.id && chrome.sidePanel && chrome.sidePanel.open) {
          try {
            await chrome.sidePanel.open({ tabId: tab.id });
            return { success: true };
          } catch (err) {
            return { success: false, error: (err as Error).message };
          }
        }
        return { success: false, error: 'Side panel open not supported' };
      }

      case 'GET_USER_PROFILE': {
        try {
          const [profile, edu, exp, skills] = await Promise.all([
            profileService.getProfile(),
            profileService.getEducation(),
            profileService.getExperience(),
            profileService.getSkills(),
          ]);
          return {
            success: true,
            data: { profile, edu, exp, skills },
          };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }
      }

      case 'WORKDAY_STEP_CHANGED': {
        return { success: true };
      }

      case 'HIGHLIGHT_FIELD': {
        const tab = await TabManager.getActiveTab();
        if (tab && tab.id) {
          chrome.tabs.sendMessage(tab.id, message).catch(() => {});
        }
        return { success: true };
      }

      case 'RECORD_APPLICATION': {
        try {
          const payload = (message as { type: 'RECORD_APPLICATION'; data: { companyName?: string; jobTitle?: string; jobUrl?: string; platform?: string } }).data;
          const now = new Date();
          const targetUrl = payload?.jobUrl || (await TabManager.getActiveTab())?.url || '';
          const detectedPlatform = payload?.platform || applicationService.detectPlatformFromUrl(targetUrl);

          const newApp: ApplicationRecord = {
            id: `app_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
            companyName: payload?.companyName || 'Company',
            jobTitle: payload?.jobTitle || 'Role',
            jobUrl: targetUrl,
            platform: detectedPlatform,
            applicationDate: now.toISOString().split('T')[0],
            status: 'Applied',
            notes: 'Auto-recorded by HapplyMate on form submission',
            createdAt: now.toISOString(),
            updatedAt: now.toISOString(),
          };
          await applicationService.saveApplication(newApp);
          return { success: true, data: newApp };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }
      }

      default:
        return { success: false, error: `Unhandled message type` };
    }
  }
}
