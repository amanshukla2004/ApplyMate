import { adapterRegistry } from '../adapters/adapterRegistry';
import { ExtensionMessage } from '../types/messaging';
import { domScanner } from './domScanner';
import { DANCING_SCRIPT_BASE64 } from './dancingScriptBase64';

console.log('[happlied] Content script loaded on:', window.location.href);

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
    executeAutofillFromProfile((message as any).data).then((res) => {
      sendResponse({ success: res.filledCount > 0, ...res });
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
    el.style.outline = '2px solid #AEAC78';
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

    // Apply 2-second sage visual highlight to filled inputs
    for (const [id] of Object.entries(values)) {
      const el = domScanner.getElement(id);
      if (el) {
        el.style.outline = '2px solid #AEAC78';
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

function initFloatingWidget(): boolean {
  if (typeof document === 'undefined' || !document.body) return false;
  if (
    document.getElementById('happlied-shadow-host') ||
    document.getElementById('happlymate-shadow-host') ||
    document.getElementById('applymate-shadow-host')
  ) {
    return true;
  }

  const host = document.createElement('div');
  host.id = 'happlied-shadow-host';
  host.style.all = 'initial';
  host.style.position = 'fixed';
  host.style.right = '0';
  host.style.top = '40%';
  host.style.zIndex = '2147483647';
  host.style.touchAction = 'none';

  const shadow = host.attachShadow({ mode: 'open' });

  const style = document.createElement('style');
  style.textContent = `
    @font-face {
      font-family: 'Dancing Script';
      font-style: normal;
      font-weight: 700;
      font-display: swap;
      src: url('data:font/woff2;base64,${DANCING_SCRIPT_BASE64}') format('woff2');
    }
    * { box-sizing: border-box; margin: 0; }
    .fab-pill {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 14px 4px 16px;
      width: 28px;
      border-radius: 10px 0 0 10px;
      border: 1px solid rgba(174, 172, 120, 0.45);
      border-right: none;
      background: #4C4541;
      color: #FCF0DA;
      box-shadow: -2px 6px 18px rgba(0, 0, 0, 0.35);
      cursor: grab;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      transition: background 0.15s ease, box-shadow 0.15s ease, transform 0.15s ease;
    }
    .fab-pill:active {
      cursor: grabbing;
    }
    .fab-pill:hover {
      background: #383330;
      box-shadow: -3px 8px 22px rgba(0, 0, 0, 0.45);
      transform: translateX(-3px);
    }
    .fab-text {
      writing-mode: vertical-rl;
      font-family: 'Dancing Script', 'Caveat', 'Segoe Script', 'Brush Script MT', cursive, sans-serif;
      font-size: 19px;
      font-weight: 700;
      letter-spacing: 0.8px;
      line-height: 1;
      color: #FCF0DA;
      text-shadow: 0 1px 2px rgba(0, 0, 0, 0.45);
    }
    .toast {
      position: absolute;
      right: 42px;
      top: 50%;
      transform: translateY(-50%) translateX(10px);
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 13px;
      font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #D5F5E6;
      color: #17684A;
      box-shadow: 0 10px 24px rgba(23, 104, 74, 0.25);
      display: flex;
      gap: 8px;
      align-items: center;
      opacity: 0;
      transition: opacity 0.25s ease, transform 0.25s ease;
      white-space: nowrap;
      pointer-events: none;
    }
    .toast.show {
      opacity: 1;
      transform: translateY(-50%) translateX(0);
      pointer-events: auto;
    }
    .toast.bad {
      background: #FFE3DA;
      color: #9A3E27;
      box-shadow: 0 10px 24px rgba(154, 62, 39, 0.25);
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

  const fab = document.createElement('div');
  fab.className = 'fab-pill';
  fab.title = 'happlied - Click to Autofill (Alt+A) • Drag to move';
  fab.setAttribute('role', 'button');
  fab.setAttribute('tabindex', '0');

  const fabText = document.createElement('span');
  fabText.className = 'fab-text';
  fabText.textContent = 'happlied';

  fab.appendChild(fabText);

  // Restore saved vertical position if available
  try {
    const savedTop = localStorage.getItem('happlied_pill_top');
    if (savedTop) {
      const parsed = parseInt(savedTop, 10);
      if (!isNaN(parsed) && parsed >= 10 && parsed <= window.innerHeight - 80) {
        host.style.top = `${parsed}px`;
      }
    }
  } catch {}

  // Vertical dragging along right screen edge with pointer capture
  let isDragging = false;
  let startY = 0;
  let startTop = 0;
  let hasMoved = false;

  fab.addEventListener('pointerdown', (e: PointerEvent) => {
    if (e.button !== 0) return;
    isDragging = true;
    hasMoved = false;
    startY = e.clientY;
    startTop = host.getBoundingClientRect().top;
    try {
      fab.setPointerCapture(e.pointerId);
    } catch {}
  });

  fab.addEventListener('pointermove', (e: PointerEvent) => {
    if (!isDragging) return;
    const deltaY = e.clientY - startY;
    if (Math.abs(deltaY) > 4) {
      hasMoved = true;
    }
    const newTop = Math.max(10, Math.min(window.innerHeight - 110, startTop + deltaY));
    host.style.top = `${newTop}px`;
  });

  const onPointerFinish = (e: PointerEvent) => {
    if (!isDragging) return;
    isDragging = false;
    try {
      fab.releasePointerCapture(e.pointerId);
    } catch {}

    if (hasMoved) {
      try {
        const finalTop = Math.round(host.getBoundingClientRect().top);
        localStorage.setItem('happlied_pill_top', String(finalTop));
      } catch {}
    }
  };

  fab.addEventListener('pointerup', onPointerFinish);
  fab.addEventListener('pointercancel', onPointerFinish);

  fab.addEventListener('click', async (e) => {
    if (hasMoved) {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    await executeAutofillFromProfile();
  });

  const triggerToast = (msg: string, isError = false, onRetry?: () => void) => {
    clearTimeout(shadowToastTimeout);
    toast.className = `toast ${isError ? 'bad' : ''} show`;
    toast.textContent = '';

    const textSpan = document.createElement('span');
    textSpan.textContent = msg;
    toast.appendChild(textSpan);

    if (isError && onRetry) {
      const retryBtn = document.createElement('button');
      retryBtn.id = 'toast-rt';
      retryBtn.textContent = 'Retry';
      retryBtn.addEventListener('click', onRetry);
      toast.appendChild(retryBtn);
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
  return true;
}

// In-Page Keyboard Shortcut Listener (Alt+A / Option+A)
function initKeyboardShortcut() {
  if (typeof window === 'undefined') return;

  window.addEventListener(
    'keydown',
    (e: KeyboardEvent) => {
      const isAlt = e.altKey || (!e.ctrlKey && e.metaKey);
      const isKeyA = e.key === 'a' || e.key === 'A' || e.code === 'KeyA';

      if (isAlt && isKeyA && !e.ctrlKey) {
        e.preventDefault();
        e.stopPropagation();
        initFloatingWidget();
        executeAutofillFromProfile().catch((err) => {
          console.warn('[happlied] Autofill shortcut error:', err);
        });
      }
    },
    true // Capture phase to fire before page input handlers
  );
}

// Dynamic Watcher to handle single-page apps (Zoho Recruit, Greenhouse, Workday, etc.)
let widgetDebounceTimer: any = null;
function initWidgetWatcher() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;

  initFloatingWidget();

  // Sequential retries for SPAs loading content dynamically
  setTimeout(initFloatingWidget, 400);
  setTimeout(initFloatingWidget, 1200);
  setTimeout(initFloatingWidget, 2500);
  setTimeout(initFloatingWidget, 4500);

  if (typeof MutationObserver !== 'undefined') {
    const observer = new MutationObserver(() => {
      clearTimeout(widgetDebounceTimer);
      widgetDebounceTimer = setTimeout(() => {
        initFloatingWidget();
      }, 300);
    });

    const target = document.body || document.documentElement;
    if (target) {
      observer.observe(target, { childList: true, subtree: true });
    }
  }
}

async function executeAutofillFromProfile(passedProfileData?: {
  profile?: any;
  edu?: any[];
  exp?: any[];
  skills?: any[];
}): Promise<{ filledCount: number; error?: string }> {
  try {
    let profileData = passedProfileData;
    if (!profileData || !profileData.profile) {
      try {
        const profileRes = await chrome.runtime.sendMessage({ type: 'GET_USER_PROFILE' });
        if (profileRes && profileRes.success && profileRes.data?.profile) {
          profileData = profileRes.data;
        } else {
          const errMsg = profileRes?.error || 'Profile not found';
          console.warn('[happlied] GET_USER_PROFILE failed:', errMsg);
          if (globalToastFn) globalToastFn('Open Options to set up profile first', true);
          return { filledCount: 0, error: errMsg };
        }
      } catch (err: any) {
        console.warn('[happlied] GET_USER_PROFILE message error:', err);
        if (globalToastFn) globalToastFn('Open Options to set up profile first', true);
        return { filledCount: 0, error: err?.message };
      }
    }

    if (!profileData || !profileData.profile) {
      return { filledCount: 0, error: 'Profile not available' };
    }

    const { profile, edu = [], exp = [], skills = [] } = profileData;

    // Check if profile has any actual personal data
    const p = profile?.personal;
    const hasAnyData = Boolean(
      p?.firstName ||
      p?.lastName ||
      p?.fullName ||
      p?.email ||
      p?.phone ||
      (edu && edu.length > 0) ||
      (exp && exp.length > 0) ||
      (skills && skills.length > 0)
    );

    if (!hasAnyData) {
      if (globalToastFn) globalToastFn('Open Options to set up profile first', true);
      return { filledCount: 0, error: 'Profile is empty' };
    }

    const adapter = adapterRegistry.getActiveAdapter();
    const fields = await adapter.scanForm();

    const values: Record<string, string> = {};
    for (const f of fields) {
      if (f.fieldType === 'file') continue;
      let val = resolveCanonicalValue(f.canonicalField, profile, edu, exp, skills);

      if (f.canonicalField === 'PHONE') {
        const fullPhone = profile.personal?.phone || '';
        const digits = fullPhone.replace(/\D/g, '');
        const nationalNum = digits.length > 10 && digits.startsWith('91') ? digits.slice(2) : digits;

        if (f.options && f.options.length > 0) {
          const matchedOpt = f.options.find((opt) => {
            const valLower = (opt.value || '').toLowerCase().trim();
            const textLower = (opt.label || '').toLowerCase().trim();
            return (
              valLower === '+91' ||
              valLower === '91' ||
              valLower === 'in' ||
              textLower.includes('+91') ||
              textLower.includes('india') ||
              valLower.includes('mobile') ||
              textLower.includes('mobile') ||
              valLower.includes('cell') ||
              textLower.includes('cell')
            );
          });
          if (matchedOpt) {
            val = matchedOpt.value || matchedOpt.label;
          }
        } else {
          val = nationalNum.length === 10 ? nationalNum : fullPhone;
        }
      }

      if (val) {
        values[f.id] = val;
      }
    }

    const count = Object.keys(values).length;
    if (count === 0) {
      if (globalToastFn) globalToastFn('No fillable fields matched', true);
      return { filledCount: 0, error: 'No fillable fields matched' };
    }

    const results = await adapter.fillFields(values);
    const successful = results.filter((r) => r.success).length;

    // Apply brand sage outline for 2s
    for (const [id] of Object.entries(values)) {
      const el = domScanner.getElement(id);
      if (el) {
        el.style.outline = '2px solid #AEAC78';
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
  } catch (err: any) {
    if (globalToastFn) globalToastFn('Could not fill form', true);
    return { filledCount: 0, error: err?.message };
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
    case 'FACEBOOK_URL':
      return (profile.links as any)?.facebookUrl || (profile.links as any)?.facebook || '';
    case 'TWITTER_URL':
    case 'X_URL':
      return profile.links?.xUrl || (profile.links as any)?.twitterUrl || (profile.links as any)?.twitter || '';
    case 'BEHANCE_URL':
      return profile.links?.behanceUrl || '';
    case 'DRIBBBLE_URL':
      return profile.links?.dribbbleUrl || '';
    case 'LEETCODE_URL':
      return profile.links?.leetcodeUrl || '';
    case 'CODEFORCES_URL':
      return profile.links?.codeforcesUrl || '';
    case 'CODECHEF_URL':
      return profile.links?.codechefUrl || '';
    case 'HACKERRANK_URL':
      return profile.links?.hackerrankUrl || '';
    case 'KAGGLE_URL':
      return profile.links?.kaggleUrl || '';
    case 'MEDIUM_URL':
      return profile.links?.mediumUrl || '';
    case 'GFG_URL':
      return profile.links?.gfgUrl || '';
    case 'RESUME_URL':
      return profile.links?.resumeDriveUrl || (profile.links as any)?.resumeUrl || '';
    case 'COLLEGE': {
      const ug = edu?.find((e: any) => e.level === 'ug') || edu?.find((e: any) => e.institution && e.institution !== 'N/A') || edu?.[0];
      return ug?.institution && ug.institution !== 'N/A' ? ug.institution : '';
    }
    case 'DEGREE': {
      const ug = edu?.find((e: any) => e.level === 'ug') || edu?.find((e: any) => e.degree && e.degree !== 'N/A') || edu?.[0];
      return ug?.degree && ug.degree !== 'N/A' ? ug.degree : '';
    }
    case 'BRANCH': {
      const ug = edu?.find((e: any) => e.level === 'ug') || edu?.find((e: any) => e.branch && e.branch !== 'N/A') || edu?.[0];
      return ug?.fieldOfStudy || (ug?.branch && ug.branch !== 'N/A' ? ug.branch : '');
    }
    case 'CGPA': {
      const ug = edu?.find((e: any) => e.level === 'ug') || edu?.find((e: any) => (e.cgpa && e.cgpa !== 'N/A') || (e.percentage && e.percentage !== 'N/A')) || edu?.[0];
      return ug?.gpa || (ug?.cgpa && ug.cgpa !== 'N/A' ? ug.cgpa : ug?.percentage && ug.percentage !== 'N/A' ? ug.percentage : '');
    }
    case 'GRADUATION_YEAR': {
      const ug = edu?.find((e: any) => e.level === 'ug') || edu?.[0];
      return ug?.endDate || (ug?.graduationYear && ug.graduationYear !== 'N/A' ? ug.graduationYear.toString() : '');
    }
    case 'START_MONTH':
      return edu?.[0]?.startMonth || '08';
    case 'START_YEAR': {
      const ug = edu?.find((e: any) => e.level === 'ug') || edu?.[0];
      return ug?.startYear && ug.startYear !== 'N/A' ? ug.startYear.toString() : '2023';
    }
    case 'END_MONTH':
      return edu?.[0]?.endMonth || '06';
    case 'END_YEAR': {
      const ug = edu?.find((e: any) => e.level === 'ug') || edu?.[0];
      return ug?.graduationYear && ug.graduationYear !== 'N/A' ? ug.graduationYear.toString() : '2027';
    }
    case 'CLASS_10_PERCENTAGE': {
      const rec = edu?.find((e: any) => e.level === '10th' || (e.degree && e.degree.toLowerCase().includes('10th')));
      return rec?.percentage || rec?.cgpa || '';
    }
    case 'CLASS_10_BOARD': {
      const rec = edu?.find((e: any) => e.level === '10th' || (e.degree && e.degree.toLowerCase().includes('10th')));
      return rec?.board || '';
    }
    case 'CLASS_10_YEAR': {
      const rec = edu?.find((e: any) => e.level === '10th' || (e.degree && e.degree.toLowerCase().includes('10th')));
      return rec?.graduationYear || '';
    }
    case 'CLASS_10_SCHOOL': {
      const rec = edu?.find((e: any) => e.level === '10th' || (e.degree && e.degree.toLowerCase().includes('10th')));
      return rec?.institution || '';
    }
    case 'CLASS_12_PERCENTAGE': {
      const rec = edu?.find((e: any) => e.level === '12th' || (e.degree && e.degree.toLowerCase().includes('12th')));
      return rec?.percentage || rec?.cgpa || '';
    }
    case 'CLASS_12_BOARD': {
      const rec = edu?.find((e: any) => e.level === '12th' || (e.degree && e.degree.toLowerCase().includes('12th')));
      return rec?.board || '';
    }
    case 'CLASS_12_YEAR': {
      const rec = edu?.find((e: any) => e.level === '12th' || (e.degree && e.degree.toLowerCase().includes('12th')));
      return rec?.graduationYear || '';
    }
    case 'CLASS_12_SCHOOL': {
      const rec = edu?.find((e: any) => e.level === '12th' || (e.degree && e.degree.toLowerCase().includes('12th')));
      return rec?.institution || '';
    }
    case 'UG_ROLL_NO': {
      const rec = edu?.find((e: any) => e.level === 'ug' || (e.degree && (e.degree.toLowerCase().includes('bachelor') || e.degree.toLowerCase().includes('b.tech'))));
      return rec?.rollNo || '';
    }
    case 'PG_COLLEGE': {
      const rec = edu?.find((e: any) => e.level === 'pg' || (e.degree && (e.degree.toLowerCase().includes('master') || e.degree.toLowerCase().includes('m.tech'))));
      return rec?.institution || '';
    }
    case 'PG_PERCENTAGE': {
      const rec = edu?.find((e: any) => e.level === 'pg' || (e.degree && (e.degree.toLowerCase().includes('master') || e.degree.toLowerCase().includes('m.tech'))));
      return rec?.percentage || rec?.cgpa || '';
    }
    case 'PG_ROLL_NO': {
      const rec = edu?.find((e: any) => e.level === 'pg' || (e.degree && (e.degree.toLowerCase().includes('master') || e.degree.toLowerCase().includes('m.tech'))));
      return rec?.rollNo || '';
    }
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
    case 'UNIVERSITY_NOC':
      return 'Yes';
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
    default: {
      if (canonical && profile.links?.otherLinks) {
        const norm = canonical.toLowerCase();
        const found = profile.links.otherLinks.find(
          (l: any) => l.label && (norm.includes(l.label.toLowerCase()) || l.label.toLowerCase().includes(norm))
        );
        if (found) return found.url;
      }
      return '';
    }
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
        console.warn('[happlied] Workday wizard step scan error:', err);
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
  const startAll = () => {
    initWidgetWatcher();
    initKeyboardShortcut();
    initSubmitDetection();
    initWorkdayWizardWatcher();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startAll);
    window.addEventListener('load', startAll);
  } else {
    startAll();
    window.addEventListener('load', startAll);
  }
}
