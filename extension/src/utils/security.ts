/**
 * Security & Hardening Utilities for HapplyMate
 * 
 * Enforces zero-trust input handling, protocol smuggling defenses,
 * defensive clipboard async handling, and string bounds.
 */

/**
 * Safely opens an external URL in a new browser tab.
 * Strictly verifies the URL uses HTTP or HTTPS scheme, stripping any dangerous
 * javascript:, data:, blob:, or file: schemes to prevent protocol smuggling and Stored XSS.
 * Always applies 'noopener,noreferrer' window features.
 */
export function safeOpenExternalUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();

  // Strict regex allowing only http:// and https:// URLs
  if (!/^https?:\/\/[^\s$.?#].[^\s]*$/i.test(trimmed)) {
    console.warn('[Security Guard] Refusing to open non-http(s) URL:', trimmed);
    return false;
  }

  try {
    const parsed = new URL(trimmed);
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      console.warn('[Security Guard] Invalid URL protocol:', parsed.protocol);
      return false;
    }

    if (typeof window !== 'undefined' && window.open) {
      window.open(parsed.href, '_blank', 'noopener,noreferrer');
      return true;
    }
  } catch (err) {
    console.warn('[Security Guard] Malformed URL rejected:', err);
    return false;
  }

  return false;
}

/**
 * Defensively copies text to clipboard with rejection handling.
 * Resolves to boolean indicating success, preventing unhandled promise rejections
 * when window lacks focus or clipboard permissions are restricted.
 */
export async function safeCopyToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  try {
    if (typeof navigator !== 'undefined' && navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch (err) {
    console.warn('[Clipboard Guard] Failed to copy to clipboard:', err);
  }

  return false;
}

/**
 * Defensively bounds text inputs to prevent CPU freeze / ReDoS attacks on large pastes.
 */
export function boundTextInput(text: string, maxLength = 50000): string {
  if (!text || typeof text !== 'string') return '';
  return text.trim().slice(0, maxLength);
}
