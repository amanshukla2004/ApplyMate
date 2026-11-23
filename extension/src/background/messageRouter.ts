import { TabManager } from './tabManager';
import { ExtensionMessage } from '../types/messaging';
import { profileService } from '../services/profileService';
import { applicationService } from '../services/applicationService';
import { ApplicationRecord } from '../types/profile';
import { savedJobRepository } from '../services/savedJob/savedJobRepository';
import { JobExtractorService } from '../services/savedJob/jobExtractorService';
import { SavedJobRecord } from '../types/savedJob';

export class MessageRouter {
  static init(): void {
    if (typeof chrome === 'undefined' || !chrome.runtime) return;

    chrome.runtime.onMessage.addListener((message: ExtensionMessage, sender, sendResponse) => {
      // Security Boundary: Validate that message originates exclusively from our extension
      if (sender.id && sender.id !== chrome.runtime.id) {
        sendResponse({ success: false, error: 'Unauthorized message sender' });
        return false;
      }

      // Validate message structure
      if (!message || typeof message !== 'object' || typeof message.type !== 'string') {
        sendResponse({ success: false, error: 'Malformed message payload' });
        return false;
      }

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
          profileService.clearCache();
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
          console.error('[HapplyMate Background] GET_USER_PROFILE failed:', err);
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

      case 'SAVE_RAW_JOB': {
        try {
          const rawText = (message as { type: 'SAVE_RAW_JOB'; data: { text: string } }).data?.text || '';
          if (!rawText.trim()) {
            return { success: false, error: 'Cannot save empty job text' };
          }

          const now = new Date().toISOString();
          const newId = `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

          // Deterministic heuristic extraction for immediate non-blocking UI display
          const initialExtraction = JobExtractorService.extractHeuristically(rawText);
          const initialRecord: SavedJobRecord = {
            id: newId,
            rawText,
            ...initialExtraction,
            status: 'to-apply',
            extractionStatus: 'pending',
            createdAt: now,
            updatedAt: now,
          };

          await savedJobRepository.save(initialRecord);

          // Asynchronously perform full LLM extraction in background service worker
          (async () => {
            try {
              const extracted = await JobExtractorService.extract(rawText);
              await savedJobRepository.update(newId, {
                ...extracted,
                status: extracted.extractionStatus === 'failed' ? 'needs-review' : 'to-apply',
              });
            } catch (bgErr) {
              console.error('[MessageRouter] Background job extraction error:', bgErr);
              await savedJobRepository.update(newId, {
                extractionStatus: 'failed',
                extractionError: bgErr instanceof Error ? bgErr.message : String(bgErr),
                status: 'needs-review',
              });
            }
          })();

          return { success: true, data: initialRecord };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }
      }

      case 'GET_RECENT_SAVED_JOBS': {
        try {
          const limit = (message as { type: 'GET_RECENT_SAVED_JOBS'; limit?: number }).limit || 5;
          const jobs = await savedJobRepository.getRecent(limit);
          return { success: true, data: jobs };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }
      }

      case 'GET_ALL_SAVED_JOBS': {
        try {
          const jobs = await savedJobRepository.getAll();
          return { success: true, data: jobs };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }
      }

      case 'UPDATE_SAVED_JOB': {
        try {
          const { id, partial } = message as { type: 'UPDATE_SAVED_JOB'; id: string; partial: Partial<SavedJobRecord> };
          const updated = await savedJobRepository.update(id, partial);
          return { success: true, data: updated };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }
      }

      case 'DELETE_SAVED_JOB': {
        try {
          const { id } = message as { type: 'DELETE_SAVED_JOB'; id: string };
          const deleted = await savedJobRepository.delete(id);
          return { success: true, data: deleted };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }
      }

      case 'RERUN_JOB_EXTRACTION': {
        try {
          const { id } = message as { type: 'RERUN_JOB_EXTRACTION'; id: string };
          const existing = await savedJobRepository.getById(id);
          if (!existing) {
            return { success: false, error: `Saved job with id ${id} not found` };
          }

          await savedJobRepository.update(id, { extractionStatus: 'pending' });

          const extracted = await JobExtractorService.extract(existing.rawText);
          const updated = await savedJobRepository.update(id, {
            ...extracted,
            status: extracted.extractionStatus === 'failed' ? 'needs-review' : existing.status,
          });

          return { success: true, data: updated };
        } catch (err) {
          return { success: false, error: (err as Error).message };
        }
      }

      default:
        return { success: false, error: `Unhandled message type` };
    }
  }
}
