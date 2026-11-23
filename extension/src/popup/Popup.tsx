import React, { useEffect, useState } from 'react';
import {
  PanelRight,
  Settings,
  Zap,
  User,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  BookmarkPlus,
  Mail,
  Copy,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Check,
  ArrowRight,
} from 'lucide-react';
import { Ring } from '../components/ui/Ring';
import { HapplyMateLogo } from '../components/ui/ApplyMateLogo';
import { profileService } from '../services/profileService';
import { resumeService } from '../services/resumeService';
import { applicationService } from '../services/applicationService';
import { SavedJobRecord } from '../types/savedJob';
import { UserProfile, EducationRecord, ExperienceRecord, SkillItem } from '../types/profile';
import { safeOpenExternalUrl, safeCopyToClipboard } from '../utils/security';

export const Popup: React.FC = () => {
  const [readiness, setReadiness] = useState<number>(0);
  const [activeTabTitle, setActiveTabTitle] = useState<string>('Job Application');
  const [activeTabUrl, setActiveTabUrl] = useState<string>('');
  const [detectedCount, setDetectedCount] = useState<number>(0);
  const [hasResume, setHasResume] = useState<boolean>(false);
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
  const [isSaveOpen, setIsSaveOpen] = useState<boolean>(false);
  const [jobInput, setJobInput] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);
  const [recentSavedJobs, setRecentSavedJobs] = useState<SavedJobRecord[]>([]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const refreshRecentJobs = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage({ type: 'GET_RECENT_SAVED_JOBS', limit: 4 }, (res) => {
        if (res?.success && Array.isArray(res.data)) {
          setRecentSavedJobs(res.data);
        }
      });
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        refreshRecentJobs();
        const [profile, education, experience, skills, resumes] = await Promise.all([
          profileService.getProfile(),
          profileService.getEducation(),
          profileService.getExperience(),
          profileService.getSkills(),
          resumeService.getResumes(),
        ]);

        if (!isMounted) return;

        const score = profileService.calculateCompleteness(
          profile,
          education,
          experience,
          skills,
          resumes.length
        );
        setReadiness(score);
        setHasResume(resumes.length > 0);
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
              // Clean up title (remove trailing site suffix)
              const cleanTitle = current.title.split(/[-|–•]/)[0].trim();
              setActiveTabTitle(cleanTitle || 'Current Tab');
            }

            const detectedPlatform = applicationService.detectPlatformFromUrl(url);
            setPlatform(detectedPlatform !== 'Company Portal' ? detectedPlatform : '');

            if (!isNormalWeb || !current?.id) {
              return;
            }

            // Ping active tab safely, ignoring connection errors on un-injected tabs
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
              console.warn('[Popup] Autofill shortcut failed:', errMsg);
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
              console.warn('[Popup] Autofill finished with 0 filled fields:', res);
              setAutofillError(errMsg);
              setTimeout(() => setAutofillError(null), 3000);
            }
          }
        );
      }
    } catch (err: any) {
      console.warn('Direct autofill trigger failed:', err);
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
            refreshRecentJobs();
            setTimeout(() => {
              setSaveSuccess(false);
            }, 2500);
          }
        });
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
          const title = scraped?.title || activeTabTitle || 'Job Opportunity';
          const company = scraped?.company || platform || '';
          const body = scraped?.text || '';
          const payloadText = `${title}${company ? ' at ' + company : ''}\nURL: ${activeTabUrl}\n\n${body}`.trim();

          if (chrome.runtime?.sendMessage) {
            chrome.runtime.sendMessage({ type: 'SAVE_RAW_JOB', data: { text: payloadText } }, (saveRes) => {
              setIsSavingActiveJob(false);
              if (saveRes?.success) {
                setSaveActiveSuccess(true);
                refreshRecentJobs();
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

  const handleCopy = async (text: string, key: string) => {
    const success = await safeCopyToClipboard(text);
    if (success) {
      setCopiedKey(key);
      setTimeout(() => {
        setCopiedKey(null);
      }, 1500);
    }
  };

  const handleToggleApplied = (job: SavedJobRecord) => {
    const nextStatus = job.status === 'applied' ? 'to-apply' : 'applied';
    if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
      chrome.runtime.sendMessage(
        { type: 'UPDATE_SAVED_JOB', id: job.id, partial: { status: nextStatus } },
        (res) => {
          if (res?.success) {
            setRecentSavedJobs((prev) =>
              prev.map((j) => (j.id === job.id ? { ...j, status: nextStatus } : j))
            );
          }
        }
      );
    }
  };

  const isNewTab = !isWebPage || activeTabUrl.includes('chrome://') || activeTabTitle.toLowerCase().includes('new tab');

  return (
    <div
      style={{
        width: '350px',
        maxHeight: '600px',
        overflowY: 'auto',
        boxSizing: 'border-box',
        padding: '16px',
        background: '#0D0B17',
        backgroundImage: 'radial-gradient(circle at 50% 0%, rgba(139, 116, 240, 0.22) 0%, rgba(13, 11, 23, 0.98) 75%)',
        color: '#F8FAFC',
        display: 'flex',
        flexDirection: 'column',
        gap: '12px',
        fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
      }}
    >
      {/* Top Header */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
          <HapplyMateLogo size={28} />
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span style={{ fontWeight: 800, fontSize: '16px', color: '#FFFFFF', letterSpacing: '-0.3px' }}>
                HapplyMate
              </span>
              <span
                style={{
                  fontSize: '10px',
                  fontWeight: 700,
                  padding: '2px 6px',
                  borderRadius: '99px',
                  background: 'rgba(139, 116, 240, 0.18)',
                  color: '#CDBFFF',
                  border: '1px solid rgba(139, 116, 240, 0.25)',
                }}
              >
                Copilot
              </span>
            </div>
          </div>
        </div>

        <button
          onClick={() => openOptions()}
          title="Open Settings & Profile"
          aria-label="Settings"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '8px',
            width: '32px',
            height: '32px',
            display: 'grid',
            placeItems: 'center',
            cursor: 'pointer',
            color: '#94A3B8',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.12)';
            e.currentTarget.style.color = '#FFFFFF';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.color = '#94A3B8';
          }}
        >
          <Settings size={15} />
        </button>
      </div>

      {/* Hero Card: Profile Readiness */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.035)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '12px 14px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          boxShadow: '0 4px 16px rgba(0, 0, 0, 0.25)',
        }}
      >
        <Ring percentage={readiness} size={58} strokeWidth={6.5} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span style={{ fontWeight: 700, fontSize: '14px', color: '#F8FAFC' }}>
              {readiness === 100 ? 'Profile 100% Ready' : `Profile ${readiness}% Ready`}
            </span>
            {readiness === 100 && (
              <CheckCircle2 size={15} style={{ color: '#10B981', flexShrink: 0 }} />
            )}
          </div>
          <p
            style={{
              margin: '3px 0 0',
              fontSize: '12px',
              color: readiness === 100 ? '#A7F3D0' : '#94A3B8',
              lineHeight: 1.3,
            }}
          >
            {!hasResume
              ? 'Upload a resume in Resume Vault'
              : readiness < 100
              ? 'Complete education & skills for best autofill'
              : 'Optimized for instant 1-click autofill'}
          </p>
        </div>
      </div>

      {/* Active Tab Context Card */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.035)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '16px',
          padding: '12px 14px',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span
            style={{
              fontSize: '10px',
              fontWeight: 700,
              color: '#64748B',
              textTransform: 'uppercase',
              letterSpacing: '0.6px',
            }}
          >
            Active Page
          </span>
          {platform ? (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 700,
                color: '#CDBFFF',
                background: 'rgba(139, 116, 240, 0.16)',
                border: '1px solid rgba(139, 116, 240, 0.3)',
                padding: '2px 8px',
                borderRadius: '99px',
              }}
            >
              {platform}
            </span>
          ) : isWebPage ? (
            <span
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: '#94A3B8',
              }}
            >
              Web Form
            </span>
          ) : null}
        </div>

        <div style={{ minWidth: 0 }}>
          <div
            style={{
              fontSize: '13px',
              fontWeight: 600,
              color: '#F1F5F9',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
            }}
            title={activeTabTitle}
          >
            {isNewTab ? 'Ready for Job Application' : activeTabTitle}
          </div>

          <div style={{ marginTop: '5px' }}>
            {detectedCount > 0 ? (
              <div
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '5px',
                  background: 'rgba(16, 185, 129, 0.14)',
                  border: '1px solid rgba(16, 185, 129, 0.3)',
                  color: '#6EE7B7',
                  padding: '3px 8px',
                  borderRadius: '99px',
                  fontSize: '11px',
                  fontWeight: 600,
                }}
              >
                <Sparkles size={12} />
                <span>Form detected · {detectedCount} fields ready</span>
              </div>
            ) : isNewTab ? (
              <p style={{ margin: 0, fontSize: '11.5px', color: '#94A3B8', lineHeight: 1.4 }}>
                Navigate to any job application on Greenhouse, Workday, Ashby, or LinkedIn.
              </p>
            ) : (
              <p style={{ margin: 0, fontSize: '11.5px', color: '#94A3B8', lineHeight: 1.4 }}>
                Open the side panel to scan or generate tailored cover letters.
              </p>
            )}
          </div>
        </div>

        {/* 1-Click Direct Autofill CTA if form is detected */}
        {detectedCount > 0 && (
          <button
            onClick={triggerDirectAutofill}
            style={{
              marginTop: '4px',
              background: autofillSuccess
                ? '#10B981'
                : autofillError
                ? '#EF4444'
                : 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
              border: 'none',
              borderRadius: '10px',
              padding: '9px 12px',
              color: '#FFFFFF',
              fontWeight: 700,
              fontSize: '12.5px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: 'pointer',
              boxShadow: autofillError
                ? '0 4px 12px rgba(239, 68, 68, 0.35)'
                : '0 4px 12px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.15s ease',
            }}
          >
            {autofillSuccess ? (
              <>
                <CheckCircle2 size={15} />
                <span>Autofilled Successfully!</span>
              </>
            ) : autofillError ? (
              <>
                <Zap size={14} />
                <span style={{ fontSize: '11.5px' }}>{autofillError}</span>
              </>
            ) : (
              <>
                <Zap size={14} />
                <span>Autofill Form Now (Alt+A)</span>
              </>
            )}
          </button>
        )}

        {/* 1-Click Save Active Job Posting */}
        {isWebPage && !isNewTab && (
          <button
            onClick={handleSaveActiveJob}
            disabled={isSavingActiveJob}
            style={{
              marginTop: detectedCount > 0 ? '4px' : '6px',
              background: saveActiveSuccess
                ? '#10B981'
                : 'rgba(139, 116, 240, 0.16)',
              border: '1px solid rgba(139, 116, 240, 0.35)',
              borderRadius: '10px',
              padding: '8px 12px',
              color: saveActiveSuccess ? '#FFFFFF' : '#CDBFFF',
              fontWeight: 600,
              fontSize: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              cursor: isSavingActiveJob ? 'not-allowed' : 'pointer',
              transition: 'all 0.15s ease',
            }}
          >
            {saveActiveSuccess ? (
              <>
                <Check size={13} />
                <span>Job Saved to Collection!</span>
              </>
            ) : isSavingActiveJob ? (
              <span>Saving Active Job...</span>
            ) : (
              <>
                <BookmarkPlus size={13} />
                <span>Save This Job Posting</span>
              </>
            )}
          </button>
        )}
      </div>

      {/* Quick Save Job Accordion */}
      <div
        style={{
          background: 'rgba(255, 255, 255, 0.035)',
          border: '1px solid rgba(139, 116, 240, 0.28)',
          borderRadius: '14px',
          overflow: 'hidden',
          boxShadow: '0 4px 14px rgba(0, 0, 0, 0.2)',
          transition: 'all 0.2s ease',
        }}
      >
        <button
          onClick={() => setIsSaveOpen(!isSaveOpen)}
          style={{
            width: '100%',
            background: isSaveOpen ? 'rgba(139, 116, 240, 0.12)' : 'transparent',
            border: 'none',
            padding: '10px 12px',
            color: '#F8FAFC',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            cursor: 'pointer',
            textAlign: 'left',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                background: 'linear-gradient(135deg, #8B74F0 0%, #6366F1 100%)',
                display: 'grid',
                placeItems: 'center',
                color: '#FFFFFF',
                flexShrink: 0,
              }}
            >
              <BookmarkPlus size={15} />
            </div>
            <div>
              <div style={{ fontSize: '13px', fontWeight: 700, color: '#F8FAFC' }}>
                Save a Job
              </div>
              <div style={{ fontSize: '11px', color: '#94A3B8' }}>
                Paste post, email, or form link
              </div>
            </div>
          </div>
          {isSaveOpen ? <ChevronUp size={16} color="#94A3B8" /> : <ChevronDown size={16} color="#94A3B8" />}
        </button>

        {isSaveOpen && (
          <div style={{ padding: '0 12px 12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <textarea
              id="quick-save-textarea"
              value={jobInput}
              onChange={(e) => setJobInput(e.target.value)}
              placeholder="Paste job description, email instructions (e.g. hr@xyz.com with subject 'Application...'), or form link..."
              rows={3}
              style={{
                width: '100%',
                boxSizing: 'border-box',
                background: 'rgba(0, 0, 0, 0.35)',
                border: '1px solid rgba(255, 255, 255, 0.12)',
                borderRadius: '8px',
                padding: '8px 10px',
                color: '#F8FAFC',
                fontSize: '11.5px',
                lineHeight: '1.4',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
              }}
            />

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ fontSize: '10.5px', color: '#CDBFFF', display: 'flex', alignItems: 'center', gap: '4px' }}>
                <Sparkles size={11} />
                <span>Auto-extracted in background</span>
              </span>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button
                  onClick={() => {
                    setJobInput('');
                    setIsSaveOpen(false);
                  }}
                  style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '5px 9px',
                    fontSize: '11px',
                    color: '#94A3B8',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={!jobInput.trim() || isSaving}
                  onClick={handleQuickSaveJob}
                  style={{
                    background: saveSuccess
                      ? '#10B981'
                      : !jobInput.trim() || isSaving
                      ? 'rgba(139, 116, 240, 0.3)'
                      : 'linear-gradient(135deg, #8B74F0 0%, #6366F1 100%)',
                    border: 'none',
                    borderRadius: '8px',
                    padding: '5px 12px',
                    fontSize: '11.5px',
                    fontWeight: 700,
                    color: '#FFFFFF',
                    cursor: !jobInput.trim() || isSaving ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                  }}
                >
                  {saveSuccess ? (
                    <>
                      <Check size={12} />
                      <span>Saved!</span>
                    </>
                  ) : isSaving ? (
                    'Saving...'
                  ) : (
                    'Save'
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Recent Saved Jobs List */}
      {recentSavedJobs.length > 0 && (
        <div
          style={{
            background: 'rgba(255, 255, 255, 0.035)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            borderRadius: '16px',
            padding: '12px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span
              style={{
                fontSize: '10px',
                fontWeight: 700,
                color: '#64748B',
                textTransform: 'uppercase',
                letterSpacing: '0.6px',
              }}
            >
              Recent Saved Jobs
            </span>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                onClick={() => {
                  setIsSaveOpen(true);
                  setTimeout(() => {
                    document.getElementById('quick-save-textarea')?.focus();
                  }, 50);
                }}
                style={{
                  background: 'rgba(139, 116, 240, 0.15)',
                  border: '1px solid rgba(139, 116, 240, 0.3)',
                  borderRadius: '6px',
                  color: '#CDBFFF',
                  fontSize: '10.5px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '3px',
                  cursor: 'pointer',
                  padding: '2px 7px',
                }}
              >
                <BookmarkPlus size={10} />
                <span>+ Save New</span>
              </button>
              <button
                onClick={() => openOptions('saved-jobs')}
                style={{
                  background: 'transparent',
                  border: 'none',
                  color: '#A5B4FC',
                  fontSize: '11px',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '2px',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <span>View all</span>
                <ArrowRight size={11} />
              </button>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {recentSavedJobs.map((job) => {
              const displayTitle = job.jobTitle
                ? `${job.jobTitle}${job.company ? ' · ' + job.company : ''}`
                : job.company
                ? job.company
                : job.summary
                ? job.summary.slice(0, 48) + '...'
                : job.rawText.slice(0, 40) + '...';

              return (
                <div
                  key={job.id}
                  style={{
                    background: 'rgba(255, 255, 255, 0.03)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '10px',
                    padding: '8px 10px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '5px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '5px', minWidth: 0 }}>
                      <span
                        style={{
                          fontSize: '9.5px',
                          fontWeight: 700,
                          padding: '2px 5px',
                          borderRadius: '4px',
                          background:
                            job.type === 'email'
                              ? 'rgba(139, 116, 240, 0.18)'
                              : job.type === 'form'
                              ? 'rgba(16, 185, 129, 0.18)'
                              : 'rgba(255, 255, 255, 0.08)',
                          color:
                            job.type === 'email'
                              ? '#CDBFFF'
                              : job.type === 'form'
                              ? '#6EE7B7'
                              : '#CBD5E1',
                        }}
                      >
                        {job.type === 'email' ? 'Email' : job.type === 'form' ? 'Form' : 'Other'}
                      </span>
                      <span
                        style={{
                          fontSize: '12px',
                          fontWeight: 600,
                          color: '#F1F5F9',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          maxWidth: '180px',
                        }}
                        title={displayTitle}
                      >
                        {displayTitle}
                      </span>
                    </div>

                    <button
                      onClick={() => handleToggleApplied(job)}
                      title={job.status === 'applied' ? 'Mark To-Apply' : 'Mark Applied'}
                      style={{
                        background:
                          job.status === 'applied'
                            ? 'rgba(16, 185, 129, 0.15)'
                            : 'rgba(255, 255, 255, 0.06)',
                        border:
                          job.status === 'applied'
                            ? '1px solid rgba(16, 185, 129, 0.3)'
                            : '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '6px',
                        padding: '2px 6px',
                        fontSize: '10px',
                        fontWeight: 600,
                        color: job.status === 'applied' ? '#6EE7B7' : '#94A3B8',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px',
                      }}
                    >
                      {job.status === 'applied' ? (
                        <>
                          <Check size={10} />
                          <span>Applied</span>
                        </>
                      ) : (
                        <span>To Apply</span>
                      )}
                    </button>
                  </div>

                  {/* 1-Click Action Bar */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '5px', flexWrap: 'wrap' }}>
                    {job.applyEmail && (
                      <button
                        onClick={() => handleCopy(job.applyEmail!, `${job.id}-email`)}
                        title={`Copy ${job.applyEmail}`}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '5px',
                          padding: '2px 6px',
                          fontSize: '10px',
                          color: copiedKey === `${job.id}-email` ? '#6EE7B7' : '#CBD5E1',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        {copiedKey === `${job.id}-email` ? <Check size={10} /> : <Mail size={10} />}
                        <span>{copiedKey === `${job.id}-email` ? 'Copied' : job.applyEmail}</span>
                      </button>
                    )}

                    {job.requiredSubject && (
                      <button
                        onClick={() => handleCopy(job.requiredSubject!, `${job.id}-subj`)}
                        title={`Copy subject: ${job.requiredSubject}`}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '5px',
                          padding: '2px 6px',
                          fontSize: '10px',
                          color: copiedKey === `${job.id}-subj` ? '#6EE7B7' : '#CBD5E1',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        {copiedKey === `${job.id}-subj` ? <Check size={10} /> : <Copy size={10} />}
                        <span>{copiedKey === `${job.id}-subj` ? 'Copied Subj' : 'Subject'}</span>
                      </button>
                    )}

                    {job.formLink && (
                      <button
                        onClick={() => safeOpenExternalUrl(job.formLink)}
                        title={`Open link: ${job.formLink}`}
                        style={{
                          background: 'rgba(255, 255, 255, 0.05)',
                          border: '1px solid rgba(255, 255, 255, 0.1)',
                          borderRadius: '5px',
                          padding: '2px 6px',
                          fontSize: '10px',
                          color: '#A5B4FC',
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '3px',
                        }}
                      >
                        <ExternalLink size={10} />
                        <span>Open Form</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Main Actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button
          onClick={openSidePanel}
          style={{
            background: 'linear-gradient(135deg, #8B74F0 0%, #6366F1 100%)',
            border: 'none',
            borderRadius: '12px',
            height: '42px',
            color: '#FFFFFF',
            fontWeight: 700,
            fontSize: '13.5px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
            transition: 'transform 0.1s ease, box-shadow 0.15s ease',
          }}
          onMouseDown={(e) => {
            e.currentTarget.style.transform = 'scale(0.985)';
          }}
          onMouseUp={(e) => {
            e.currentTarget.style.transform = 'scale(1)';
          }}
        >
          <PanelRight size={16} />
          <span>Open Side Panel Copilot</span>
        </button>

        <button
          onClick={() => openOptions('resume')}
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            height: '38px',
            color: '#E2E8F0',
            fontWeight: 600,
            fontSize: '13px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '7px',
            cursor: 'pointer',
            transition: 'background 0.15s ease',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
          }}
        >
          <User size={14} style={{ color: '#CDBFFF' }} />
          <span>Manage Profile & Documents</span>
        </button>
      </div>

      {/* Footer Utility Bar */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          paddingTop: '6px',
          borderTop: '1px solid rgba(255, 255, 255, 0.06)',
          fontSize: '11px',
          color: '#64748B',
        }}
      >
        <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          <ShieldCheck size={13} style={{ color: '#10B981' }} />
          <span>100% Zero-Cloud Storage</span>
        </span>
        <span
          style={{
            fontFamily: 'monospace',
            background: 'rgba(255, 255, 255, 0.06)',
            padding: '2px 5px',
            borderRadius: '4px',
            fontSize: '10px',
            color: '#94A3B8',
          }}
        >
          Alt + A
        </span>
      </div>
    </div>
  );
};
