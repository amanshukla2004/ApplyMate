import { adapterRegistry } from '../adapters/adapterRegistry';
import { ExtensionMessage } from '../types/messaging';
import { domScanner } from './domScanner';

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

  if (message.type === 'HIGHLIGHT_FIELD') {
    handleHighlightField(message.fieldId, message.highlight);
    sendResponse({ success: true });
    return true;
  }

  return false;
});

function handleHighlightField(fieldId: string, highlight: boolean) {
  const el = domScanner.getElement(fieldId);
  if (!el) return;

  if (highlight) {
    el.style.outline = '2px solid #8B74F0';
    el.style.outlineOffset = '2px';
    el.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  } else {
    el.style.outline = '';
    el.style.outlineOffset = '';
  }
}

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

    // Apply 2-second lilac visual highlight to filled inputs
    for (const [id] of Object.entries(values)) {
      const el = domScanner.getElement(id);
      if (el) {
        el.style.outline = '2px solid #8B74F0';
        el.style.outlineOffset = '2px';
        setTimeout(() => {
          el.style.outline = '';
          el.style.outlineOffset = '';
        }, 2000);
      }
    }

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

// In-Page Floating Quick-Action Widget inside Shadow DOM
let shadowToastTimeout: any = null;

function initFloatingWidget() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('jobmate-shadow-host')) return;

  const host = document.createElement('div');
  host.id = 'jobmate-shadow-host';
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.right = '20px';
  host.style.bottom = '20px';
  host.style.zIndex = '2147483647';

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    * { box-sizing: border-box; margin: 0; font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; }
    .fab {
      height: 44px;
      padding: 0 20px;
      border-radius: 99px;
      border: 0;
      background: #2B2340;
      color: #ffffff;
      font-weight: 600;
      font-size: 14px;
      display: flex;
      gap: 8px;
      align-items: center;
      box-shadow: 0 10px 24px rgba(43, 35, 64, 0.35);
      cursor: pointer;
      user-select: none;
      transition: transform 0.15s ease, box-shadow 0.15s ease;
    }
    .fab:active {
      transform: scale(0.98);
    }
    .toast {
      position: absolute;
      right: 0;
      bottom: 56px;
      padding: 10px 18px;
      border-radius: 99px;
      font-weight: 600;
      font-size: 14px;
      background: #D5F5E6;
      color: #17684A;
      box-shadow: 0 10px 24px rgba(23, 104, 74, 0.2);
      display: flex;
      gap: 10px;
      align-items: center;
      opacity: 0;
      transform: translateY(6px);
      transition: opacity 0.3s ease, transform 0.3s ease;
      white-space: nowrap;
      pointer-events: none;
    }
    .toast.show {
      opacity: 1;
      transform: none;
      pointer-events: auto;
    }
    .toast.bad {
      background: #FFE3DA;
      color: #9A3E27;
      box-shadow: 0 10px 24px rgba(154, 62, 39, 0.2);
    }
    .toast button {
      border: 0;
      background: transparent;
      color: inherit;
      font-weight: 700;
      text-decoration: underline;
      cursor: pointer;
    }
    @media (prefers-reduced-motion: reduce) {
      * { transition: none !important; animation: none !important; }
    }
  `;

  const container = document.createElement('div');
  container.style.position = 'relative';

  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.setAttribute('role', 'status');
  toast.setAttribute('aria-live', 'polite');

  const fab = document.createElement('button');
  fab.className = 'fab';
  fab.innerHTML = `
    <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
      <path d="M13 2 4 14h6l-1 8 9-12h-6z"/>
    </svg>
    <span>JobMate Autofill</span>
  `;

  const triggerToast = (msg: string, isError = false, onRetry?: () => void) => {
    clearTimeout(shadowToastTimeout);
    toast.className = `toast ${isError ? 'bad' : ''} show`;
    toast.innerHTML = isError && onRetry
      ? `<span>${msg}</span><button id="toast-rt">Retry</button>`
      : `<span>${msg}</span>`;

    if (isError && onRetry) {
      toast.querySelector('#toast-rt')?.addEventListener('click', onRetry);
    }

    shadowToastTimeout = setTimeout(() => {
      toast.classList.remove('show');
    }, 3000);
  };

  fab.onclick = async () => {
    try {
      const profileRes = await chrome.runtime.sendMessage({ type: 'GET_USER_PROFILE' });
      if (!profileRes || !profileRes.success || !profileRes.data?.profile) {
        triggerToast('Open Options to set up profile first', true);
        return;
      }

      const { profile, edu, exp, skills } = profileRes.data;
      const adapter = adapterRegistry.getActiveAdapter();
      const fields = await adapter.scanForm();

      const values: Record<string, string> = {};
      for (const f of fields) {
        if (f.fieldType === 'file') continue;
        const val = resolveCanonicalValue(f.canonicalField, profile, edu, exp, skills);
        if (val) {
          values[f.id] = val;
        }
      }

      const count = Object.keys(values).length;
      if (count === 0) {
        triggerToast('No fillable fields matched', true, () => fab.click());
        return;
      }

      const results = await adapter.fillFields(values);
      const successful = results.filter((r) => r.success).length;

      // Apply lilac outline for 2s
      for (const [id] of Object.entries(values)) {
        const el = domScanner.getElement(id);
        if (el) {
          el.style.outline = '2px solid #8B74F0';
          el.style.outlineOffset = '2px';
          setTimeout(() => {
            el.style.outline = '';
            el.style.outlineOffset = '';
          }, 2000);
        }
      }

      triggerToast(`Filled ${successful} fields`);
    } catch (err) {
      triggerToast('Could not fill form', true, () => fab.click());
    }
  };

  container.appendChild(toast);
  container.appendChild(fab);
  shadow.appendChild(style);
  shadow.appendChild(container);
  document.body.appendChild(host);
}

function resolveCanonicalValue(
  canonical: string | undefined,
  profile: any,
  edu: any[],
  _exp: any[],
  skills: any[]
): string {
  if (!profile || !canonical) return '';
  switch (canonical) {
    case 'FIRST_NAME':
      return profile.personal?.firstName || '';
    case 'LAST_NAME':
      return profile.personal?.lastName || '';
    case 'FULL_NAME':
      return profile.personal?.fullName || `${profile.personal?.firstName || ''} ${profile.personal?.lastName || ''}`.trim();
    case 'EMAIL':
      return profile.personal?.email || '';
    case 'PHONE':
      return profile.personal?.phone || '';
    case 'ADDRESS':
      return profile.address?.addressLine1 || profile.address?.line1 || '';
    case 'ADDRESS_LINE_2':
      return profile.address?.addressLine2 || profile.address?.line2 || '';
    case 'CITY':
      return profile.address?.city || '';
    case 'STATE':
      return profile.address?.state || '';
    case 'COUNTRY':
      return profile.address?.country || '';
    case 'ZIP_CODE':
      return profile.address?.postalCode || '';
    case 'LINKEDIN_URL':
      return profile.links?.linkedInUrl || profile.links?.linkedin || '';
    case 'GITHUB_URL':
      return profile.links?.githubUrl || profile.links?.github || '';
    case 'PORTFOLIO_URL':
      return profile.links?.portfolioUrl || profile.links?.portfolio || '';
    case 'COLLEGE':
      return edu?.[0]?.institution || '';
    case 'DEGREE':
      return edu?.[0]?.degree || '';
    case 'BRANCH':
      return edu?.[0]?.fieldOfStudy || edu?.[0]?.branch || '';
    case 'CGPA':
      return edu?.[0]?.gpa || edu?.[0]?.cgpa || '';
    case 'GRADUATION_YEAR':
      return edu?.[0]?.endDate || edu?.[0]?.graduationYear || '';
    case 'SKILLS':
      return skills?.map((s) => s.name).join(', ') || '';
    case 'WORK_AUTHORIZATION':
      return profile.preferences?.workAuthorization || 'Authorized to work';
    case 'NOTICE_PERIOD':
      return profile.preferences?.noticePeriodDays || 'Immediate';
    case 'GENDER':
      return profile.personal?.gender || '';
    case 'RACE_ETHNICITY':
      return profile.personal?.race || '';
    default:
      return '';
  }
}

function initSubmitDetection() {
  if (typeof document === 'undefined') return;

  document.addEventListener('submit', () => recordApplicationOnSubmit(), true);

  document.addEventListener(
    'click',
    (e) => {
      const target = e.target as HTMLElement;
      if (!target) return;
      const btn = target.closest('button, input[type="submit"], [role="button"]');
      if (btn) {
        const text = (btn.textContent || btn.getAttribute('value') || '').toLowerCase().trim();
        if (
          text === 'submit' ||
          text.includes('submit application') ||
          text === 'apply' ||
          text.includes('send application')
        ) {
          recordApplicationOnSubmit();
        }
      }
    },
    true
  );
}

function recordApplicationOnSubmit() {
  try {
    const jobTitle = document.title.split(/[-|–•]/)[0].trim() || 'Software Engineer';
    const companyName = window.location.hostname.replace('www.', '').split('.')[0];
    chrome.runtime.sendMessage({
      type: 'RECORD_APPLICATION',
      data: {
        companyName: companyName.charAt(0).toUpperCase() + companyName.slice(1),
        jobTitle,
        jobUrl: window.location.href,
      },
    });
  } catch {
    // Ignore error
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initFloatingWidget();
      initSubmitDetection();
    });
  } else {
    initFloatingWidget();
    initSubmitDetection();
  }
}
