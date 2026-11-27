import React, { useState, useEffect } from 'react';
import { Sun, Moon, HelpCircle, Zap, Sparkles, ShieldCheck } from 'lucide-react';
import { Modal } from '../components/ui/Modal';
import { Toast } from '../components/ui/Toast';
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
import { SavedJobsView } from './views/SavedJobsView';
import { SettingsView } from './views/SettingsView';
import { SaveBar } from './views/SaveBar';

import { profileService } from '../services/profileService';
import { resumeService } from '../services/resumeService';
import { projectService } from '../services/projectService';
import { answerService } from '../services/answerService';
import { applicationService } from '../services/applicationService';
import { savedJobRepository } from '../services/savedJob/savedJobRepository';
import { JobExtractorService } from '../services/savedJob/jobExtractorService';
import { storageService } from '../services/storage/storageService';
import { chromeStorageClient } from '../services/storage/chromeStorage';
import { PDFParserService } from '../services/pdf/pdfParserService';
import { ResumeParserService } from '../services/pdf/resumeParserService';

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
import { SavedJobRecord } from '../types/savedJob';

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
  | 'saved-jobs'
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
  const [savedJobList, setSavedJobList] = useState<SavedJobRecord[]>([]);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Phone states
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [phoneNumberOnly, setPhoneNumberOnly] = useState('');
  const [phoneError, setPhoneError] = useState('');

  const { isDarkMode, toggleTheme } = useTheme();
  const [isSupportOpen, setIsSupportOpen] = useState(false);

  const isTabIncomplete = (sec: SectionId): boolean => {
    if (!profile) return false;
    switch (sec) {
      case 'personal':
        return !profile.personal?.firstName || !profile.personal?.email || !profile.personal?.phone;
      case 'address':
        return !profile.address?.city;
      case 'links':
        return !profile.links?.linkedInUrl && !profile.links?.githubUrl;
      case 'prefs':
        return !profile.preferences?.preferredTitles || profile.preferences.preferredTitles.length === 0;
      case 'edu':
        return educationList.length === 0 || !educationList.some(e => e.institution && e.institution !== 'N/A');
      case 'exp':
        return experienceList.length === 0;
      case 'skills':
        return skillsList.length === 0;
      case 'proj':
        return projectList.length === 0;
      case 'certs':
        return certificateList.length === 0;
      case 'vault':
        return resumeList.length === 0;
      default:
        return false;
    }
  };

  const renderNavButton = (
    id: SectionId,
    label: string,
    extraStyle?: React.CSSProperties,
    icon?: React.ReactNode,
    badge?: React.ReactNode
  ) => {
    const incomplete = isTabIncomplete(id);
    return (
      <button
        type="button"
        className="nav"
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          ...extraStyle,
        }}
        aria-current={activeSection === id ? 'page' : undefined}
        onClick={() => setActiveSection(id)}
        title={incomplete ? `${label} (Needs attention)` : label}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '7px' }}>
          {icon && <span style={{ fontSize: '14px', lineHeight: 1 }}>{icon}</span>}
          <span>{label}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {badge}
          {incomplete && (
            <span
              title="Some information is not filled in"
              style={{
                fontSize: '11px',
                lineHeight: 1,
                marginLeft: '4px',
                color: '#B45309',
                background: '#FDF1D6',
                border: '1px solid #F2C46A',
                padding: '1px 4px',
                borderRadius: '4px',
                fontWeight: 700,
              }}
            >
              ⚠️
            </span>
          )}
        </div>
      </button>
    );
  };

  useEffect(() => {
    loadData();
    const hash = window.location.hash.replace('#', '');
    if (hash === 'saved-jobs') {
      setActiveSection('saved-jobs');
    }
  }, []);

  const loadData = async () => {
    try {
      const [p, edu, exp, sk, res, proj, ans, apps, setts, savedJobs] = await Promise.all([
        profileService.getProfile(),
        profileService.getEducation(),
        profileService.getExperience(),
        profileService.getSkills(),
        resumeService.getResumes(),
        projectService.getProjects(),
        answerService.getAnswers(),
        applicationService.getApplications(),
        chromeStorageClient.getSettings(),
        savedJobRepository.getAll(),
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
      setSavedJobList(savedJobs);
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

  const handleDirectResumeUpload = async (file: File) => {
    try {
      showToast('📄 Parsing resume locally (Zero-Cloud)...');
      await resumeService.saveResume(file, file.name);

      const extractedText = await PDFParserService.extractText(file);
      const data = ResumeParserService.parse(extractedText);

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
      if (data.projects && data.projects.length > 0) {
        for (const proj of data.projects) {
          await projectService.saveProject(proj);
        }
      }
      for (const sk of data.skills) {
        await profileService.saveSkill(sk);
      }

      await loadData();
      showToast('✨ Resume imported & profile auto-populated!');
    } catch (err) {
      console.error('Failed to parse resume:', err);
      showToast('Failed to parse resume. Please check the file.');
    }
  };

  // Header info
  const hours = new Date().getHours();
  const greetingTime = hours < 12 ? 'morning' : hours < 18 ? 'afternoon' : 'evening';
  const hasName = Boolean(profile?.personal?.firstName?.trim());
  const firstName = profile?.personal?.firstName?.trim() || '';
  const greetingHeading = hasName ? `Good ${greetingTime}, ${firstName}` : 'Welcome to happlied';
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

  const handleLinksChange = (field: keyof ProfessionalLinks, value: any) => {
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

  // Calculate new unapplied saved jobs count for badge (Request #6)
  const unappliedSavedJobsCount = savedJobList.filter((j) => j.status !== 'applied').length;
  const savedJobBadge = unappliedSavedJobsCount > 0 ? (
    <span
      style={{
        background: '#AEAC78',
        color: '#FFFFFF',
        borderRadius: '10px',
        padding: '1px 7px',
        fontSize: '11px',
        fontWeight: 700,
        lineHeight: '14px',
      }}
      title={`${unappliedSavedJobsCount} new job${unappliedSavedJobsCount > 1 ? 's' : ''} to apply`}
    >
      {unappliedSavedJobsCount}
    </span>
  ) : undefined;

  return (
    <div className="options-shell">
      {/* Top Header - 64px Google Forms Spec */}
      <header className="top-bar-gforms">
        {/* Left: Brand name in cursive continuous writing */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span
            style={{
              fontFamily: "'Dancing Script', 'Caveat', 'Segoe Script', 'Brush Script MT', cursive, sans-serif",
              fontSize: '32px',
              fontWeight: 700,
              color: 'var(--theme)',
              letterSpacing: '0.5px',
              lineHeight: 1,
              userSelect: 'none',
            }}
          >
            happlied
          </span>
        </div>
      </header>

      {/* Main Options Body: Stuck Sidebar + Content */}
      <div className="options-body">
        {/* Stuck Sidebar at left hand side, non-scrollable, all information shown */}
        <nav className="sidebar-docked" aria-label="Sections">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
            {/* Overview - Prominent (Request #8) */}
            {renderNavButton('overview', 'Overview', {
              minHeight: '32px',
              fontSize: '13.5px',
              fontWeight: 700,
              marginBottom: '2px',
            })}

            {/* Track - Brought below Overview (Request #5 & #7 & #9) */}
            <h3 style={{ color: 'var(--cat-track)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cat-track)', display: 'inline-block' }}></span>
              Track
            </h3>
            {renderNavButton('pipeline', 'Application Tracker')}
            {renderNavButton('saved-jobs', 'Saved Jobs', undefined, undefined, savedJobBadge)}

            {/* Profile - Distinct color (Request #9) */}
            <h3 style={{ color: 'var(--cat-profile)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cat-profile)', display: 'inline-block' }}></span>
              Profile
            </h3>
            {renderNavButton('personal', 'Personal details')}
            {renderNavButton('address', 'Address')}
            {renderNavButton('links', 'Links')}
            {renderNavButton('prefs', 'Preferences')}

            {/* Career - Distinct color (Request #9) */}
            <h3 style={{ color: 'var(--cat-career)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cat-career)', display: 'inline-block' }}></span>
              Career
            </h3>
            {renderNavButton('edu', 'Education')}
            {renderNavButton('exp', 'Experience')}
            {renderNavButton('skills', 'Skills')}
            {renderNavButton('proj', 'Projects')}
            {renderNavButton('certs', 'Certificates')}

            {/* Documents - Distinct color (Request #9) */}
            <h3 style={{ color: 'var(--cat-docs)', display: 'flex', alignItems: 'center', gap: '5px' }}>
              <span style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'var(--cat-docs)', display: 'inline-block' }}></span>
              Documents
            </h3>
            {renderNavButton('vault', 'Resume vault')}
            {renderNavButton('answers', 'Answer bank')}
          </div>

          <div style={{ paddingTop: '8px', borderTop: '1px solid var(--border)', marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '6px' }}>
            {renderNavButton('settings', 'Settings and data')}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '2px', padding: '0 4px' }}>
              <button
                type="button"
                onClick={toggleTheme}
                title={`Switch to ${isDarkMode ? 'light' : 'dark'} theme`}
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontWeight: 500,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                {isDarkMode ? <Sun size={14} color="#F2C46A" /> : <Moon size={14} color="#4C4541" />}
                <span>{isDarkMode ? 'Light' : 'Dark'}</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSupportOpen(true)}
                title="Open Support & Help"
                style={{
                  flex: 1,
                  background: 'transparent',
                  border: '1px solid var(--border)',
                  borderRadius: '8px',
                  padding: '6px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '6px',
                  cursor: 'pointer',
                  color: 'var(--text)',
                  fontSize: '12px',
                  fontWeight: 500,
                  transition: 'background 0.15s ease',
                }}
                onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover)')}
                onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
              >
                <HelpCircle size={14} color="var(--theme)" />
                <span>Support</span>
              </button>
            </div>
          </div>
        </nav>

        {/* Content Stage */}
        <main className="content-stage">
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
                        resumeList.length,
                        projectList.length,
                        certificateList.length
                      )
                    : 70
                }
                hasResume={resumeList.length > 0}
                hasSkills={skillsList.length >= 5}
                isAiEnabled={settings?.aiEnabled ?? true}
                educationCount={educationList.filter(e => e.institution && e.institution !== 'N/A').length}
                experienceCount={experienceList.length}
                projectsCount={projectList.length}
                certificatesCount={certificateList.length}
                formattedDate={formattedDate}
                greetingHeading={greetingHeading}
                onNavigate={(sec) => setActiveSection(sec as SectionId)}
                onUploadResume={handleDirectResumeUpload}
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
                onSaveAll={async (records) => {
                  for (const rec of records) {
                    await profileService.saveEducation(rec);
                  }
                  setEducationList(await profileService.getEducation());
                  showToast('All education details saved');
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
                    if (data.projects && data.projects.length > 0) {
                      for (const proj of data.projects) {
                        await projectService.saveProject(proj);
                      }
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
                savedJobs={savedJobList}
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
                onDeleteSavedJob={async (id) => {
                  await savedJobRepository.delete(id);
                  setSavedJobList(await savedJobRepository.getAll());
                  showToast('Saved job removed');
                }}
              />
            )}

            {activeSection === 'saved-jobs' && (
              <SavedJobsView
                savedJobs={savedJobList}
                onUpdateJob={async (id, partial) => {
                  await savedJobRepository.update(id, partial);
                  setSavedJobList(await savedJobRepository.getAll());
                  showToast('Saved job updated');
                }}
                onDeleteJob={async (id) => {
                  await savedJobRepository.delete(id);
                  setSavedJobList(await savedJobRepository.getAll());
                  showToast('Job removed from saved list');
                }}
                onRerunExtraction={async (id) => {
                  showToast('Re-running AI extraction...');
                  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
                    chrome.runtime.sendMessage({ type: 'RERUN_JOB_EXTRACTION', id }, async (res) => {
                      setSavedJobList(await savedJobRepository.getAll());
                      if (res?.success) {
                        showToast('AI extraction completed!');
                      } else {
                        showToast(res?.error || 'Extraction completed with fallback');
                      }
                    });
                  } else {
                    const existing = await savedJobRepository.getById(id);
                    if (existing) {
                      const extracted = await JobExtractorService.extract(existing.rawText);
                      await savedJobRepository.update(id, extracted);
                      setSavedJobList(await savedJobRepository.getAll());
                      showToast('AI extraction completed!');
                    }
                  }
                }}
                onSaveRawJob={async (text) => {
                  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
                    chrome.runtime.sendMessage({ type: 'SAVE_RAW_JOB', data: { text } }, async () => {
                      setSavedJobList(await savedJobRepository.getAll());
                      showToast('Job saved! AI extraction running in background.');
                    });
                  } else {
                    const initial = JobExtractorService.extractHeuristically(text);
                    const newJob: SavedJobRecord = {
                      id: `job_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
                      rawText: text,
                      ...initial,
                      status: 'to-apply',
                      extractionStatus: 'pending',
                      createdAt: new Date().toISOString(),
                      updatedAt: new Date().toISOString(),
                    };
                    await savedJobRepository.save(newJob);
                    setSavedJobList(await savedJobRepository.getAll());
                    showToast('Job saved!');
                  }
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
        </main>
      </div>

      {/* Support Modal (Google Forms Styled) */}
      {isSupportOpen && (
        <Modal
          isOpen={isSupportOpen}
          onClose={() => setIsSupportOpen(false)}
          title="HapplyMate Support & User Guide"
          maxWidth="560px"
          style={{
            background: 'var(--surface)',
            color: 'var(--text)',
            borderRadius: '8px',
            border: '1px solid var(--border)',
            borderTop: '10px solid var(--theme)',
            padding: '24px',
          }}
        >
          <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
            <p style={{ margin: 0, fontSize: '13.5px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              HapplyMate is your AI co-pilot for job applications, resume parsing, and tracking with 100% zero-cloud local privacy.
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ padding: '12px', background: 'var(--hover)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>
                  <Zap size={15} color="var(--theme)" />
                  <span>Instant 1-Click Autofill</span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Press <strong>Alt + A</strong> on any job portal (Workday, Greenhouse, Lever, Ashby, Zoho, Google Forms) to autofill matching fields.
                </p>
              </div>

              <div style={{ padding: '12px', background: 'var(--hover)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>
                  <Sparkles size={15} color="var(--theme)" />
                  <span>Smart Job Capture</span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  Paste any job posting or click "Save this Job" in the popup. Heuristics extract role, company, deadline, and links.
                </p>
              </div>

              <div style={{ padding: '12px', background: 'var(--hover)', borderRadius: '6px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 700, fontSize: '13.5px', color: 'var(--text)' }}>
                  <ShieldCheck size={15} color="#10B981" />
                  <span>100% Zero-Cloud Storage</span>
                </div>
                <p style={{ margin: '4px 0 0', fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                  All resumes, profile info, and application tracking data remain strictly in your local browser's IndexedDB.
                </p>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '10px', borderTop: '1px solid var(--border)' }}>
              <span style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                Need help? Email: <strong>support@happlymate.com</strong>
              </span>
              <button
                type="button"
                onClick={() => setIsSupportOpen(false)}
                style={{
                  background: 'var(--theme)',
                  color: '#FFFFFF',
                  border: 'none',
                  borderRadius: '4px',
                  padding: '7px 20px',
                  fontSize: '13px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      <Toast
        show={Boolean(toastMessage)}
        message={toastMessage || ''}
      />
    </div>
  );
};
