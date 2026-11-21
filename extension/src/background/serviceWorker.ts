import { MessageRouter } from './messageRouter';

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
        const [activeTab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (activeTab && activeTab.id) {
          chrome.tabs.sendMessage(activeTab.id, { type: 'EXECUTE_AUTOFILL_SHORTCUT' }).catch((err) => {
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
