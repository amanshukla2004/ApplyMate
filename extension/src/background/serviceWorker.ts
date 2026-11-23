import { MessageRouter } from './messageRouter';
import { TabManager } from './tabManager';
import { profileService } from '../services/profileService';

// Initialize background message routing
MessageRouter.init();

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[HapplyMate] Extension installed/updated:', details.reason);

  // Set side panel to open on action click if supported
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: false })
      .catch((err) => console.warn('[HapplyMate] SidePanel behavior error:', err));
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
            console.warn('[HapplyMate] Failed to pre-fetch profile for shortcut:', profileErr);
          }
          chrome.tabs.sendMessage(tab.id, {
            type: 'EXECUTE_AUTOFILL_SHORTCUT',
            data: profilePayload,
          }).catch((err) => {
            console.warn('[HapplyMate] Shortcut message dispatch failed:', err);
          });
        }
      } catch (err) {
        console.warn('[HapplyMate] Command error:', err);
      }
    }
  });
}

console.log('[HapplyMate] Service worker started.');
