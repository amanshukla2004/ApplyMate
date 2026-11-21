import React, { useState, useEffect } from 'react';
import { Backdrop } from '../components/ui/Backdrop';
import { Button } from '../components/ui/Button';
import { Toast } from '../components/ui/Toast';
import { HapplyMateLogo } from '../components/ui/ApplyMateLogo';
import { useTheme } from '../hooks/useTheme';

import { OverviewView } from './views/OverviewView';
import { PersonalView } from './views/PersonalView';
import { AddressView } from './views/AddressView';
import { LinksView } from './views/LinksView';
import { PreferencesView } from './views/PreferencesView';
import { EducationView } from './views/EducationView';
import { ExperienceView } from './views/ExperienceView';
import { SkillsView } from './views/SkillsView';
import { ProjectsView } from './views/ProjectsView';
import { CertificatesView } from './views/CertificatesView';
import { ResumeVaultView } from './views/ResumeVaultView';
import { AnswerBankView } from './views/AnswerBankView';
import { PipelineView } from './views/PipelineView';
import { SettingsView } from './views/SettingsView';
import { SaveBar } from './views/SaveBar';

import { profileService } from '../services/profileService';
import { resumeService } from '../services/resumeService';
import { projectService } from '../services/projectService';
import { answerService } from '../services/answerService';
import { applicationService } from '../services/applicationService';
import { storageService } from '../services/storage/storageService';
import { chromeStorageClient } from '../services/storage/chromeStorage';

import {
  UserProfile,
  EducationRecord,
  ExperienceRecord,
  SkillItem,
  ResumeRecord,
  ProjectRecord,
  SavedAnswer,
  ApplicationRecord,
  AppSettings,
  PersonalInfo,
  AddressInfo,
  ProfessionalLinks,
  JobPreferences,
  CertificateRecord,
} from '../types/profile';

type SectionId =
  | 'overview'
  | 'personal'
  | 'address'
  | 'links'
  | 'prefs'
  | 'edu'
  | 'exp'
  | 'skills'
  | 'proj'
  | 'certs'
  | 'vault'
  | 'answers'
  | 'pipeline'
  | 'settings';

