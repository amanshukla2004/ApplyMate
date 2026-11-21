import { adapterRegistry } from '../adapters/adapterRegistry';
import { ExtensionMessage } from '../types/messaging';
import { domScanner } from './domScanner';

console.log('[HapplyMate] Content script loaded on:', window.location.href);

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

  if (message.type === 'EXECUTE_AUTOFILL_SHORTCUT') {
    executeAutofillFromProfile().then((res) => {
      sendResponse({ success: true, ...res });
    }).catch((err) => {
      sendResponse({ success: false, error: err?.message });
    });
    return true;
  }

  if (message.type === 'SCRAPE_JOB_DESCRIPTION') {
    const jdData = scrapeJobDescriptionFromDOM();
    sendResponse({ success: true, data: jdData });
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
let globalToastFn: ((msg: string, isError?: boolean) => void) | null = null;

function initFloatingWidget() {
  if (typeof document === 'undefined') return;
  if (document.getElementById('happlymate-shadow-host') || document.getElementById('applymate-shadow-host')) return;

  // Don't mount widget on pages without interactive forms/inputs
  const hasInputs = document.querySelector(
    'input:not([type="hidden"]):not([type="search"]), textarea, select, [role="textbox"]'
  );
  if (!hasInputs) return;

  const host = document.createElement('div');
  host.id = 'happlymate-shadow-host';
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
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 3L3 21H7.5L9.5 16.5H14.5L16.5 21H21L12 3Z" fill="#ffffff"/>
      <path d="M12 8.5L13.8 13.5H10.2L12 8.5Z" fill="#8B74F0"/>
      <path d="M9.5 14.5L14.5 14.5L12 9.5Z" fill="#ffffff" opacity="0.9"/>
    </svg>
    <span>HapplyMate Autofill</span>
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

  globalToastFn = triggerToast;

  fab.onclick = async () => {
    await executeAutofillFromProfile();
  };

  container.appendChild(toast);
  container.appendChild(fab);
  shadow.appendChild(style);
  shadow.appendChild(container);
  document.body.appendChild(host);
}

async function executeAutofillFromProfile(): Promise<{ filledCount: number }> {
  try {
    const profileRes = await chrome.runtime.sendMessage({ type: 'GET_USER_PROFILE' });
    if (!profileRes || !profileRes.success || !profileRes.data?.profile) {
      if (globalToastFn) globalToastFn('Open Options to set up profile first', true);
      return { filledCount: 0 };
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
      if (globalToastFn) globalToastFn('No fillable fields matched', true);
      return { filledCount: 0 };
    }

    const results = await adapter.fillFields(values);
    const successful = results.filter((r) => r.success).length;

    // Apply brand lilac outline for 2s
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

    if (globalToastFn) {
      globalToastFn(`⚡ Autofilled ${successful} fields!`);
    }

    return { filledCount: successful };
  } catch (err) {
    if (globalToastFn) globalToastFn('Could not fill form', true);
    return { filledCount: 0 };
  }
}

function scrapeJobDescriptionFromDOM(): { text: string; title: string; company: string } {
  const company = extractCompanyName();
  const title = document.title.split(/[-|–•]/)[0].trim() || 'Software Engineer';

  // Common job description selectors across Greenhouse, Lever, Workday, LinkedIn, Ashby, etc.
  const selectors = [
    '[data-automation-id="jobPostingDescription"]',
    '#content.job-description',
    '#job-description',
    '.job-description',
    '.description__text',
    '.show-more-less-html__markup',
    '.posting-requirements',
    '.section-page',
    '[data-testid="job-description"]',
    '.ashby-job-posting-description',
    'article',
    'main',
  ];

  for (const sel of selectors) {
    const el = document.querySelector(sel);
    if (el && el.textContent && el.textContent.trim().length > 100) {
      return {
        text: el.textContent.trim().slice(0, 8000),
        title,
        company,
      };
    }
  }

  // Fallback: document body text truncated
  const bodyText = (document.body?.innerText || '').slice(0, 5000);
  return {
    text: bodyText,
    title,
    company,
  };
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
    case 'PREFERRED_NAME':
      return profile.personal?.firstName || '';
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
      return profile.address?.country || 'India';
    case 'ZIP_CODE':
      return profile.address?.postalCode || '';
    case 'FULL_LOCATION': {
      const parts = [profile.address?.city, profile.address?.state, profile.address?.country || 'India'].filter(Boolean);
      return parts.join(', ');
    }
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
      return edu?.[0]?.endDate || edu?.[0]?.graduationYear?.toString() || '';
    case 'START_MONTH':
      return edu?.[0]?.startMonth || '08';
    case 'START_YEAR':
      return edu?.[0]?.startYear?.toString() || '2023';
    case 'END_MONTH':
      return edu?.[0]?.endMonth || '06';
    case 'END_YEAR':
      return edu?.[0]?.graduationYear?.toString() || '2027';
    case 'SKILLS':
      return skills?.map((s: any) => s.name).join(', ') || '';
    case 'EXPERIENCE':
      return _exp?.[0] ? `${_exp[0].designation} at ${_exp[0].companyName}` : '';
    case 'WORK_AUTHORIZATION':
      return profile.preferences?.workAuthorizationStatus || 'Authorized to work';
    case 'VISA_SPONSORSHIP':
      return profile.preferences?.requiresVisaSponsorship ? 'Yes' : 'No';
    case 'RELOCATION':
      return profile.preferences?.willingToRelocate ? 'Yes' : 'Yes';
    case 'BACKLOGS':
      return 'No';
    case 'INTERNSHIP_DURATION':
      return 'Yes';
    case 'IN_OFFICE':
      return 'Yes';
    case 'US_CITIZEN':
      return 'No';
    case 'CITIZENSHIP':
      return profile.address?.country || 'India';
    case 'FOREIGN_RESIDENCY':
      return 'None';
    case 'FOREIGN_RESIDENCY_NON_CITIZEN':
      return 'None';
    case 'FUTURE_OPPORTUNITIES':
      return 'Yes';
    case 'CONSENT_DATA_PROTECTION':
    case 'CONSENT_TERMS':
    case 'CONSENT_DEMOGRAPHIC':
      return 'Yes';
    case 'NOTICE_PERIOD':
      return profile.preferences?.noticePeriodDays || 'Immediate';
    case 'CURRENT_CTC':
      return profile.preferences?.currentCompensation || '';
    case 'EXPECTED_CTC':
      return profile.preferences?.expectedCompensation || '';
    case 'GENDER':
      return profile.personal?.gender || '';
    case 'RACE_ETHNICITY':
      return profile.personal?.race || '';
    case 'VETERAN_STATUS':
      return profile.preferences?.veteranStatus || 'I am not a protected veteran';
    case 'DISABILITY_STATUS':
      return profile.preferences?.disabilityStatus || 'No, I do not have a disability';
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

function extractCompanyName(): string {
  const host = window.location.hostname.toLowerCase();
  const pathParts = window.location.pathname.split('/').filter(Boolean);

  if (host.includes('greenhouse.io') || host.includes('lever.co')) {
    if (pathParts.length > 0 && pathParts[0] !== 'jobs' && pathParts[0] !== 'apply') {
      return pathParts[0].charAt(0).toUpperCase() + pathParts[0].slice(1);
    }
  }

  if (host.includes('myworkdayjobs.com')) {
    const sub = host.split('.')[0];
    return sub.charAt(0).toUpperCase() + sub.slice(1);
  }

  // Generic: strip common prefixes
  const cleanHost = host.replace(/^(www|careers|jobs|app)\./, '');
  const mainDomain = cleanHost.split('.')[0];
  if (mainDomain && mainDomain !== 'docs' && mainDomain !== 'forms') {
    return mainDomain.charAt(0).toUpperCase() + mainDomain.slice(1);
  }

  // Fallback: title splitting
  const titleParts = document.title.split(/[-|–•]/);
  if (titleParts.length > 1) {
    const candidate = titleParts[titleParts.length - 1].trim();
    if (candidate.length < 30) return candidate;
  }

  return 'Company';
}

function recordApplicationOnSubmit() {
  try {
    const jobTitle = document.title.split(/[-|–•]/)[0].trim() || 'Software Engineer';
    const companyName = extractCompanyName();
    const adapter = adapterRegistry.getActiveAdapter();
    const platform = adapter.name
      .replace(/ (Job Board|Application Form|Application Portal|Career Portal|Easy Apply|Web Form)/gi, '')
      .trim();

    chrome.runtime.sendMessage({
      type: 'RECORD_APPLICATION',
      data: {
        companyName,
        jobTitle,
        jobUrl: window.location.href,
        platform: platform || 'Company Portal',
      },
    });
  } catch {
    // Ignore error
  }
}

// ----------------------------------------------------------------------------
// Workday & Multi-Step Wizard Automator
// ----------------------------------------------------------------------------
let lastWizardUrl = typeof window !== 'undefined' ? window.location.href : '';
let lastWizardStepTitle = '';
let wizardDebounceTimer: any = null;

function checkWizardStepChange() {
  clearTimeout(wizardDebounceTimer);
  wizardDebounceTimer = setTimeout(async () => {
    if (typeof window === 'undefined') return;
    const currentUrl = window.location.href;
    const isWorkday = currentUrl.includes('myworkdayjobs.com') || currentUrl.includes('workday.com');
    if (!isWorkday) return;

    const adapter = adapterRegistry.getActiveAdapter();
    const currentStepTitle = (adapter as any).getCurrentStepTitle ? (adapter as any).getCurrentStepTitle() : '';

    if (currentUrl !== lastWizardUrl || (currentStepTitle && currentStepTitle !== lastWizardStepTitle)) {
      lastWizardUrl = currentUrl;
      lastWizardStepTitle = currentStepTitle;

      try {
        const scanResult = await handleScanForm();
        if (scanResult.success && scanResult.data) {
          chrome.runtime.sendMessage({
            type: 'WORKDAY_STEP_CHANGED',
            data: {
              ...scanResult.data,
              stepTitle: currentStepTitle,
            },
          }).catch(() => {});

          if (globalToastFn && currentStepTitle && currentStepTitle !== 'Application Form') {
            globalToastFn(`Workday Step: ${currentStepTitle} (${scanResult.data.fields.length} fields detected)`);
          }
        }
      } catch (err) {
        console.warn('[HapplyMate] Workday wizard step scan error:', err);
      }
    }
  }, 400);
}

function initWorkdayWizardWatcher() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  const origPushState = history.pushState;
  if (origPushState) {
    history.pushState = function (...args) {
      origPushState.apply(this, args);
      checkWizardStepChange();
    };
  }

  const origReplaceState = history.replaceState;
  if (origReplaceState) {
    history.replaceState = function (...args) {
      origReplaceState.apply(this, args);
      checkWizardStepChange();
    };
  }

  window.addEventListener('popstate', checkWizardStepChange);
  window.addEventListener('hashchange', checkWizardStepChange);

  if (typeof MutationObserver !== 'undefined' && document.body) {
    const observer = new MutationObserver(() => {
      checkWizardStepChange();
    });
    observer.observe(document.body, { childList: true, subtree: true });
  }
}

if (typeof document !== 'undefined') {
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
      initFloatingWidget();
      initSubmitDetection();
      initWorkdayWizardWatcher();
    });
  } else {
    initFloatingWidget();
    initSubmitDetection();
    initWorkdayWizardWatcher();
  }
}
