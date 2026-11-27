import React, { useEffect, useState } from 'react';
import {
  PanelRight,
  Settings,
  Zap,
  Sparkles,
  BookmarkPlus,
  Check,
} from 'lucide-react';
import { HapplyMateLogo } from '../components/ui/ApplyMateLogo';
import { profileService } from '../services/profileService';
import { resumeService } from '../services/resumeService';
import { applicationService } from '../services/applicationService';
import { projectService } from '../services/projectService';
import { UserProfile, EducationRecord, ExperienceRecord, SkillItem } from '../types/profile';

export const Popup: React.FC = () => {
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
              const cleanTitle = current.title.split(/[-|–•]/)[0].trim();
              setActiveTabTitle(cleanTitle || 'Current Page');
            }

            const detectedPlatform = applicationService.detectPlatformFromUrl(url);
            setPlatform(detectedPlatform !== 'Company Portal' ? detectedPlatform : '');

            if (!isNormalWeb || !current?.id) {
              return;
            }

            chrome.tabs.sendMessage(current.id, { type: 'PING' }, (pong) => {
              if (chrome.runtime?.lastError || !isMounted) {
                return;
              }

              if (pong) {
                chrome.tabs.sendMessage(current.id!, { type: 'SCAN_FORM' }, (res) => {
                  if (chrome.runtime?.lastError || !isMounted) {
                    return;
                  }
                  if (res?.data?.fields) {
                    setDetectedCount(res.data.fields.length);
                  }
                });
              }
            });
          });
        }
      } catch (err) {
        console.warn('Failed to load popup data', err);
      }
    }

    loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  const openSidePanel = async () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.sidePanel) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          try {
            await chrome.sidePanel.open({ tabId: tab.id });
          } catch (tabErr) {
            if (tab.windowId) {
              await chrome.sidePanel.open({ windowId: tab.windowId });
            } else {
              throw tabErr;
            }
          }
          window.close();
          return;
        }
      }
      window.open('sidepanel.html', '_blank');
    } catch (err) {
      console.warn('Could not open side panel natively:', err);
      try {
        if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
          window.open(chrome.runtime.getURL('sidepanel.html'), '_blank');
        } else {
          window.open('sidepanel.html', '_blank');
        }
      } catch {
        // Silently handle
      }
    }
  };

  const openOptions = (targetHash?: string) => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open(`options.html${targetHash ? `#${targetHash}` : ''}`, '_blank');
      }
    } catch (err) {
      console.warn('Failed to open options page:', err);
      window.open(`options.html${targetHash ? `#${targetHash}` : ''}`, '_blank');
    }
  };

  const triggerDirectAutofill = async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs) return;
    try {
      setAutofillError(null);
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(
          tab.id,
          {
            type: 'EXECUTE_AUTOFILL_SHORTCUT',
            data: profilePayload || undefined,
          },
          (res) => {
            if (chrome.runtime?.lastError) {
              const errMsg = chrome.runtime.lastError.message || 'Page not responding';
              setAutofillError(errMsg);
              setTimeout(() => setAutofillError(null), 3000);
              return;
            }
            if (res?.success && res.filledCount > 0) {
              setAutofillSuccess(true);
              setTimeout(() => {
                window.close();
              }, 1200);
            } else {
              const errMsg = res?.error || 'No matching fields found';
              setAutofillError(errMsg);
              setTimeout(() => setAutofillError(null), 3000);
            }
          }
        );
      }
    } catch (err: any) {
      setAutofillError(err?.message || 'Autofill trigger failed');
      setTimeout(() => setAutofillError(null), 3000);
    }
  };

  const handleQuickSaveJob = async () => {
    if (!jobInput.trim() || isSaving) return;
    setIsSaving(true);
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
        chrome.runtime.sendMessage({ type: 'SAVE_RAW_JOB', data: { text: jobInput.trim() } }, (res) => {
          setIsSaving(false);
          if (res?.success) {
            setSaveSuccess(true);
            setJobInput('');
            setTimeout(() => {
              setSaveSuccess(false);
            }, 2500);
          }
        });
      } else {
        setIsSaving(false);
      }
    } catch (err) {
      console.warn('Failed to save job:', err);
      setIsSaving(false);
    }
  };

  const handleSaveActiveJob = async () => {
    if (typeof chrome === 'undefined' || !chrome.tabs || isSavingActiveJob) return;
    setIsSavingActiveJob(true);
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_JOB_DESCRIPTION' }, (res) => {
          const scraped = res?.data;
          const title = (scraped?.title || activeTabTitle || 'Job Opportunity').trim();
          const company = (scraped?.company || platform || '').trim();
          const body = scraped?.text || '';
          const hasCompanyInTitle = company && title.toLowerCase().includes(company.toLowerCase());
          const titleLine = company && !hasCompanyInTitle ? `${title} at ${company}` : title;
          const payloadText = `${titleLine}\nURL: ${activeTabUrl}\n\n${body}`.trim();

          if (chrome.runtime?.sendMessage) {
            chrome.runtime.sendMessage({ type: 'SAVE_RAW_JOB', data: { text: payloadText } }, (saveRes) => {
              setIsSavingActiveJob(false);
              if (saveRes?.success) {
                setSaveActiveSuccess(true);
                setTimeout(() => setSaveActiveSuccess(false), 2500);
              }
            });
          } else {
            setIsSavingActiveJob(false);
          }
        });
      } else {
        setIsSavingActiveJob(false);
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
        background: '#0B0A12',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        overflow: 'hidden',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Top Header: [logo] HapplyMate  (Left) |  {readiness}%  [Settings] (Right) */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Left: Logo + HapplyMate Brand */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <HapplyMateLogo size={26} />
          <span
            style={{
              fontWeight: 800,
              fontSize: '17px',
              color: '#FFFFFF',
              letterSpacing: '-0.3px',
            }}
          >
            HapplyMate
          </span>
        </div>

        {/* Right: Profile Readiness Pill + Settings (NOT centered) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div
            onClick={() => openOptions()}
            title="Profile readiness - click to open dashboard"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              padding: '4px 10px',
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
                background: readiness === 100 ? '#10B981' : '#F2C46A',
                boxShadow: readiness === 100 ? '0 0 6px #10B981' : '0 0 6px #F2C46A',
              }}
            />
            <span
              style={{
                fontSize: '11.5px',
                fontWeight: 700,
                color: readiness === 100 ? '#A7F3D0' : '#F8FAFC',
              }}
            >
              {readiness}%
            </span>
          </div>

          <button
            onClick={() => openOptions()}
            title="Settings & Preferences"
            aria-label="Settings"
            style={{
              background: 'rgba(255, 255, 255, 0.08)',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              borderRadius: '8px',
              width: '30px',
              height: '30px',
              display: 'grid',
              placeItems: 'center',
              cursor: 'pointer',
              color: '#94A3B8',
              transition: 'all 0.15s ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
              e.currentTarget.style.color = '#FFFFFF';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)';
              e.currentTarget.style.color = '#94A3B8';
            }}
          >
            <Settings size={14} />
          </button>
        </div>
      </div>

      {/* Active Page Card */}
      <div
        style={{
          background: '#151320',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '11px 13px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '10.5px',
              fontWeight: 800,
              textTransform: 'uppercase',
              letterSpacing: '0.06em',
              color: '#94A3B8',
            }}
          >
            Active page :
          </span>
          {platform && (
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#CBD5E1',
                background: 'rgba(255, 255, 255, 0.08)',
                padding: '2px 7px',
                borderRadius: '6px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
              }}
            >
              {platform}
            </span>
          )}
        </div>

        {/* Name */}
        <div
          title={activeTabTitle}
          style={{
            fontWeight: 700,
            fontSize: '13.5px',
            color: '#FFFFFF',
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
            padding: '4px 8px',
            borderRadius: '6px',
            background: detectedCount > 0 ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.04)',
            color: detectedCount > 0 ? '#34D399' : '#94A3B8',
            border: detectedCount > 0 ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(255, 255, 255, 0.06)',
          }}
        >
          <Sparkles size={13} style={{ color: detectedCount > 0 ? '#34D399' : '#94A3B8', flexShrink: 0 }} />
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
            background: autofillSuccess ? '#10B981' : '#4F46E5',
            border: 'none',
            borderRadius: '9px',
            height: '36px',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '12.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: isWebPage ? 'pointer' : 'not-allowed',
            opacity: isWebPage ? 1 : 0.6,
            transition: 'all 0.15s ease',
            boxShadow: '0 2px 8px rgba(79, 70, 229, 0.35)',
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
              color: '#FCA5A5',
              background: 'rgba(239, 68, 68, 0.15)',
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
            background: saveActiveSuccess ? 'rgba(16, 185, 129, 0.15)' : 'rgba(255, 255, 255, 0.05)',
            border: saveActiveSuccess ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '9px',
            height: '32px',
            color: '#E2E8F0',
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
              <Check size={14} style={{ color: '#34D399' }} />
              <span style={{ fontWeight: 700, color: '#34D399' }}>Saved to List!</span>
            </>
          ) : (
            <>
              <BookmarkPlus size={14} style={{ color: '#94A3B8' }} />
              <span>{isSavingActiveJob ? 'Extracting & Saving...' : 'Save this Job'}</span>
            </>
          )}
        </button>
      </div>

      {/* Save New Job Card */}
      <div
        style={{
          background: '#151320',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '12px',
          padding: '11px 13px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '12px',
              fontWeight: 800,
              color: '#FFFFFF',
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
              color: '#94A3B8',
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
            background: '#0E0D17',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            color: '#F8FAFC',
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
          <span style={{ fontSize: '10.5px', color: '#71717A' }}>
            {saveSuccess ? '✨ Job extracted and saved!' : 'Auto-extracts role, email & forms'}
          </span>
          <button
            onClick={handleQuickSaveJob}
            disabled={!jobInput.trim() || isSaving}
            style={{
              background: '#3A3554',
              border: 'none',
              borderRadius: '7px',
              padding: '5px 12px',
              fontSize: '11.5px',
              fontWeight: 700,
              color: '#FFFFFF',
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
          background: '#4C4541',
          border: 'none',
          borderRadius: '10px',
          height: '38px',
          color: '#FFFFFF',
          fontWeight: 700,
          fontSize: '13px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '8px',
          cursor: 'pointer',
          boxShadow: '0 3px 10px rgba(0, 0, 0, 0.25)',
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