export const Options: React.FC = () => {
  const [activeSection, setActiveSection] = useState<SectionId>('overview');
  const [isDirty, setIsDirty] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Core Data
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [originalProfile, setOriginalProfile] = useState<UserProfile | null>(null);
  const [educationList, setEducationList] = useState<EducationRecord[]>([]);
  const [experienceList, setExperienceList] = useState<ExperienceRecord[]>([]);
  const [skillsList, setSkillsList] = useState<SkillItem[]>([]);
  const [resumeList, setResumeList] = useState<ResumeRecord[]>([]);
  const [projectList, setProjectList] = useState<ProjectRecord[]>([]);
  const [certificateList, setCertificateList] = useState<CertificateRecord[]>([]);
  const [answerList, setAnswerList] = useState<SavedAnswer[]>([]);
  const [applicationList, setApplicationList] = useState<ApplicationRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Phone states
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [phoneNumberOnly, setPhoneNumberOnly] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const { isDarkMode, toggleTheme, isCalm, toggleCalm } = useTheme();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [p, edu, exp, sk, res, proj, ans, apps, setts] = await Promise.all([
        profileService.getProfile(),
        profileService.getEducation(),
        profileService.getExperience(),
        profileService.getSkills(),
        resumeService.getResumes(),
        projectService.getProjects(),
        answerService.getAnswers(),
        applicationService.getApplications(),
        chromeStorageClient.getSettings(),
      ]);

      setProfile(p);
      setOriginalProfile(JSON.parse(JSON.stringify(p)));
      setEducationList(edu);
      setExperienceList(exp);
      setSkillsList(sk);
      setResumeList(res);
      setProjectList(proj);
      setAnswerList(ans);
      setApplicationList(apps);
      setSettings(setts);

      // Load certificates from local storage
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        chrome.storage.local.get(['applymate_certificates'], (res) => {
          if (res.applymate_certificates) {
            setCertificateList(res.applymate_certificates);
          }
        });
      } else {
        const saved = localStorage.getItem('applymate_certificates');
        if (saved) {
          try {
            setCertificateList(JSON.parse(saved));
          } catch {
            // ignore
          }
        }
      }

      if (p.personal.phone) {
        if (p.personal.phone.startsWith('+')) {
          const match = p.personal.phone.match(/^(\+\d+)\s*(.*)$/);
          if (match) {
            setPhoneCountryCode(match[1]);
            setPhoneNumberOnly(match[2].trim());
          } else {
            setPhoneNumberOnly(p.personal.phone);
          }
        } else {
          setPhoneNumberOnly(p.personal.phone);
        }
      }
    } catch (err) {
      console.error('Failed to load options data:', err);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Header info
  const hours = new Date().getHours();
  const greetingTime = hours < 12 ? 'morning' : hours < 18 ? 'afternoon' : 'evening';
  const firstName = profile?.personal?.firstName || 'Aman';
  const lastName = profile?.personal?.lastName || 'Shukla';
  const initials = `${firstName[0] || 'A'}${lastName[0] || 'S'}`;
  const formattedDate = new Date().toLocaleDateString('en', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
  });

  // Profile form change handlers
  const handlePersonalChange = (field: keyof PersonalInfo, value: string) => {
    if (!profile) return;
    setProfile({ ...profile, personal: { ...profile.personal, [field]: value } });
    setIsDirty(true);
  };

  const handlePhoneCountryChange = (code: string) => {
    setPhoneCountryCode(code);
    if (!profile) return;
    const fullPhone = phoneNumberOnly ? `${code} ${phoneNumberOnly}` : '';
    setProfile({ ...profile, personal: { ...profile.personal, phone: fullPhone } });
    setIsDirty(true);
  };

  const handlePhoneNumberChange = (val: string) => {
    setPhoneNumberOnly(val);
    if (!profile) return;
    if (val && !/^\d{10}$/.test(val.replace(/\s+/g, ''))) {
      setPhoneError('Enter a 10-digit phone number.');
    } else {
      setPhoneError('');
    }
    const fullPhone = val ? `${phoneCountryCode} ${val.trim()}` : '';
    setProfile({ ...profile, personal: { ...profile.personal, phone: fullPhone } });
    setIsDirty(true);
  };

  const handleAddressChange = (field: keyof AddressInfo, value: string) => {
    if (!profile) return;
    setProfile({ ...profile, address: { ...profile.address, [field]: value } });
    setIsDirty(true);
  };

  const handleLinksChange = (field: keyof ProfessionalLinks, value: string) => {
    if (!profile) return;
    setProfile({ ...profile, links: { ...profile.links, [field]: value } });
    setIsDirty(true);
  };

  const handlePrefsChange = <K extends keyof JobPreferences>(field: K, value: JobPreferences[K]) => {
    if (!profile) return;
    setProfile({ ...profile, preferences: { ...profile.preferences, [field]: value } });
    setIsDirty(true);
  };

  const handleSaveAll = async () => {
    if (!profile) return;
    if (phoneError) {
      document.getElementById('ph')?.focus();
      return;
    }

    await profileService.updateProfile({
      personal: profile.personal,
      address: profile.address,
      links: profile.links,
      preferences: profile.preferences,
    });

    const refreshed = await profileService.getProfile();
    setProfile(refreshed);
    setOriginalProfile(JSON.parse(JSON.stringify(refreshed)));
    setIsDirty(false);
    showToast('Changes saved successfully');
  };

  const handleDiscard = () => {
    if (originalProfile) {
      setProfile(JSON.parse(JSON.stringify(originalProfile)));
      if (originalProfile.personal.phone) {
        const match = originalProfile.personal.phone.match(/^(\+\d+)\s*(.*)$/);
        if (match) {
          setPhoneCountryCode(match[1]);
          setPhoneNumberOnly(match[2].trim());
        } else {
          setPhoneNumberOnly(originalProfile.personal.phone);
        }
      }
    }
    setPhoneError('');
    setIsDirty(false);
  };

  return (
    <div style={{ position: 'relative', minHeight: '100vh' }}>
      <Backdrop />

      {/* Top Header */}
      <header className="top">
        <div className="brand">
          <HapplyMateLogo size={32} />
          <span>HapplyMate</span>
        </div>
        <div className="row">
          <Button variant="soft" size="sm" onClick={toggleCalm} aria-pressed={isCalm}>
            Calm mode: {isCalm ? 'on' : 'off'}
          </Button>
          <Button
            variant="soft"
            size="sm"
            onClick={toggleTheme}
            aria-label="Switch between light and dark theme"
          >
            {isDarkMode ? 'Light theme' : 'Dark theme'}
          </Button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="stage">
        <div className="dash">
          {/* Glass Sidebar */}
          <nav className="side glass" aria-label="Sections">
            <button
              type="button"
              className="nav"
              aria-current={activeSection === 'overview' ? 'page' : undefined}
              onClick={() => setActiveSection('overview')}
            >
              Overview
            </button>

            <h3>Profile</h3>
            <button
              type="button"
              className="nav"
              aria-current={activeSection === 'personal' ? 'page' : undefined}
              onClick={() => setActiveSection('personal')}
            >
              Personal details
            </button>
            <button
              type="button"
              className="nav"
              aria-current={activeSection === 'address' ? 'page' : undefined}
              onClick={() => setActiveSection('address')}
            >
              Address
            </button>
            <button
              type="button"
              className="nav"
              aria-current={activeSection === 'links' ? 'page' : undefined}
              onClick={() => setActiveSection('links')}
            >
              Links
            </button>
            <button
              type="button"
              className="nav"
              aria-current={activeSection === 'prefs' ? 'page' : undefined}
              onClick={() => setActiveSection('prefs')}
            >
              Preferences
            </button>

            <h3>Career</h3>
            <button
              type="button"
              className="nav"
              aria-current={activeSection === 'edu' ? 'page' : undefined}
              onClick={() => setActiveSection('edu')}
            >
              Education
            </button>
            <button
              type="button"
              className="nav"
              aria-current={activeSection === 'exp' ? 'page' : undefined}
              onClick={() => setActiveSection('exp')}
            >
              Experience
            </button>
            <button
              type="button"
              className="nav"
              aria-current={activeSection === 'skills' ? 'page' : undefined}
              onClick={() => setActiveSection('skills')}
            >
              Skills
            </button>
            <button
              type="button"
              className="nav"
              aria-current={activeSection === 'proj' ? 'page' : undefined}
              onClick={() => setActiveSection('proj')}
            >
              Projects
            </button>
            <button
              type="button"
              className="nav"
              aria-current={activeSection === 'certs' ? 'page' : undefined}
              onClick={() => setActiveSection('certs')}
            >
              Certificates
            </button>

            <h3>Documents</h3>
            <button
              type="button"
              className="nav"
              aria-current={activeSection === 'vault' ? 'page' : undefined}
              onClick={() => setActiveSection('vault')}
            >
              Resume vault
            </button>
            <button
              type="button"
              className="nav"
              aria-current={activeSection === 'answers' ? 'page' : undefined}
              onClick={() => setActiveSection('answers')}
            >
              Answer bank
            </button>

            <h3>Track</h3>
            <button
              type="button"
              className="nav"
              aria-current={activeSection === 'pipeline' ? 'page' : undefined}
              onClick={() => setActiveSection('pipeline')}
            >
              Pipeline
            </button>

            <button
              type="button"
              className="nav"
              style={{ marginTop: 'auto' }}
              aria-current={activeSection === 'settings' ? 'page' : undefined}
              onClick={() => setActiveSection('settings')}
            >
              Settings and data
            </button>
          </nav>

          {/* Main Views Container */}
          <div className="main">
            <div className="head">
              <div>
                <p>{formattedDate}</p>
                <h1 style={{ fontSize: '32px' }}>
                  Good {greetingTime}, {firstName}
                </h1>
              </div>
              <div className="row">
                <span
                  className="icon"
                  style={{ font: '700 15px var(--f-h)' }}
                  aria-label={`Signed in as ${firstName} ${lastName}`}
                >
                  {initials}
                </span>
              </div>
            </div>

            {activeSection === 'overview' && (
              <OverviewView
                profile={profile}
                applications={applicationList}
                readiness={
                  profile
                    ? profileService.calculateCompleteness(
                        profile,
                        educationList,
                        experienceList,
                        skillsList,
                        resumeList.length
                      )
                    : 70
                }
                hasResume={resumeList.length > 0}
                hasSkills={skillsList.length >= 5}
                onNavigate={(sec) => setActiveSection(sec as SectionId)}
              />
            )}

            {activeSection === 'personal' && profile && (
              <PersonalView
                personal={profile.personal}
                phoneCountryCode={phoneCountryCode}
                phoneNumberOnly={phoneNumberOnly}
                phoneError={phoneError}
                onChange={handlePersonalChange}
                onCountryCodeChange={handlePhoneCountryChange}
                onPhoneNumberChange={handlePhoneNumberChange}
              />
            )}

            {activeSection === 'address' && profile && (
              <AddressView
                address={profile.address}
                onChange={handleAddressChange}
              />
            )}

            {activeSection === 'links' && profile && (
              <LinksView
                links={profile.links}
                onChange={handleLinksChange}
              />
            )}

            {activeSection === 'prefs' && profile && (
              <PreferencesView
                preferences={profile.preferences}
                onChange={handlePrefsChange}
              />
            )}

            {activeSection === 'edu' && (
              <EducationView
                educationList={educationList}
                onSave={async (record) => {
                  await profileService.saveEducation(record);
                  setEducationList(await profileService.getEducation());
                  showToast('Education saved');
                }}
                onDelete={async (id) => {
                  await profileService.deleteEducation(id);
                  setEducationList(await profileService.getEducation());
                  showToast('Education removed');
                }}
              />
            )}

            {activeSection === 'exp' && (
              <ExperienceView
                experienceList={experienceList}
                onSave={async (record) => {
                  await profileService.saveExperience(record);
                  setExperienceList(await profileService.getExperience());
                  showToast('Experience saved');
                }}
                onDelete={async (id) => {
                  await profileService.deleteExperience(id);
                  setExperienceList(await profileService.getExperience());
                  showToast('Experience removed');
                }}
              />
            )}

            {activeSection === 'skills' && (
              <SkillsView
                skillsList={skillsList}
                onAddSkill={async (name, cat) => {
                  await profileService.saveSkill({
                    id: `skill-${Date.now()}`,
                    name,
                    category: cat,
                    proficiency: 'Intermediate',
                  });
                  setSkillsList(await profileService.getSkills());
                  showToast(`Added ${name}`);
                }}
                onRemoveSkill={async (id) => {
                  await profileService.deleteSkill(id);
                  setSkillsList(await profileService.getSkills());
                  showToast('Skill removed');
                }}
              />
            )}

            {activeSection === 'proj' && (
              <ProjectsView
                projectList={projectList}
                onSave={async (record) => {
                  await projectService.saveProject(record);
                  setProjectList(await projectService.getProjects());
                  showToast('Project saved');
                }}
                onDelete={async (id) => {
                  await projectService.deleteProject(id);
                  setProjectList(await projectService.getProjects());
                  showToast('Project removed');
                }}
              />
            )}

            {activeSection === 'certs' && (
              <CertificatesView
                certificates={certificateList}
                onSave={async (record) => {
                  const updated = certificateList.filter((c) => c.id !== record.id).concat(record);
                  setCertificateList(updated);
                  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({ applymate_certificates: updated });
                  } else {
                    localStorage.setItem('applymate_certificates', JSON.stringify(updated));
                  }
                  showToast('Certificate saved');
                }}
                onDelete={async (id) => {
                  const updated = certificateList.filter((c) => c.id !== id);
                  setCertificateList(updated);
                  if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.set({ applymate_certificates: updated });
                  } else {
                    localStorage.setItem('applymate_certificates', JSON.stringify(updated));
                  }
                  showToast('Certificate removed');
                }}
              />
            )}

            {activeSection === 'vault' && (
              <ResumeVaultView
                resumeList={resumeList}
                onUpload={async (file) => {
                  await resumeService.saveResume(file, file.name);
                  setResumeList(await resumeService.getResumes());
                  showToast('Resume uploaded');
                }}
                onDelete={async (id) => {
                  await resumeService.deleteResume(id);
                  setResumeList(await resumeService.getResumes());
                  showToast('Resume removed');
                }}
                onDownload={(res) => {
                  showToast(`Downloading ${res.fileName}`);
                }}
                onSetActive={async (id) => {
                  await resumeService.setDefaultResume(id);
                  setResumeList(await resumeService.getResumes());
                  showToast('Active resume updated');
                }}
                onApplyParsedData={async (data) => {
                  try {
                    if (data.personal || data.address || data.links) {
                      await profileService.updateProfile({
                        personal: data.personal as any,
                        address: data.address as any,
                        links: data.links as any,
                      });
                    }
                    for (const edu of data.education) {
                      await profileService.saveEducation(edu);
                    }
                    for (const exp of data.experience) {
                      await profileService.saveExperience(exp);
                    }
                    for (const sk of data.skills) {
                      await profileService.saveSkill(sk);
                    }
                    await loadData();
                    showToast('✨ Profile auto-populated from resume (100% Client-Side)!');
                  } catch (err) {
                    console.error('Failed to apply parsed resume data:', err);
                    showToast('Failed to apply resume details');
                  }
                }}
              />
            )}

            {activeSection === 'answers' && (
              <AnswerBankView
                answerList={answerList}
                onSave={async (record) => {
                  await answerService.saveAnswer(record);
                  setAnswerList(await answerService.getAnswers());
                  showToast('Answer saved');
                }}
                onDelete={async (id) => {
                  await answerService.deleteAnswer(id);
                  setAnswerList(await answerService.getAnswers());
                  showToast('Answer removed');
                }}
              />
            )}

            {activeSection === 'pipeline' && (
              <PipelineView
                applications={applicationList}
                onUpdateStatus={async (id, newStatus) => {
                  await applicationService.updateStatus(id, newStatus);
                  setApplicationList(await applicationService.getApplications());
                  showToast(`Status updated to ${newStatus}`);
                }}
                onSaveApplication={async (record) => {
                  await applicationService.saveApplication(record);
                  setApplicationList(await applicationService.getApplications());
                  showToast('Application added to tracker');
                }}
                onDeleteApplication={async (id) => {
                  await applicationService.deleteApplication(id);
                  setApplicationList(await applicationService.getApplications());
                  showToast('Application removed');
                }}
              />
            )}

            {activeSection === 'settings' && (
              <SettingsView
                settings={settings}
                onUpdateSettings={async (updated) => {
                  const merged = { ...settings!, ...updated };
                  setSettings(merged);
                  await chromeStorageClient.saveSettings(merged);
                  showToast('Settings updated');
                }}
                onExportBackup={async () => {
                  const data = await storageService.exportAllData();
                  const jsonStr = JSON.stringify(data, null, 2);
                  const blob = new Blob([jsonStr], { type: 'application/json' });
                  const url = URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `happlymate-backup-${new Date().toISOString().split('T')[0]}.json`;
                  a.click();
                  URL.revokeObjectURL(url);
                  showToast('Backup exported');
                }}
                onImportBackup={async (json) => {
                  const parsed = JSON.parse(json);
                  await storageService.importAllData(parsed);
                  await loadData();
                  showToast('Backup restored successfully');
                }}
                onWipeData={async () => {
                  await storageService.wipeAllData();
                  await loadData();
                  showToast('All local data cleared');
                }}
              />
            )}

            {/* Sticky Save Bar */}
            <SaveBar
              show={isDirty}
              onSave={handleSaveAll}
              onDiscard={handleDiscard}
            />
          </div>
        </div>
      </main>

      <Toast
        show={Boolean(toastMessage)}
        message={toastMessage || ''}
      />
    </div>
  );
};
