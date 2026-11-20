import React, { useEffect, useState } from 'react';
import { Backdrop } from '../components/ui/Backdrop';
import { Button } from '../components/ui/Button';
import { Pill } from '../components/ui/Pill';
import { Ring } from '../components/ui/Ring';
import { profileService } from '../services/profileService';
import { resumeService } from '../services/resumeService';

export const Popup: React.FC = () => {
  const [readiness, setReadiness] = useState<number>(70);
  const [activeTabTitle, setActiveTabTitle] = useState<string>('Frontend Application');
  const [detectedCount, setDetectedCount] = useState<number>(0);
  const [hasResume, setHasResume] = useState<boolean>(true);

  useEffect(() => {
    async function loadData() {
      try {
        const [profile, education, experience, skills, resumes] = await Promise.all([
          profileService.getProfile(),
          profileService.getEducation(),
          profileService.getExperience(),
          profileService.getSkills(),
          resumeService.getResumes(),
        ]);

        const score = profileService.calculateCompleteness(
          profile,
          education,
          experience,
          skills,
          resumes.length
        );
        setReadiness(score);
        setHasResume(resumes.length > 0);

        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            const current = tabs[0];
            if (current?.title) {
              setActiveTabTitle(current.title.split(/[-|–•]/)[0].trim());
            }

            // Ping active tab for detected field count if content script is alive
            if (current?.id) {
              chrome.tabs.sendMessage(current.id, { type: 'PING' }, (pong) => {
                if (pong) {
                  chrome.tabs.sendMessage(current.id!, { type: 'SCAN_FORM' }, (res) => {
                    if (res?.data?.fields) {
                      setDetectedCount(res.data.fields.length);
                    }
                  });
                }
              });
            }
          });
        }
      } catch (err) {
        console.error('Failed to load popup data', err);
      }
    }

    loadData();
  }, []);

  const openSidePanel = async () => {
    if (typeof chrome !== 'undefined' && chrome.sidePanel) {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      if (tab?.id) {
        await chrome.sidePanel.open({ tabId: tab.id });
        window.close();
      }
    } else {
      window.open('sidepanel.html', '_blank');
    }
  };

  const openOptions = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
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
          <span className="logo" aria-hidden="true">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="#ffffff">
              <path d="M13 2 4 14h6l-1 8 9-12h-6z" />
            </svg>
          </span>
          JobMate
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
