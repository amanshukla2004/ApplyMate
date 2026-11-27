import React, { useEffect, useState } from 'react';
import {
  PanelRight,
  LayoutDashboard,
  Zap,
  Sparkles,
  BookmarkPlus,
  Check,
  Moon,
  Sun,
} from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { profileService } from '../services/profileService';
import { resumeService } from '../services/resumeService';
import { applicationService } from '../services/applicationService';
import { projectService } from '../services/projectService';
import { UserProfile, EducationRecord, ExperienceRecord, SkillItem } from '../types/profile';

export const Popup: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [readiness, setReadiness] = useState<number>(0);
  const [activeTabTitle, setActiveTabTitle] = useState<string>('Job Application');
  const [activeTabUrl, setActiveTabUrl] = useState<string>('');
  const [detectedCount, setDetectedCount] = useState<number>(0);
  const [isWebPage, setIsWebPage] = useState<boolean>(false);
  const [platform, setPlatform] = useState<string>('');
  const [autofillSuccess, setAutofillSuccess] = useState<boolean>(false);
  const [autofillError, setAutofillError] = useState<string | null>(null);
  const [isSavingActiveJob, setIsSavingActiveJob] = useState<boolean>(false);
  const [saveActiveSuccess, setSaveActiveSuccess] = useState<boolean>(false);
  const [profilePayload, setProfilePayload] = useState<{
    profile: UserProfile | null;
    edu: EducationRecord[];
    exp: ExperienceRecord[];
    skills: SkillItem[];
  } | null>(null);

  // Quick Save Job state
  const [jobInput, setJobInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const [profile, education, experience, skills, resumes, projects] = await Promise.all([
          profileService.getProfile(),
          profileService.getEducation(),
          profileService.getExperience(),
          profileService.getSkills(),
          resumeService.getResumes(),
          projectService.getProjects(),
        ]);

        let certCount = 0;
        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
          try {
            const stored = await chrome.storage.local.get(['applymate_certificates']);
            if (Array.isArray(stored?.applymate_certificates)) {
              certCount = stored.applymate_certificates.length;
            }
          } catch {
            // ignore
          }
        } else {
          try {
            const stored = JSON.parse(localStorage.getItem('applymate_certificates') || '[]');
            if (Array.isArray(stored)) certCount = stored.length;
          } catch {
            // ignore
          }
        }

        if (!isMounted) return;

        const score = profileService.calculateCompleteness(
          profile,
          education,
          experience,
          skills,
          resumes.length,
          projects.length,
          certCount
        );
        setReadiness(score);
        setProfilePayload({ profile, edu: education, exp: experience, skills });

        if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!isMounted) return;
            if (chrome.runtime?.lastError || !tabs || tabs.length === 0) {
              return;
            }

            const current = tabs[0];
            const url = current?.url || '';
            setActiveTabUrl(url);

            const isNormalWeb = url.startsWith('http://') || url.startsWith('https://');
            setIsWebPage(isNormalWeb);

            if (current?.title) {
              const cleanTitle = current.title
                .replace(/\s*[-–|]\s*(Careers|Jobs|Application|Workday|Lever|Greenhouse|Ashby).*$/i, '')
                .trim();
              setActiveTabTitle(cleanTitle || current.title);
            }

            // Platform detection
            if (url.includes('myworkdayjobs.com') || url.includes('workday.com')) {
              setPlatform('Workday');
            } else if (url.includes('greenhouse.io') || url.includes('boards.greenhouse.io')) {
              setPlatform('Greenhouse');
            } else if (url.includes('lever.co') || url.includes('jobs.lever.co')) {
              setPlatform('Lever');
            } else if (url.includes('ashbyhq.com') || url.includes('jobs.ashbyhq.com')) {
              setPlatform('Ashby');
            } else if (url.includes('docs.google.com/forms')) {
              setPlatform('Google Forms');
            } else if (url.includes('zohorecruit.com') || url.includes('zohorecruit.in')) {
              setPlatform('Zoho');
            } else if (url.includes('linkedin.com/jobs')) {
              setPlatform('LinkedIn');
            } else if (url.includes('indeed.com')) {
              setPlatform('Indeed');
            } else if (isNormalWeb) {
              try {
                const parsed = new URL(url);
                setPlatform(parsed.hostname.replace('www.', ''));
              } catch {
                setPlatform('');
              }
            } else {
              setPlatform('');
            }

            // Query active tab content script for form fields
            if (current.id && isNormalWeb) {
              chrome.tabs.sendMessage(current.id, { type: 'SCAN_FORM' }, (response) => {
                if (chrome.runtime?.lastError) {
                  return;
                }
                if (response?.fields && Array.isArray(response.fields)) {
                  setDetectedCount(response.fields.length);
                }
              });
            }
          });
        }
      } catch (err) {
        console.warn('Popup loadData error:', err);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const openOptions = (subTab?: string) => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      if (subTab) {
        chrome.storage?.local?.set({ applymate_initial_tab: subTab }, () => {
          chrome.runtime.openOptionsPage();
        });
      } else {
        chrome.runtime.openOptionsPage();
      }
    }
  };

  const openSidePanel = () => {
    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (tab?.id && (chrome as any).sidePanel?.open) {
          (chrome as any).sidePanel.open({ tabId: tab.id });
          window.close();
        } else {
          openOptions();
        }
      });
    } else {
      openOptions();
    }
  };

  const triggerDirectAutofill = () => {
    if (!isWebPage) return;
    setAutofillError(null);

    if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs[0];
        if (!tab?.id) {
          setAutofillError('No active browser tab found.');
          return;
        }

        chrome.tabs.sendMessage(
          tab.id,
          {
            type: 'FILL_FIELDS',
            payload: {
              fieldValues: {},
              profilePayload,
            },
          },
          (response) => {
            if (chrome.runtime?.lastError) {
              setAutofillError('Form script not loaded. Refresh this webpage and retry.');
              return;
            }
            if (response && response.success) {
              setAutofillSuccess(true);
              setTimeout(() => setAutofillSuccess(false), 2500);
            } else {
              setAutofillError(response?.error || 'No compatible fields found on this page.');
              setTimeout(() => setAutofillError(null), 3000);
            }
          }
        );
      });
    }
  };

  const handleQuickSaveJob = async () => {
    if (!jobInput.trim() || isSaving) return;
    setIsSaving(true);
    setSaveSuccess(false);

    try {
      const text = jobInput.trim();
      let company = 'Target Company';
      let title = 'Job Opening';
      let portal = 'General';

      if (text.startsWith('http')) {
        try {
          const parsed = new URL(text);
          portal = parsed.hostname.replace('www.', '');
          const pathSegments = parsed.pathname.split('/').filter(Boolean);
          if (pathSegments.length > 0) {
            title = decodeURIComponent(pathSegments[pathSegments.length - 1].replace(/[-_]/g, ' '));
          }
        } catch {
          // ignore
        }
      } else {
        const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines[0]) title = lines[0].slice(0, 60);
        if (lines[1]) company = lines[1].slice(0, 40);
      }

      await applicationService.saveApplication({
        id: `app-${Date.now()}`,
        companyName: company,
        jobTitle: title,
        applicationDate: new Date().toISOString(),
        jobUrl: text.startsWith('http') ? text : activeTabUrl || '',
        platform: portal,
        status: 'Saved',
        notes: text.startsWith('http') ? '' : text.slice(0, 300),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });

      setIsSaving(false);
      setSaveSuccess(true);
      setJobInput('');
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.warn('Quick save error:', err);
      setIsSaving(false);
    }
  };

  const handleSaveActiveJob = async () => {
    if (!isWebPage || isSavingActiveJob) return;
    setIsSavingActiveJob(true);
    setSaveActiveSuccess(false);

    try {
      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab?.id) {
          setIsSavingActiveJob(false);
          return;
        }

        let company = 'Company';
        let role = activeTabTitle;
        let portal = platform || 'Web';

        try {
          const resp = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_JOB_DESCRIPTION' });
          if (resp?.success && resp.data) {
            if (resp.data.company) company = resp.data.company;
            if (resp.data.title) role = resp.data.title;
          }
        } catch {
          // fallback to page metadata
        }

        if (company === 'Company') {
          if (platform && platform !== 'Web') {
            company = platform;
          } else {
            try {
              const host = new URL(activeTabUrl).hostname.replace('www.', '');
              company = host.split('.')[0];
              company = company.charAt(0).toUpperCase() + company.slice(1);
            } catch {
              company = 'Company';
            }
          }
        }

        await applicationService.saveApplication({
          id: `app-${Date.now()}`,
          companyName: company,
          jobTitle: role,
          applicationDate: new Date().toISOString(),
          jobUrl: activeTabUrl,
          platform: portal,
          status: 'Saved',
          notes: `Saved from active browser tab: ${activeTabTitle}`,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });

        setIsSavingActiveJob(false);
        setSaveActiveSuccess(true);
        setTimeout(() => setSaveActiveSuccess(false), 3000);
      }
    } catch (err) {
      console.warn('Failed to save active job:', err);
      setIsSavingActiveJob(false);
    }
  };

  return (
    <div
      style={{
        width: '400px',
        minHeight: '480px',
        height: '480px',
        boxSizing: 'border-box',
        padding: '14px',
        background: 'var(--theme-bg, #FCF0DA)',
        color: 'var(--text, #202124)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Top Header: happlied (Left) | Theme Toggle + Profile Pill + Dashboard Button (Right) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: Cursive happlied Brand matching Dashboard (No logo) */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              fontFamily: "'Dancing Script', 'Caveat', 'Segoe Script', 'Brush Script MT', cursive, sans-serif",
              fontSize: '28px',
              fontWeight: 700,
              color: 'var(--text)',
              letterSpacing: '0.5px',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            happlied
          </span>
        </div>

        {/* Right: Theme Toggle + Profile Readiness Pill + Dashboard Button */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Theme Toggle Button */}
          <button
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label="Toggle theme"
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              width: '30px',
              height: '30px',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
              transition: 'all 0.15s ease',
            }}
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>

          {/* Profile Readiness Pill: Profile + Percentage */}
          <div
            onClick={() => openOptions('overview')}
            title="Profile completeness: click to open dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              padding: '4px 9px',
              borderRadius: '999px',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            <span
              style={{
                width: '7px',
                height: '7px',
                borderRadius: '50%',
                background: readiness === 100 ? '#10B981' : '#F59E0B',
                boxShadow: readiness === 100 ? '0 0 6px #10B981' : '0 0 6px #F59E0B',
              }}
            />
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: 'var(--text)',
              }}
            >
              Profile {readiness}%
            </span>
          </div>

          {/* Dashboard Button (replaces settings) */}
          <button
            onClick={() => openOptions('overview')}
            title="Open happlied Dashboard"
            aria-label="Dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '5px',
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: '8px',
              height: '30px',
              padding: '0 9px',
              cursor: 'pointer',
              color: 'var(--text)',
              fontSize: '12px',
              fontWeight: 600,
              transition: 'all 0.15s ease',
            }}
          >
            <LayoutDashboard size={13} style={{ color: 'var(--theme)' }} />
            <span>Dashboard</span>
          </button>
        </div>
      </div>

      {/* Active Page Card */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: 'var(--text-secondary)',
            }}
          >
            Active page :
          </span>
          {platform && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: 'var(--text)',
                background: 'var(--hover)',
                padding: '2px 8px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
              }}
            >
              {platform}
            </span>
          )}
        </div>

        {/* Tab / Page Title */}
        <div
          title={activeTabTitle}
          style={{
            fontWeight: 700,
            fontSize: '13.5px',
            color: 'var(--text)',
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {activeTabTitle || 'Ready for Job Application'}
        </div>

        {/* Form Detected Status */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            fontSize: '11.5px',
            fontWeight: 600,
            padding: '5px 8px',
            borderRadius: '6px',
            background: detectedCount > 0 ? 'rgba(16, 185, 129, 0.12)' : 'var(--soft)',
            color: detectedCount > 0 ? '#10B981' : 'var(--text-secondary)',
            border: detectedCount > 0 ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid var(--border)',
          }}
        >
          <Sparkles size={13} style={{ color: detectedCount > 0 ? '#10B981' : 'var(--text-secondary)', flexShrink: 0 }} />
          <span>
            {detectedCount > 0
              ? `Form detected • ${detectedCount} fields ready`
              : isWebPage
              ? 'No form fields detected'
              : 'Open any job post or application'}
          </span>
        </div>

        {/* Action: Autofill Form Now (ALT + A) */}
        <button
          onClick={triggerDirectAutofill}
          disabled={!isWebPage}
          style={{
            background: autofillSuccess ? '#10B981' : 'var(--theme)',
            border: 'none',
            borderRadius: '9px',
            height: '36px',
            color: 'var(--btn-t)',
            fontWeight: 700,
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: isWebPage ? 'pointer' : 'not-allowed',
            opacity: isWebPage ? 1 : 0.6,
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 6px rgba(0, 0, 0, 0.1)',
          }}
        >
          {autofillSuccess ? (
            <>
              <Check size={15} />
              <span>Autofill Complete!</span>
            </>
          ) : (
            <>
              <Zap size={14} style={{ color: '#FCD34D' }} />
              <span>Autofill form now (ALT + A)</span>
            </>
          )}
        </button>

        {autofillError && (
          <div
            style={{
              fontSize: '11px',
              color: 'var(--error)',
              background: 'rgba(217, 48, 37, 0.12)',
              padding: '4px 8px',
              borderRadius: '6px',
              textAlign: 'center',
            }}
          >
            {autofillError}
          </div>
        )}

        {/* Action: Save this Job */}
        <button
          onClick={handleSaveActiveJob}
          disabled={!isWebPage || isSavingActiveJob}
          style={{
            background: saveActiveSuccess ? 'rgba(16, 185, 129, 0.12)' : 'var(--soft)',
            border: saveActiveSuccess ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid var(--border)',
            borderRadius: '9px',
            height: '32px',
            color: saveActiveSuccess ? '#10B981' : 'var(--text)',
            fontWeight: 600,
            fontSize: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            cursor: isWebPage && !isSavingActiveJob ? 'pointer' : 'not-allowed',
            transition: 'background 0.15s ease',
          }}
        >
          {saveActiveSuccess ? (
            <>
              <Check size={14} style={{ color: '#10B981' }} />
              <span style={{ fontWeight: 700, color: '#10B981' }}>Saved to List!</span>
            </>
          ) : (
            <>
              <BookmarkPlus size={14} style={{ color: 'var(--text-secondary)' }} />
              <span>{isSavingActiveJob ? 'Extracting & Saving...' : 'Save this Job'}</span>
            </>
          )}
        </button>
      </div>

      {/* Save New Job Card */}
      <div
        style={{
          background: 'var(--surface)',
          border: '1px solid var(--border)',
          borderRadius: '12px',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
          boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: 'var(--text)',
            }}
          >
            Save new job :
          </span>
          <button
            onClick={() => openOptions('saved-jobs')}
            style={{
              background: 'none',
              border: 'none',
              padding: '0',
              color: 'var(--text-secondary)',
              fontSize: '11.5px',
              fontWeight: 600,
              textDecoration: 'underline',
              cursor: 'pointer',
            }}
          >
            view saved list.
          </button>
        </div>

        {/* Text Box */}
        <textarea
          rows={2}
          value={jobInput}
          onChange={(e) => setJobInput(e.target.value)}
          placeholder="Paste job link, email text, or post here..."
          style={{
            width: '100%',
            boxSizing: 'border-box',
            padding: '7px 10px',
            fontSize: '12px',
            fontFamily: 'inherit',
            background: 'var(--soft)',
            border: '1px solid var(--border)',
            borderRadius: '8px',
            color: 'var(--text)',
            resize: 'none',
            outline: 'none',
          }}
          onKeyDown={(e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
              e.preventDefault();
              handleQuickSaveJob();
            }
          }}
        />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: '10.5px', color: 'var(--text-secondary)' }}>
            {saveSuccess ? '✨ Job extracted and saved!' : 'Auto-extracts role, email & forms'}
          </span>
          <button
            onClick={handleQuickSaveJob}
            disabled={!jobInput.trim() || isSaving}
            style={{
              background: 'var(--theme)',
              border: 'none',
              borderRadius: '7px',
              padding: '5px 12px',
              fontSize: '11.5px',
              fontWeight: 700,
              color: 'var(--btn-t)',
              cursor: jobInput.trim() && !isSaving ? 'pointer' : 'not-allowed',
              opacity: jobInput.trim() && !isSaving ? 1 : 0.6,
            }}
          >
            {isSaving ? 'Saving...' : 'Save Job'}
          </button>
        </div>
      </div>

      {/* Bottom Button: Open Side Panel */}
      <button
        onClick={openSidePanel}
        style={{
          background: 'var(--theme)',
          border: 'none',
          borderRadius: '10px',
          height: '38px',
          color: 'var(--btn-t)',
          fontWeight: 700,
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: '0 3px 10px rgba(0, 0, 0, 0.15)',
          transition: 'transform 0.1s ease',
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'scale(0.985)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
      >
        <PanelRight size={15} style={{ color: '#FCD34D' }} />
        <span>Open side panel</span>
      </button>
    </div>
  );
};
