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

// In-Page Floating Quick-Action Widget
function initFloatingWidget() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('jobmate-floating-root')) return;

  const container = document.createElement('div');
  container.id = 'jobmate-floating-root';
  container.style.cssText = `
    position: fixed;
    bottom: 24px;
    right: 24px;
    z-index: 2147483640;
    display: flex;
    align-items: center;
    gap: 8px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
  `;

  const pill = document.createElement('div');
  pill.style.cssText = `
    background: #4f46e5;
    color: white;
    padding: 7px 14px;
    border-radius: 9999px;
    font-size: 12px;
    font-weight: 600;
    cursor: pointer;
    box-shadow: 0 4px 14px rgba(79, 70, 229, 0.4);
    display: flex;
    align-items: center;
    gap: 6px;
    transition: all 0.2s ease;
    user-select: none;
  `;
  pill.innerHTML = `<span style="font-size: 14px;">⚡</span><span>JobMate Autofill</span>`;

  pill.onmouseenter = () => {
    pill.style.transform = 'translateY(-2px)';
    pill.style.boxShadow = '0 6px 20px rgba(79, 70, 229, 0.5)';
  };
  pill.onmouseleave = () => {
    pill.style.transform = 'translateY(0)';
    pill.style.boxShadow = '0 4px 14px rgba(79, 70, 229, 0.4)';
  };

  pill.onclick = async () => {
    pill.innerHTML = `<span>⏳ Filling...</span>`;
    try {
      const profileRes = await chrome.runtime.sendMessage({ type: 'GET_USER_PROFILE' });
      if (!profileRes || !profileRes.success || !profileRes.data?.profile) {
        showToast('Please set up your profile in JobMate Options first.', 'warn');
        pill.innerHTML = `<span style="font-size: 14px;">⚡</span><span>JobMate Autofill</span>`;
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

      const totalMatched = Object.keys(values).length;
      if (totalMatched === 0) {
        showToast('No matching profile fields detected on this page.', 'info');
        pill.innerHTML = `<span style="font-size: 14px;">⚡</span><span>JobMate Autofill</span>`;
        return;
      }

      const results = await adapter.fillFields(values);
      const successful = results.filter((r) => r.success).length;

      showToast(`✓ JobMate: Filled ${successful} field(s)! Please review before submitting.`, 'success');
      pill.innerHTML = `<span style="font-size: 14px;">✓</span><span>Filled (${successful})</span>`;
      setTimeout(() => {
        pill.innerHTML = `<span style="font-size: 14px;">⚡</span><span>JobMate Autofill</span>`;
      }, 3500);
    } catch (err) {
      showToast('Autofill failed: ' + (err as Error).message, 'error');
      pill.innerHTML = `<span style="font-size: 14px;">⚡</span><span>JobMate Autofill</span>`;
    }
  };

  const closeBtn = document.createElement('button');
  closeBtn.style.cssText = `
    background: rgba(15, 23, 42, 0.7);
    color: #cbd5e1;
    border: none;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    cursor: pointer;
    font-size: 12px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
    transition: background 0.2s;
  `;
  closeBtn.innerText = '×';
  closeBtn.title = 'Dismiss JobMate badge';
  closeBtn.onclick = () => container.remove();

  container.appendChild(pill);
  container.appendChild(closeBtn);
  document.body.appendChild(container);
}

function showToast(message: string, type: 'success' | 'warn' | 'error' | 'info' = 'info') {
  if (typeof document === 'undefined') return;
  const existing = document.getElementById('jobmate-toast');
  if (existing) existing.remove();

  const toast = document.createElement('div');
  toast.id = 'jobmate-toast';
  const bgColor =
    type === 'success' ? '#059669' : type === 'error' ? '#dc2626' : type === 'warn' ? '#d97706' : '#1e293b';

  toast.style.cssText = `
    position: fixed;
    bottom: 74px;
    right: 24px;
    z-index: 2147483647;
    background: ${bgColor};
    color: white;
    padding: 10px 16px;
    border-radius: 10px;
    font-size: 12px;
    font-weight: 500;
    box-shadow: 0 10px 25px rgba(0,0,0,0.2);
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
    max-width: 320px;
  `;
  toast.innerText = message;
  document.body.appendChild(toast);

  setTimeout(() => {
    toast.remove();
  }, 4000);
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
      return profile.address?.addressLine1 || '';
    case 'ADDRESS_LINE_2':
      return profile.address?.addressLine2 || '';
    case 'CITY':
      return profile.address?.city || '';
    case 'STATE':
      return profile.address?.state || '';
    case 'COUNTRY':
      return profile.address?.country || '';
    case 'ZIP_CODE':
      return profile.address?.postalCode || '';
    case 'LINKEDIN_URL':
      return profile.links?.linkedInUrl || '';
    case 'GITHUB_URL':
      return profile.links?.githubUrl || '';
    case 'PORTFOLIO_URL':
      return profile.links?.portfolioUrl || '';
    case 'COLLEGE':
      return edu?.[0]?.institution || '';
    case 'DEGREE':
      return edu?.[0]?.degree || '';
    case 'BRANCH':
      return edu?.[0]?.branch || '';
    case 'CGPA':
      return edu?.[0]?.cgpa || '';
    case 'GRADUATION_YEAR':
      return edu?.[0]?.graduationYear || '';
    case 'SKILLS':
      return skills?.map((s) => s.name).join(', ') || '';
    case 'WORK_AUTHORIZATION':
      return profile.preferences?.workAuthorizationStatus || 'Authorized to work';
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
        if (text === 'submit' || text.includes('submit application') || text === 'apply' || text.includes('send application')) {
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
