import { MessageRouter } from './messageRouter';
import { TabManager } from './tabManager';
import { profileService } from '../services/profileService';
import { savedJobRepository } from '../services/savedJob/savedJobRepository';
import { JobExtractorService } from '../services/savedJob/jobExtractorService';

// Initialize background message routing
MessageRouter.init();

// Self-healing: Reconcile any saved jobs stuck in 'pending' status due to prior SW suspension
(async () => {
  try {
    const allJobs = await savedJobRepository.getAll();
    const pendingJobs = allJobs.filter((j) => j.extractionStatus === 'pending');
    for (const job of pendingJobs) {
      const extracted = await JobExtractorService.extract(job.rawText);
      await savedJobRepository.update(job.id, {
        ...extracted,
        status: extracted.extractionStatus === 'failed' ? 'needs-review' : 'to-apply',
      });
    }
  } catch (reconcileErr) {
    console.warn('[happlied] Startup job reconciliation skipped/failed:', reconcileErr);
  }
})();

chrome.runtime.onInstalled.addListener(async (details) => {
  console.log('[happlied] Extension installed/updated:', details.reason);

  // Set side panel to open on action click if supported
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: false })
      .catch((err) => console.warn('[happlied] SidePanel behavior error:', err));
  }

  // Inject content script into currently open tabs so users don't need to manually reload them
  try {
    if (chrome.tabs && chrome.scripting) {
      const openTabs = await chrome.tabs.query({ url: ['http://*/*', 'https://*/*'] });
      for (const tab of openTabs) {
        if (tab.id) {
          chrome.scripting.executeScript({
            target: { tabId: tab.id },
            files: ['content.js'],
          }).catch(() => {
            // ignore restricted pages (e.g. chrome web store)
          });
        }
      }
    }
  } catch (injectErr) {
    console.warn('[happlied] Content script auto-injection warning:', injectErr);
  }
});

// 1-Click Keyboard Shortcut Listener (Alt+A)
if (chrome.commands && chrome.commands.onCommand) {
  chrome.commands.onCommand.addListener(async (command) => {
    if (command === 'autofill_active_form') {
      try {
        const tab = await TabManager.getActiveTab();
        if (tab && tab.id) {
          await TabManager.ensureContentScriptInjected(tab.id);
          let profilePayload: any = undefined;
          try {
            const [profile, edu, exp, skills] = await Promise.all([
              profileService.getProfile(),
              profileService.getEducation(),
              profileService.getExperience(),
              profileService.getSkills(),
            ]);
            profilePayload = { profile, edu, exp, skills };
          } catch (profileErr) {
            console.warn('[happlied] Failed to pre-fetch profile for shortcut:', profileErr);
          }
          chrome.tabs.sendMessage(tab.id, {
            type: 'EXECUTE_AUTOFILL_SHORTCUT',
            data: profilePayload,
          }).catch((err) => {
            console.warn('[happlied] Shortcut message dispatch failed:', err);
          });
        }
      } catch (err) {
        console.warn('[happlied] Command error:', err);
      }
    }
  });
}

console.log('[happlied] Service worker started.');
