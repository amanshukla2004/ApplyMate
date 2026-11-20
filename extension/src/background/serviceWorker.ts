import { MessageRouter } from './messageRouter';

// Initialize background message routing
MessageRouter.init();

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[ApplyMate] Extension installed/updated:', details.reason);

  // Set side panel to open on action click if supported
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: false })
      .catch((err) => console.warn('[ApplyMate] SidePanel behavior error:', err));
  }
});

console.log('[ApplyMate] Service worker started.');
