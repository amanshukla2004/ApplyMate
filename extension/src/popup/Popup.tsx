import React, { useEffect, useState } from 'react';
import { Backdrop } from '../components/ui/Backdrop';
import { Button } from '../components/ui/Button';
import { Pill } from '../components/ui/Pill';
import { Ring } from '../components/ui/Ring';
import { HapplyMateLogo } from '../components/ui/ApplyMateLogo';
import { profileService } from '../services/profileService';
import { resumeService } from '../services/resumeService';

export const Popup: React.FC = () => {
  const [readiness, setReadiness] = useState<number>(70);
  const [activeTabTitle, setActiveTabTitle] = useState<string>('Frontend Application');
  const [detectedCount, setDetectedCount] = useState<number>(0);
  const [hasResume, setHasResume] = useState<boolean>(true);

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
            if (current?.title) {
              setActiveTabTitle(current.title.split(/[-|–•]/)[0].trim());
            }

            // Only attempt content script messaging on valid http/https webpages
            const url = current?.url || '';
            const isWebPage = url.startsWith('http://') || url.startsWith('https://');

            if (!isWebPage || !current?.id) {
              return;
            }

            // Ping active tab safely, ignoring connection errors on un-injected tabs
            chrome.tabs.sendMessage(current.id, { type: 'PING' }, (pong) => {
              if (chrome.runtime?.lastError || !isMounted) {
                // Ignore runtime.lastError to prevent uncaught popup errors
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

  const openOptions = () => {
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
        chrome.runtime.openOptionsPage();
      } else {
        window.open('options.html', '_blank');
      }
    } catch (err) {
      console.warn('Failed to open options page:', err);
      window.open('options.html', '_blank');
    }
  };

  const nextStep = !hasResume
    ? 'Next: upload a resume'
    : readiness < 80
    ? 'Next: add more skills'
    : 'Ready for autofill';

  return (
    <div style={{ position: 'relative', width: '320px', minHeight: '380px', padding: '18px' }}>
      <Backdrop />

      <div className="popup glass" style={{ width: '100%', padding: '16px', display: 'flex', flexDirection: 'column', gap: '14px' }}>
        <div className="brand">
          <HapplyMateLogo size={28} />
          <b style={{ fontSize: '18px' }}>HapplyMate</b>
        </div>

        <div className="row" style={{ gap: '16px' }}>
          <Ring percentage={readiness} size={84} strokeWidth={9} />
          <div>
            <b>Profile {readiness}% ready</b>
            <p className="hint">{nextStep}</p>
          </div>
        </div>

        <div className="card glass" style={{ padding: '14px', borderRadius: '20px' }}>
          <p className="hint" style={{ margin: '0 0 4px' }}>On this page</p>
          <b style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>
            {activeTabTitle || 'Application Page'}
          </b>
          {detectedCount > 0 ? (
            <Pill variant="m">Form detected · {detectedCount} fields</Pill>
          ) : (
            <Pill variant="i">Click side panel to scan</Pill>
          )}
        </div>

        <Button onClick={openSidePanel}>
          Open side panel
        </Button>
        <Button variant="soft" onClick={openOptions}>
          Manage profile and documents
        </Button>
      </div>
    </div>
  );
};
