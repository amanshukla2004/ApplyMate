import React, { useEffect, useState } from 'react';
import {
  PanelRight,
  Settings,
  Zap,
  User,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { Ring } from '../components/ui/Ring';
import { HapplyMateLogo } from '../components/ui/ApplyMateLogo';
import { profileService } from '../services/profileService';
import { resumeService } from '../services/resumeService';
import { applicationService } from '../services/applicationService';

export const Popup: React.FC = () => {
  const [readiness, setReadiness] = useState<number>(0);
  const [activeTabTitle, setActiveTabTitle] = useState<string>('Job Application');
  const [activeTabUrl, setActiveTabUrl] = useState<string>('');
  const [detectedCount, setDetectedCount] = useState<number>(0);
  const [hasResume, setHasResume] = useState<boolean>(false);
  const [isWebPage, setIsWebPage] = useState<boolean>(false);
  const [platform, setPlatform] = useState<string>('');
  const [autofillSuccess, setAutofillSuccess] = useState<boolean>(false);

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
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
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        chrome.tabs.sendMessage(tab.id, { type: 'EXECUTE_AUTOFILL_SHORTCUT' }, () => {
          setAutofillSuccess(true);
          setTimeout(() => {
            window.close();
          }, 1200);
        });
      }
    } catch (err) {
      console.warn('Direct autofill trigger failed:', err);
    }
  };

  const isNewTab = !isWebPage || activeTabUrl.includes('chrome://') || activeTabTitle.toLowerCase().includes('new tab');

  return (
    <div
      style={{
        width: '340px',
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
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.35)',
              transition: 'all 0.15s ease',
            }}
          >
            {autofillSuccess ? (
              <>
                <CheckCircle2 size={15} />
                <span>Autofilled Successfully!</span>
              </>
            ) : (
              <>
                <Zap size={14} />
                <span>Autofill Form Now (Alt+A)</span>
              </>
            )}
          </button>
        )}
      </div>

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
