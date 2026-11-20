import { MessageRouter } from './messageRouter';

// Initialize background message routing
MessageRouter.init();

chrome.runtime.onInstalled.addListener((details) => {
  console.log('[JobMate] Extension installed/updated:', details.reason);

  // Set side panel to open on action click if supported
  if (chrome.sidePanel && chrome.sidePanel.setPanelBehavior) {
    chrome.sidePanel
      .setPanelBehavior({ openPanelOnActionClick: false })
      .catch((err) => console.warn('[JobMate] SidePanel behavior error:', err));
  }
});

console.log('[JobMate] Service worker started.');
