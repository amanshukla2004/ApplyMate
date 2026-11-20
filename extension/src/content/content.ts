import { adapterRegistry } from '../adapters/adapterRegistry';
import { ExtensionMessage } from '../types/messaging';

console.log('[JobMate] Content script loaded on:', window.location.href);

// Listen for messages from background worker or side panel
chrome.runtime.onMessage.addListener((message: ExtensionMessage, _sender, sendResponse) => {
  if (message.type === 'PING') {
    sendResponse({ type: 'PONG', version: '1.0.0' });
    return true;
  }

  if (message.type === 'SCAN_FORM') {
    handleScanForm().then(sendResponse);
    return true;
  }

  if (message.type === 'FILL_FIELDS') {
    handleFillFields(message.values).then(sendResponse);
    return true;
  }

  return false;
});

async function handleScanForm() {
  try {
    const adapter = adapterRegistry.getActiveAdapter();
    const fields = await adapter.scanForm();
    const website = adapter.getMetadata();

    return {
      success: true,
      data: {
        type: 'FORM_SCAN_RESULT',
        fields,
        website,
      },
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || 'Failed to scan form',
    };
  }
}

async function handleFillFields(values: Record<string, string>) {
  try {
    const adapter = adapterRegistry.getActiveAdapter();
    const results = await adapter.fillFields(values);

    const total = results.length;
    const success = results.filter((r) => r.success).length;
    const failed = total - success;

    return {
      success: true,
      data: {
        type: 'FILL_RESULT',
        results,
        summary: { total, success, failed },
      },
    };
  } catch (error) {
    return {
      success: false,
      error: (error as Error).message || 'Failed to fill fields',
    };
  }
}
