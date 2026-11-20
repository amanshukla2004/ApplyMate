import React, { useEffect, useState } from 'react';
import {
  Briefcase,
  ExternalLink,
  Settings,
  Sparkles,
  CheckCircle2,
  FileText,
  Layers,
} from 'lucide-react';
import { profileService } from '../services/profileService';
import { resumeService } from '../services/resumeService';

export const Popup: React.FC = () => {
  const [completeness, setCompleteness] = useState<number>(0);
  const [profileName, setProfileName] = useState<string>('Job Seeker');
  const [activeTabTitle, setActiveTabTitle] = useState<string>('');

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

        if (profile.personal.fullName) {
          setProfileName(profile.personal.fullName);
        }

        const score = profileService.calculateCompleteness(
          profile,
          education,
          experience,
          skills,
          resumes.length
        );
        setCompleteness(score);

        // Get current tab title if in Chrome
        if (typeof chrome !== 'undefined' && chrome.tabs) {
          chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs[0]?.title) {
              setActiveTabTitle(tabs[0].title);
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

  return (
    <div className="w-80 bg-white font-sans text-slate-800 shadow-xl border border-slate-100 flex flex-col">
      {/* Header */}
      <div className="bg-indigo-600 px-4 py-3.5 text-white flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <div className="bg-white/20 p-1.5 rounded-lg backdrop-blur-sm">
            <Briefcase className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tight">JobMate</h1>
            <p className="text-[10px] text-indigo-100 font-medium leading-none">Application Assistant</p>
          </div>
        </div>
        <button
          onClick={openOptions}
          title="Open Settings & Profile"
          className="p-1.5 hover:bg-white/20 rounded-lg text-indigo-100 hover:text-white transition-colors"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>

      {/* Profile Overview Card */}
      <div className="p-4 space-y-3.5">
        <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3">
          <div className="flex justify-between items-center mb-1.5">
            <span className="text-xs font-semibold text-slate-700 truncate max-w-[170px]">
              {profileName}
            </span>
            <span className="text-[11px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full border border-indigo-100">
              {completeness}% Complete
            </span>
          </div>

          {/* Progress bar */}
          <div className="w-full bg-slate-200 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500 ease-out"
              style={{ width: `${completeness}%` }}
            />
          </div>

          <p className="text-[10px] text-slate-500 mt-2">
            {completeness === 100
              ? 'Profile fully configured for autofill.'
              : 'Complete your profile to maximize autofill accuracy.'}
          </p>
        </div>

        {/* Active Page Card */}
        {activeTabTitle && (
          <div className="text-[11px] bg-indigo-50/60 border border-indigo-100/80 rounded-lg p-2.5 text-indigo-900 flex items-start gap-2">
            <Sparkles className="w-3.5 h-3.5 text-indigo-600 shrink-0 mt-0.5" />
            <div className="min-w-0">
              <span className="font-semibold block text-[10px] uppercase tracking-wider text-indigo-500">
                Active Page
              </span>
              <p className="truncate text-[11px] text-slate-700 font-medium">{activeTabTitle}</p>
            </div>
          </div>
        )}

        {/* Main Actions */}
        <div className="space-y-2 pt-1">
          <button
            onClick={openSidePanel}
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs py-2.5 px-3 rounded-lg shadow-sm flex items-center justify-center gap-2 transition active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Side Panel Copilot</span>
            <ExternalLink className="w-3 h-3 ml-auto opacity-75" />
          </button>

          <button
            onClick={openOptions}
            className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs py-2 px-3 rounded-lg flex items-center justify-center gap-2 transition"
          >
            <Layers className="w-3.5 h-3.5 text-slate-500" />
            <span>Manage Profile & Documents</span>
          </button>
        </div>

        {/* Quick Highlights */}
        <div className="pt-2 border-t border-slate-100 grid grid-cols-2 gap-2 text-center text-[10px] text-slate-500">
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 mx-auto mb-1" />
            <span className="font-medium text-slate-700 block">Local-First</span>
            Data in your browser
          </div>
          <div className="bg-slate-50 p-2 rounded-lg border border-slate-100">
            <FileText className="w-3.5 h-3.5 text-indigo-500 mx-auto mb-1" />
            <span className="font-medium text-slate-700 block">Review First</span>
            No auto-submits
          </div>
        </div>
      </div>
    </div>
  );
};
