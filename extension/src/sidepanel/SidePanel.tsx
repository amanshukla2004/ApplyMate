import React, { useEffect, useState } from 'react';
import {
  Moon,
  Sun,
  LayoutDashboard,
  Check,
  Copy,
  ExternalLink,
  GraduationCap,
  Briefcase,
  FolderGit2,
  Wrench,
  Globe,
  User,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '../components/ui/Button';
import { Pill } from '../components/ui/Pill';
import { OnboardingWizard } from '../components/onboarding/OnboardingWizard';
import { useTheme } from '../hooks/useTheme';
import { DetectedField, WebsiteMetadata } from '../types/messaging';
import { CANONICAL_FIELDS, ApplicationField } from '../types/canonicalFields';
import { profileService } from '../services/profileService';
import { resumeService } from '../services/resumeService';
import { answerService } from '../services/answerService';
import { projectService } from '../services/projectService';
import { aiService, JobAnalysisResult } from '../services/ai/aiService';
import {
  UserProfile,
  ResumeRecord,
  SavedAnswer,
  EducationRecord,
  ExperienceRecord,
  SkillItem,
  ProjectRecord,
} from '../types/profile';

type TabKey = 'autofill' | 'copy' | 'resume' | 'ai' | 'answers';

export const SidePanel: React.FC = () => {
  const { isDarkMode, toggleTheme } = useTheme();
  const [activeTab, setActiveTab] = useState<TabKey>('autofill');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [answers, setAnswers] = useState<SavedAnswer[]>([]);
  const [educationList, setEducationList] = useState<EducationRecord[]>([]);
  const [experienceList, setExperienceList] = useState<ExperienceRecord[]>([]);
  const [skillsList, setSkillsList] = useState<SkillItem[]>([]);
  const [projectList, setProjectList] = useState<ProjectRecord[]>([]);
  const [certCount, setCertCount] = useState<number>(0);
  const [showOnboarding, setShowOnboarding] = useState(false);

  // Form detection state
  const [isScanning, setIsScanning] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [fields, setFields] = useState<DetectedField[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [filledFieldIds, setFilledFieldIds] = useState<Set<string>>(new Set());
  const [websiteInfo, setWebsiteInfo] = useState<WebsiteMetadata | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // AI draft generation states
  const [draftingFieldId, setDraftingFieldId] = useState<string | null>(null);
  const [aiCustomQuestion, setAiCustomQuestion] = useState('');
  const [aiGeneratedText, setAiGeneratedText] = useState('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);

  // Workday step state
  const [workdayStepTitle, setWorkdayStepTitle] = useState<string | null>(null);

  // Cover Letter generation state
  const [aiMode, setAiMode] = useState<'qa' | 'coverLetter' | 'match'>('qa');
  const [clCompany, setClCompany] = useState('');
  const [clJobTitle, setClJobTitle] = useState('');
  const [clTone, setClTone] = useState<'Confident' | 'Technical' | 'Enthusiastic'>('Confident');
  const [clGenerated, setClGenerated] = useState('');
  const [clSource, setClSource] = useState('');
  const [isGeneratingCl, setIsGeneratingCl] = useState(false);

  // ATS Job Match state
  const [jobText, setJobText] = useState('');
  const [isAnalyzingJob, setIsAnalyzingJob] = useState(false);
  const [jobAnalysis, setJobAnalysis] = useState<JobAnalysisResult | null>(null);
  const [addedSkillNotice, setAddedSkillNotice] = useState<string | null>(null);

  const handleAnalyzeActivePage = async () => {
    setIsAnalyzingJob(true);
    setAddedSkillNotice(null);
    try {
      let pageText = jobText;

      if (typeof chrome !== 'undefined' && chrome.tabs && chrome.tabs.query) {
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (tab?.id) {
          try {
            const resp = await chrome.tabs.sendMessage(tab.id, { type: 'SCRAPE_JOB_DESCRIPTION' });
            if (resp?.success && resp.data) {
              if (resp.data.text) {
                pageText = resp.data.text;
                setJobText(pageText);
              }
              if (resp.data.company && !clCompany) {
                setClCompany(resp.data.company);
              }
              if (resp.data.title && !clJobTitle) {
                setClJobTitle(resp.data.title);
              }
            }
          } catch (e) {
            console.warn('Scraping error:', e);
          }
        }
      }

      if (!pageText.trim()) {
        setJobAnalysis(null);
        return;
      }

      const userSkillNames = skillsList.map((s) => s.name);
      const res = await aiService.analyzeJobDescription(pageText, userSkillNames);
      setJobAnalysis(res);
    } catch (err) {
      console.warn('Job analysis failed:', err);
    } finally {
      setIsAnalyzingJob(false);
    }
  };

  const handleAddSkillToProfile = async (skillName: string) => {
    try {
      const newSkill: SkillItem = {
        id: `sk-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        name: skillName.charAt(0).toUpperCase() + skillName.slice(1),
        category: 'frameworks',
        proficiency: 'Intermediate',
      };
      await profileService.saveSkill(newSkill);
      const updated = await profileService.getSkills();
      setSkillsList(updated);
      setAddedSkillNotice(`Added "${newSkill.name}" to your profile!`);
      setTimeout(() => setAddedSkillNotice(null), 3000);

      // Re-run analysis with updated skills list
      if (jobText) {
        const userSkillNames = updated.map((s) => s.name);
        const res = await aiService.analyzeJobDescription(jobText, userSkillNames);
        setJobAnalysis(res);
      }
    } catch (err) {
      console.warn('Failed to add skill:', err);
    }
  };

  // Copy tab state
  type CopyCategory = 'all' | 'personal' | 'academics' | 'experience' | 'projects' | 'skills' | 'links' | 'preferences';
  const [copyCategory, setCopyCategory] = useState<CopyCategory>('all');
  const [copySearchQuery, setCopySearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [savedToBankId, setSavedToBankId] = useState<string | null>(null);

  const handleSaveToBank = async (field: DetectedField) => {
    const val = fieldValues[field.id];
    if (!field.label || !val) return;
    try {
      const category = await aiService.classifyQuestion(field.label);
      await answerService.saveAnswer({
        id: `ans-${Date.now()}`,
        question: field.label,
        answer: val,
        category: (category as any) || 'Other',
        tags: ['Auto-saved'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setSavedToBankId(field.id);
      setTimeout(() => setSavedToBankId(null), 2500);
      setAnswers(await answerService.getAnswers());
    } catch (err) {
      console.warn('Failed to save to answer bank:', err);
    }
  };

  useEffect(() => {
    loadAllData();
  }, []);

  useEffect(() => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
      const listener = (msg: any) => {
        if (msg.type === 'WORKDAY_STEP_CHANGED' && msg.data) {
          processFields(msg.data.fields, msg.data.website);
          if (msg.data.stepTitle) {
            setWorkdayStepTitle(msg.data.stepTitle);
          }
        }
      };
      chrome.runtime.onMessage.addListener(listener);
      return () => {
        chrome.runtime.onMessage.removeListener(listener);
      };
    }
  }, [profile, educationList]);

  const loadAllData = async () => {
    try {
      const [p, r, a, edu, exp, sk, prj] = await Promise.all([
        profileService.getProfile(),
        resumeService.getResumes(),
        answerService.getAnswers(),
        profileService.getEducation(),
        profileService.getExperience(),
        profileService.getSkills(),
        projectService.getProjects(),
      ]);
      setProfile(p);
      setResumes(r);
      setAnswers(a);
      setEducationList(edu);
      setExperienceList(exp);
      setSkillsList(sk);
      setProjectList(prj);

      let certificatesCount = 0;
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        try {
          const stored = await chrome.storage.local.get(['applymate_certificates']);
          if (Array.isArray(stored?.applymate_certificates)) {
            certificatesCount = stored.applymate_certificates.length;
          }
        } catch {
          // ignore
        }
      } else {
        try {
          const stored = JSON.parse(localStorage.getItem('applymate_certificates') || '[]');
          if (Array.isArray(stored)) certificatesCount = stored.length;
        } catch {
          // ignore
        }
      }
      setCertCount(certificatesCount);

      // Prompt 3-step rapid onboarding if profile has no name and no resume yet
      if (!p?.personal?.firstName && r.length === 0) {
        setShowOnboarding(true);
      }

      // Auto-scan on load so detected fields appear immediately
      handleScanForm(p, edu);
    } catch (err) {
      console.warn('Failed to load side panel data:', err);
    }
  };

  const handleScanForm = async (customProfile?: UserProfile, customEdu?: EducationRecord[]) => {
    setIsScanning(true);
    setErrorMessage(null);
    setFilledFieldIds(new Set());

    try {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        // Fallback demo mock
        setTimeout(() => {
          const mockFields: DetectedField[] = [
            { id: 'f1', tagName: 'INPUT', fieldType: 'text', label: 'Name', required: true, canonicalField: 'FULL_NAME', confidence: 1.0, status: 'MATCHED' },
            { id: 'f2', tagName: 'INPUT', fieldType: 'email', label: 'Email', required: true, canonicalField: 'EMAIL', confidence: 1.0, status: 'MATCHED' },
            { id: 'f3', tagName: 'DIV', fieldType: 'radio', label: 'Which role are you applying for?', required: true, confidence: 0.8, status: 'NEEDS_REVIEW', options: [{ label: 'SDE 1+ (Full-time)', value: 'SDE 1+ (Full-time)' }, { label: 'SDE Intern (6 months)', value: 'SDE Intern (6 months)' }] },
            { id: 'f4', tagName: 'TEXTAREA', fieldType: 'textarea', label: 'Why do you want to join us?', required: false, confidence: 0.7, status: 'NEEDS_REVIEW' },
          ];
          processFields(mockFields, {
            url: window.location.href,
            hostname: 'docs.google.com',
            adapterName: 'Google Forms',
            title: 'Job Application',
          }, customProfile, customEdu);
          setIsScanning(false);
        }, 500);
        return;
      }

      chrome.runtime.sendMessage({ type: 'SCAN_FORM' }, (response) => {
        setIsScanning(false);
        if (chrome.runtime.lastError) {
          const err = chrome.runtime.lastError.message || '';
          setErrorMessage(
            err.includes('Receiving end') || err.includes('connection')
              ? 'Could not connect to the webpage tab. Please refresh the page tab (F5) once or use the Copy tab.'
              : err
          );
          return;
        }

        if (!response || !response.success) {
          setErrorMessage(response?.error || 'Failed to detect fields on this webpage.');
          return;
        }

        processFields(response.data.fields, response.data.website, customProfile, customEdu);
      });
    } catch (err) {
      setIsScanning(false);
      setErrorMessage((err as Error).message);
    }
  };

  const processFields = (
    scanned: DetectedField[],
    site?: WebsiteMetadata,
    customProfile?: UserProfile,
    customEdu?: EducationRecord[]
  ) => {
    setFields(scanned);
    if (site) {
      setWebsiteInfo(site);
      if (site.adapterName && site.adapterName.includes('(')) {
        const stepMatch = site.adapterName.match(/\(([^)]+)\)/);
        if (stepMatch) setWorkdayStepTitle(stepMatch[1]);
      }
      if (!clCompany && site.hostname) {
        const cleanHost = site.hostname.replace(/^(www|careers|jobs|app)\./, '').split('.')[0];
        if (cleanHost && cleanHost !== 'docs' && cleanHost !== 'forms') {
          setClCompany(cleanHost.charAt(0).toUpperCase() + cleanHost.slice(1));
        }
      }
      if (!clJobTitle && site.title) {
        setClJobTitle(site.title.split(/[-|–•]/)[0].trim());
      }
    }

    const activeProfile = customProfile || profile;
    const activeEdu = customEdu || educationList;

    const values: Record<string, string> = {};
    const selected = new Set<string>();

    scanned.forEach((f) => {
      let val = '';
      if (f.canonicalField && activeProfile) {
        val = resolveProfileValue(f.canonicalField, activeProfile, activeEdu);
      }

      // Intelligent Degree option mapper
      if (f.canonicalField === 'DEGREE' && f.options && f.options.length > 0 && activeEdu[0]?.degree) {
        const userDeg = activeEdu[0].degree.toLowerCase();
        for (const opt of f.options) {
          const optText = (opt.label || opt.value || '').toLowerCase();
          if (
            (userDeg.includes('bachelor') ||
              userDeg.includes('b.tech') ||
              userDeg.includes('b.e') ||
              userDeg.includes('btech') ||
              userDeg.includes('b.s') ||
              userDeg.includes('bca') ||
              userDeg.includes('undergraduate')) &&
            optText.includes('bachelor')
          ) {
            val = opt.value || opt.label;
            break;
          }
          if (
            (userDeg.includes('master') ||
              userDeg.includes('m.tech') ||
              userDeg.includes('mtech') ||
              userDeg.includes('mba') ||
              userDeg.includes('mca') ||
              userDeg.includes('m.s') ||
              userDeg.includes('postgraduate')) &&
            optText.includes('master')
          ) {
            val = opt.value || opt.label;
            break;
          }
        }
      }

      // Intelligent Month option mapper for education dates
      if ((f.canonicalField === 'END_MONTH' || f.canonicalField === 'START_MONTH') && f.options && f.options.length > 0) {
        const userMonth = f.canonicalField === 'END_MONTH' ? (activeEdu[0]?.endMonth || '06') : (activeEdu[0]?.startMonth || '08');
        const monthNum = parseInt(userMonth, 10) || (f.canonicalField === 'END_MONTH' ? 6 : 8);
        const monthNames = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december'];
        const targetName = monthNames[monthNum - 1];

        for (const opt of f.options) {
          const optVal = (opt.value || '').toLowerCase().trim();
          const optText = (opt.label || '').toLowerCase().trim();
          if (
            optVal === String(monthNum) ||
            optVal === String(monthNum).padStart(2, '0') ||
            optText.includes(targetName) ||
            optVal.includes(targetName.slice(0, 3))
          ) {
            val = opt.value || opt.label;
            break;
          }
        }
      }

      // Intelligent Phone & Country Code mapper
      if (f.canonicalField === 'PHONE') {
        const fullPhone = activeProfile?.personal?.phone || '';
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

      // Choice options value reconciliation (e.g. Yes -> 1/true/Yes)
      if (f.options && f.options.length > 0) {
        if (val) {
          const normVal = val.toLowerCase().trim();
          const matchedOpt = f.options.find(
            (opt) =>
              opt.value.toLowerCase().trim() === normVal ||
              opt.label.toLowerCase().trim() === normVal ||
              (normVal === 'yes' && (opt.value === '1' || opt.value === 'true' || opt.label.toLowerCase() === 'yes')) ||
              (normVal === 'no' && (opt.value === '0' || opt.value === 'false' || opt.label.toLowerCase() === 'no'))
          );
          if (matchedOpt) {
            val = matchedOpt.value || matchedOpt.label;
          }
        } else {
          val = f.options[0].value || f.options[0].label;
        }
      }
      values[f.id] = val;

      if (f.status === 'MATCHED' || (f.options && f.options.length > 0)) {
        selected.add(f.id);
      }
    });

    setFieldValues(values);
    setSelectedIds(selected);
  };

  const resolveProfileValue = (
    canonical: ApplicationField,
    p: UserProfile | null = profile,
    edu: EducationRecord[] = educationList
  ): string => {
    if (!p) return '';
    switch (canonical) {
      case 'FIRST_NAME':
        return p.personal.firstName || '';
      case 'LAST_NAME':
        return p.personal.lastName || '';
      case 'FULL_NAME':
        return p.personal.fullName || `${p.personal.firstName || ''} ${p.personal.lastName || ''}`.trim();
      case 'PREFERRED_NAME':
        return p.personal.firstName || '';
      case 'EMAIL':
        return p.personal.email || '';
      case 'PHONE':
        return p.personal.phone || '';
      case 'ADDRESS':
        return p.address.addressLine1 || '';
      case 'ADDRESS_LINE_2':
        return p.address.addressLine2 || '';
      case 'CITY':
        return p.address.city || '';
      case 'STATE':
        return p.address.state || '';
      case 'ZIP_CODE':
        return p.address.postalCode || '';
      case 'COUNTRY':
        return p.address.country || 'India';
      case 'FULL_LOCATION': {
        const parts = [p.address.city, p.address.state, p.address.country || 'India'].filter(Boolean);
        return parts.join(', ');
      }
      case 'LINKEDIN_URL':
        return p.links.linkedInUrl || '';
      case 'GITHUB_URL':
        return p.links.githubUrl || '';
      case 'PORTFOLIO_URL':
        return p.links.portfolioUrl || '';
      case 'FACEBOOK_URL':
        return (p.links as any)?.facebookUrl || (p.links as any)?.facebook || '';
      case 'TWITTER_URL':
      case 'X_URL':
        return p.links?.xUrl || (p.links as any)?.twitterUrl || (p.links as any)?.twitter || '';
      case 'BEHANCE_URL':
        return p.links?.behanceUrl || '';
      case 'DRIBBBLE_URL':
        return p.links?.dribbbleUrl || '';
      case 'LEETCODE_URL':
        return p.links?.leetcodeUrl || '';
      case 'CODEFORCES_URL':
        return p.links?.codeforcesUrl || '';
      case 'CODECHEF_URL':
        return p.links?.codechefUrl || '';
      case 'HACKERRANK_URL':
        return p.links?.hackerrankUrl || '';
      case 'KAGGLE_URL':
        return p.links?.kaggleUrl || '';
      case 'MEDIUM_URL':
        return p.links?.mediumUrl || '';
      case 'GFG_URL':
        return p.links?.gfgUrl || '';
      case 'RESUME_URL':
        return p.links?.resumeDriveUrl || (p.links as any)?.resumeUrl || '';
      case 'COLLEGE':
        return edu[0]?.institution || '';
      case 'DEGREE':
        return edu[0]?.degree || '';
      case 'BRANCH':
        return edu[0]?.branch || '';
      case 'SKILLS':
        return skillsList.map((s) => s.name).join(', ');
      case 'CGPA':
        return edu[0]?.cgpa || '';
      case 'GRADUATION_YEAR':
        return edu[0]?.graduationYear?.toString() || '';
      case 'START_MONTH':
        return '08';
      case 'START_YEAR':
        return edu[0]?.graduationYear ? (parseInt(edu[0].graduationYear, 10) - 4).toString() : '2023';
      case 'END_MONTH':
        return '06';
      case 'END_YEAR':
        return edu[0]?.graduationYear?.toString() || '2027';
      case 'EXPERIENCE':
        return experienceList[0] ? `${experienceList[0].designation} at ${experienceList[0].companyName}` : '';
      case 'NOTICE_PERIOD':
        return p.preferences.noticePeriodDays || 'Immediate';
      case 'EXPECTED_CTC':
        return p.preferences.expectedCompensation || '';
      case 'CURRENT_CTC':
        return p.preferences.currentCompensation || '';
      case 'WORK_AUTHORIZATION':
        return p.preferences.workAuthorizationStatus || 'Authorized';
      case 'VISA_SPONSORSHIP':
        return p.preferences.requiresVisaSponsorship ? 'Yes' : 'No';
      case 'RELOCATION':
        return p.preferences.willingToRelocate ? 'Yes' : 'Yes';
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
        return p.address.country || 'India';
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
      case 'GENDER':
        return p.personal.gender || '';
      case 'RACE_ETHNICITY':
        return p.personal.race || '';
      case 'VETERAN_STATUS':
        return p.preferences.veteranStatus || 'I am not a protected veteran';
      case 'DISABILITY_STATUS':
        return p.preferences.disabilityStatus || 'No, I do not have a disability';
      default:
        return '';
    }
  };

  const handleHighlight = (fieldId: string, highlight: boolean) => {
    if (typeof chrome !== 'undefined' && chrome.runtime) {
      chrome.runtime.sendMessage({
        type: 'HIGHLIGHT_FIELD',
        fieldId,
        highlight,
      });
    }
  };

  const toggleSelect = (id: string) => {
    const next = new Set(selectedIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setSelectedIds(next);
  };

  const handleFill = async (fillAllMatched: boolean) => {
    const targetIds = fillAllMatched
      ? fields.filter((f) => f.status === 'MATCHED' && fieldValues[f.id]).map((f) => f.id)
      : Array.from(selectedIds);

    if (targetIds.length === 0) return;

    setIsFilling(true);
    const toFill: Record<string, string> = {};
    targetIds.forEach((id) => {
      if (fieldValues[id]) {
        toFill[id] = fieldValues[id];
      }
    });

    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        chrome.runtime.sendMessage({ type: 'FILL_FIELDS', values: toFill }, () => {
          if (chrome.runtime?.lastError) {
            // Read to prevent unchecked runtime.lastError
            console.warn('Fill fields warning:', chrome.runtime.lastError.message);
          }
          setIsFilling(false);
          const newlyFilled = new Set(filledFieldIds);
          targetIds.forEach((id) => newlyFilled.add(id));
          setFilledFieldIds(newlyFilled);
        });
      } else {
        setTimeout(() => {
          setIsFilling(false);
          const newlyFilled = new Set(filledFieldIds);
          targetIds.forEach((id) => newlyFilled.add(id));
          setFilledFieldIds(newlyFilled);
        }, 400);
      }
    } catch {
      setIsFilling(false);
    }
  };

  const handleDraftAi = async (field: DetectedField) => {
    if (!profile) return;
    setDraftingFieldId(field.id);
    try {
      const res = await aiService.generateAnswer(
        field.label || 'Application question',
        profile,
        projectList,
        experienceList,
        educationList
      );
      setFieldValues((prev) => ({ ...prev, [field.id]: res.answer }));
      setSelectedIds((prev) => new Set(prev).add(field.id));
    } catch (err) {
      console.warn('AI answer draft warning:', err);
    } finally {
      setDraftingFieldId(null);
    }
  };

  const copyToClipboard = (key: string, text: string | undefined | null) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Counts & Readiness Score (Endowed Progress)
  const matchedCount = fields.filter((f) => f.status === 'MATCHED').length;
  const reviewCount = fields.filter((f) => f.status === 'NEEDS_REVIEW').length;
  const unknownCount = fields.filter((f) => f.status === 'UNMATCHED').length;

  const calculateReadiness = (): number => {
    if (!profile) return 0;
    return profileService.calculateCompleteness(
      profile,
      educationList,
      experienceList,
      skillsList,
      resumes.length,
      projectList.length,
      certCount
    );
  };
  const readinessScore = calculateReadiness();

  return (
    <div className="panel" style={{ position: 'relative', background: 'var(--theme-bg)' }}>

      {showOnboarding && (
        <OnboardingWizard
          profile={profile}
          resumes={resumes}
          onComplete={() => setShowOnboarding(false)}
          onProfileUpdated={loadAllData}
        />
      )}

      {/* Header */}
      <div className="ph" style={{ borderBottom: '1px solid var(--border)', background: 'var(--surface)' }}>
        <div className="brand" style={{ display: 'flex', alignItems: 'center' }}>
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
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
          {/* Quick theme toggle */}
          <button
            type="button"
            className="icon"
            onClick={toggleTheme}
            title={isDarkMode ? 'Switch to light theme' : 'Switch to dark theme'}
            aria-label="Toggle Theme"
            style={{ width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer' }}
          >
            {isDarkMode ? <Sun size={14} /> : <Moon size={14} />}
          </button>
          <button
            type="button"
            className="btn-tour-pill"
            onClick={() => {
              if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
                chrome.runtime.openOptionsPage();
              }
            }}
            title="Profile readiness - click to open dashboard"
            style={{
              whiteSpace: 'nowrap',
              flexShrink: 0,
              fontSize: '11px',
              padding: '4px 9px',
              cursor: 'pointer',
              lineHeight: 1.2,
            }}
          >
            Profile {readinessScore}%
          </button>
          <Pill variant={readinessScore === 100 ? 'm' : 'i'}>
            {websiteInfo?.adapterName || 'Google Forms'}
          </Pill>
          <button
            type="button"
            className="icon"
            aria-label="Open Dashboard"
            title="Open happlied Dashboard"
            onClick={() => {
              if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
                chrome.runtime.openOptionsPage();
              }
            }}
            style={{ width: '32px', height: '32px', borderRadius: '8px', cursor: 'pointer' }}
          >
            <LayoutDashboard size={14} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs" role="tablist" aria-label="Panel sections">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'autofill'}
          onClick={() => setActiveTab('autofill')}
        >
          Autofill
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'copy'}
          onClick={() => setActiveTab('copy')}
        >
          Copy
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'resume'}
          onClick={() => setActiveTab('resume')}
        >
          Resume ({resumes.length})
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'ai'}
          onClick={() => setActiveTab('ai')}
        >
          AI
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'answers'}
          onClick={() => setActiveTab('answers')}
        >
          Answers
        </button>
      </div>

      {/* Body: Autofill Tab */}
      {activeTab === 'autofill' && (
        <>
          <div className="pbody" id="pb">
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Button size="sm" id="scan" onClick={() => handleScanForm()} disabled={isScanning}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                    <circle cx="11" cy="11" r="8"></circle>
                    <line x1="21" y1="21" x2="16.65" y2="16.65"></line>
                  </svg>
                  {isScanning ? 'Scanning...' : 'Scan form'}
                </Button>
                <Pill variant="i">{fields.length} detected</Pill>
              </div>
              {fields.length > 0 && (
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                  <Pill variant="m">{matchedCount} matched</Pill>
                  <Pill variant="r">{reviewCount} review</Pill>
                  <Pill variant="u">{unknownCount} unknown</Pill>
                </div>
              )}
              {workdayStepTitle && (
                <div
                  style={{
                    padding: '8px 12px',
                    background: 'var(--i-bg)',
                    color: 'var(--i-t)',
                    borderRadius: '8px',
                    fontSize: '12.5px',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                  }}
                >
                  <span>⚡ Workday Step: <strong>{workdayStepTitle}</strong></span>
                  <span style={{ fontSize: '11px', opacity: 0.8 }}>Auto-tracked</span>
                </div>
              )}

              {/* Quick Profile Snapshot Glance */}
              {profile && (
                <div
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '10px',
                    padding: '10px 12px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', minWidth: 0 }}>
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {profile.personal.fullName || `${profile.personal.firstName || ''} ${profile.personal.lastName || ''}`.trim() || 'Candidate Profile'}
                      </span>
                      {profile.personal.email && (
                        <span style={{ fontSize: '11px', color: 'var(--muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          • {profile.personal.email}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setActiveTab('copy')}
                      style={{
                        background: 'transparent',
                        border: 'none',
                        color: 'var(--primary)',
                        fontSize: '11px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        padding: '2px 4px',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      View All Info →
                    </button>
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px', fontSize: '11px' }}>
                    {experienceList[0] && (
                      <span style={{ background: 'var(--hover)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text)' }}>
                        💼 {experienceList[0].designation}
                      </span>
                    )}
                    {educationList[0] && (
                      <span style={{ background: 'var(--hover)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text)' }}>
                        🎓 {educationList[0].degree} {educationList[0].cgpa ? `(${educationList[0].cgpa} CGPA)` : ''}
                      </span>
                    )}
                    {profile.preferences?.workAuthorizationStatus && (
                      <span style={{ background: 'var(--hover)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text)' }}>
                        🛡️ {profile.preferences.workAuthorizationStatus}
                      </span>
                    )}
                    {profile.preferences?.noticePeriodDays && (
                      <span style={{ background: 'var(--hover)', padding: '2px 8px', borderRadius: '4px', color: 'var(--text)' }}>
                        ⏱️ {profile.preferences.noticePeriodDays}
                      </span>
                    )}
                  </div>
                </div>
              )}
            </div>

            {errorMessage && (
              <div
                className="card"
                style={{
                  background: 'var(--surface)',
                  border: '1px solid var(--border)',
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '15px' }}>ℹ️</span>
                  <p style={{ fontSize: '13px', fontWeight: 600, color: 'var(--text)', margin: 0, lineHeight: 1.4 }}>
                    {errorMessage}
                  </p>
                </div>
                <div className="row" style={{ marginTop: '4px', gap: '8px' }}>
                  <Button size="sm" variant="soft" onClick={() => handleScanForm()}>
                    Retry Scan
                  </Button>
                  <Button size="sm" variant="soft" onClick={() => setActiveTab('copy')}>
                    Use Quick Copy →
                  </Button>
                </div>
              </div>
            )}

            {fields.length === 0 && !isScanning && !errorMessage && (
              <div className="card empty" style={{ textAlign: 'center', padding: '32px 14px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                <b style={{ fontSize: '16px' }}>No form scanned yet</b>
                <p className="hint" style={{ margin: '6px 0 16px' }}>
                  Click Scan Form to detect inputs on the current application tab.
                </p>
                <Button size="sm" onClick={() => handleScanForm()}>
                  Scan Now
                </Button>
              </div>
            )}

            {fields.map((field) => {
              const isChecked = selectedIds.has(field.id);
              const isFilled = filledFieldIds.has(field.id);
              const isChoice = field.options && field.options.length > 0;
              const isCheckOrRadio = field.fieldType === 'checkbox' || field.fieldType === 'radio';
              const isNarrativePrompt = Boolean(
                (field.label || '').toLowerCase().match(/(why|describe|tell us|about yourself|statement|cover letter|experience with|summary)/i)
              );
              const isLongText = (field.fieldType === 'textarea' || isNarrativePrompt) && !isCheckOrRadio && !isChoice;
              const pillVariant =
                field.status === 'MATCHED'
                  ? 'm'
                  : field.status === 'NEEDS_REVIEW'
                  ? isLongText ? 'a' : 'r'
                  : 'u';
              const pillText =
                field.status === 'MATCHED'
                  ? 'Matched'
                  : isLongText ? 'AI draft' : field.status === 'NEEDS_REVIEW' ? 'Review' : 'Unknown';

              return (
                <div
                  key={field.id}
                  className={`fc ${isFilled ? 'filled' : ''}`}
                  onMouseEnter={() => handleHighlight(field.id, true)}
                  onMouseLeave={() => handleHighlight(field.id, false)}
                  onFocus={() => handleHighlight(field.id, true)}
                  onBlur={() => handleHighlight(field.id, false)}
                >
                  <svg className="okm" viewBox="0 0 22 22">
                    <path d="M5 11l4 4 8-8" />
                  </svg>

                  <div className="fh">
                    <input
                      type="checkbox"
                      className="ck"
                      id={`ck-${field.id}`}
                      checked={isChecked}
                      onChange={() => toggleSelect(field.id)}
                    />
                    <label htmlFor={`ck-${field.id}`}>
                      {field.label} {field.required && <span aria-hidden="true">*</span>}
                    </label>
                    <Pill variant={pillVariant}>{pillText}</Pill>
                  </div>

                  {/* Choice questions (radio / checkbox / select options) */}
                  {isChoice ? (
                    <div className="choice" role="group" aria-label={field.label}>
                      {field.options!.map((opt) => {
                        const isPressed =
                          fieldValues[field.id] === opt.value ||
                          fieldValues[field.id]?.toLowerCase().trim() === opt.label.toLowerCase().trim() ||
                          (fieldValues[field.id]?.toLowerCase().trim() === 'yes' && (opt.value === '1' || opt.value === 'true')) ||
                          (fieldValues[field.id]?.toLowerCase().trim() === 'no' && (opt.value === '0' || opt.value === 'false'));
                        return (
                          <button
                            key={opt.value || opt.label}
                            type="button"
                            aria-pressed={isPressed}
                            onClick={() => {
                              setFieldValues((prev) => ({ ...prev, [field.id]: opt.value || opt.label }));
                              setSelectedIds((prev) => new Set(prev).add(field.id));
                            }}
                          >
                            {opt.label}
                          </button>
                        );
                      })}
                    </div>
                  ) : field.canonicalField === 'RESUME' ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--soft)',
                        borderRadius: '14px',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>📄</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>
                            {resumes[0]?.fileName || 'Resume Vault (1 stored)'}
                          </div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>
                            Manage files in Resume Vault
                          </div>
                        </div>
                      </div>
                      <Button size="sm" variant="soft" onClick={() => setActiveTab('resume')}>
                        Resume Vault →
                      </Button>
                    </div>
                  ) : field.canonicalField === 'COVER_LETTER' && (field.fieldType === 'file' || !field.fieldType || field.fieldType === 'text') ? (
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 14px',
                        background: 'var(--soft)',
                        borderRadius: '14px',
                        border: '1px solid var(--line)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px' }}>✍️</span>
                        <div>
                          <div style={{ fontSize: '13px', fontWeight: 600 }}>Tailored Cover Letter</div>
                          <div style={{ fontSize: '11px', color: 'var(--muted)' }}>Generate with AI</div>
                        </div>
                      </div>
                      <Button
                        size="sm"
                        variant="soft"
                        onClick={() => {
                          setActiveTab('ai');
                          setAiMode('coverLetter');
                        }}
                      >
                        Draft in AI Tab →
                      </Button>
                    </div>
                  ) : isLongText ? (
                    <>
                      <div className="ai">
                        {fieldValues[field.id] ||
                          'Click Generate below to produce a tailored AI draft from your profile experience.'}
                      </div>
                      <div className="row">
                        <Button
                          variant="soft"
                          size="sm"
                          onClick={() => handleDraftAi(field)}
                          disabled={draftingFieldId === field.id}
                        >
                          {draftingFieldId === field.id ? 'Drafting...' : 'Draft with AI'}
                        </Button>
                        <Button
                          variant="soft"
                          size="sm"
                          onClick={() => copyToClipboard(field.id, fieldValues[field.id] || '')}
                        >
                          {copiedKey === field.id ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </>
                  ) : field.status === 'UNMATCHED' ? (
                    <select
                      className="in"
                      style={{ colorScheme: 'dark light' }}
                      value={field.canonicalField || ''}
                      onChange={(e) => {
                        const canon = e.target.value as ApplicationField;
                        if (canon) {
                          field.canonicalField = canon;
                          field.status = 'MATCHED';
                          field.confidence = 1.0;
                          const val = resolveProfileValue(canon);
                          setFieldValues((prev) => ({ ...prev, [field.id]: val }));
                          setSelectedIds((prev) => new Set(prev).add(field.id));
                        }
                      }}
                    >
                      <option value="">Map to a profile field…</option>
                      {Object.keys(CANONICAL_FIELDS).map((k) => (
                        <option key={k} value={k}>
                          {CANONICAL_FIELDS[k as ApplicationField].displayLabel}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <div>
                      {field.canonicalField && (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px', fontSize: '11px', color: 'var(--muted)' }}>
                          <span>Mapped: <strong style={{ color: 'var(--primary)' }}>{CANONICAL_FIELDS[field.canonicalField]?.displayLabel || field.canonicalField}</strong></span>
                          <select
                            style={{ fontSize: '10.5px', background: 'transparent', border: 'none', color: 'var(--muted)', cursor: 'pointer', outline: 'none' }}
                            value={field.canonicalField}
                            onChange={(e) => {
                              const newCanon = e.target.value as ApplicationField;
                              if (newCanon) {
                                field.canonicalField = newCanon;
                                const newVal = resolveProfileValue(newCanon);
                                setFieldValues((prev) => ({ ...prev, [field.id]: newVal }));
                              }
                            }}
                          >
                            <option value="" disabled>Change mapping…</option>
                            {Object.keys(CANONICAL_FIELDS).map((k) => (
                              <option key={k} value={k}>
                                {CANONICAL_FIELDS[k as ApplicationField].displayLabel}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                      <div className="vrow">
                        <input
                          className="in"
                          aria-label={`${field.label} value`}
                          value={fieldValues[field.id] || ''}
                          onChange={(e) => {
                            const val = e.target.value;
                            setFieldValues((prev) => ({ ...prev, [field.id]: val }));
                            if (val) setSelectedIds((prev) => new Set(prev).add(field.id));
                          }}
                        />
                        <Button
                          variant="soft"
                          size="sm"
                          aria-label={`Copy ${field.label}`}
                          onClick={() => copyToClipboard(field.id, fieldValues[field.id] || '')}
                        >
                          {copiedKey === field.id ? 'Copied' : 'Copy'}
                        </Button>
                      </div>
                    </div>
                  )}

                  {fieldValues[field.id] && (
                    <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '2px' }}>
                      <button
                        type="button"
                        style={{
                          background: 'transparent',
                          border: 0,
                          fontSize: '11.5px',
                          color: savedToBankId === field.id ? 'var(--m-t)' : 'var(--muted)',
                          cursor: 'pointer',
                          padding: '2px 4px',
                          fontWeight: 600,
                        }}
                        onClick={() => handleSaveToBank(field)}
                        title="Save this question and answer into your permanent Answer Bank"
                      >
                        {savedToBankId === field.id ? '✓ Saved to Answer Bank' : '+ Save to Bank'}
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {/* Sticky footer */}
          <div className="pfoot">
            <Button variant="soft" id="fall" onClick={() => handleFill(true)}>
              Fill all matched
            </Button>
            <Button id="fsel" onClick={() => handleFill(false)} disabled={isFilling}>
              {isFilling ? 'Filling...' : `Fill selected (${selectedIds.size})`}
            </Button>
          </div>
        </>
      )}

      {/* Body: Copy Tab (Manual 1-click copying with rich profile info) */}
      {activeTab === 'copy' && (
        <div className="pbody" style={{ gap: '12px' }}>
          {/* Top Controls: Search & Category Chips */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', flexShrink: 0, width: '100%' }}>
            {/* Search bar */}
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', width: '100%' }}>
              <input
                className="in"
                type="search"
                placeholder="Search fields, skills, links..."
                value={copySearchQuery}
                onChange={(e) => setCopySearchQuery(e.target.value)}
                style={{ width: '100%', paddingLeft: '32px' }}
              />
              <span style={{ position: 'absolute', left: '10px', fontSize: '13px', opacity: 0.6, pointerEvents: 'none' }}>
                🔍
              </span>
              {copySearchQuery && (
                <button
                  type="button"
                  onClick={() => setCopySearchQuery('')}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'transparent',
                    border: 'none',
                    color: 'var(--muted)',
                    fontSize: '12px',
                    cursor: 'pointer',
                  }}
                >
                  ✕
                </button>
              )}
            </div>

            {/* Category filter chips */}
            <div
              style={{
                display: 'flex',
                gap: '6px',
                overflowX: 'auto',
                overflowY: 'hidden',
                padding: '2px 0 6px',
                scrollbarWidth: 'none',
                flexShrink: 0,
                minHeight: '36px',
                alignItems: 'center',
              }}
            >
              {[
                { id: 'all' as const, label: 'All', icon: '📋' },
                { id: 'personal' as const, label: 'Personal', icon: '👤' },
                { id: 'academics' as const, label: 'Academics', icon: '🎓', count: educationList.length },
                { id: 'experience' as const, label: 'Experience', icon: '💼', count: experienceList.length },
                { id: 'projects' as const, label: 'Projects', icon: '🚀', count: projectList.length },
                { id: 'skills' as const, label: 'Skills', icon: '🛠️', count: skillsList.length },
                { id: 'links' as const, label: 'Links', icon: '🌐' },
                { id: 'preferences' as const, label: 'Preferences', icon: '📋' },
              ].map((cat) => {
                const isSelected = copyCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setCopyCategory(cat.id)}
                    style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '5px',
                      padding: '5px 11px',
                      borderRadius: '999px',
                      border: isSelected ? '1px solid var(--btn)' : '1px solid var(--border)',
                      background: isSelected ? 'var(--btn)' : 'var(--surface)',
                      color: isSelected ? 'var(--btn-t)' : 'var(--text)',
                      fontSize: '11.5px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                      height: '30px',
                      boxSizing: 'border-box',
                      transition: 'all 0.15s ease',
                    }}
                  >
                    <span>{cat.icon}</span>
                    <span>{cat.label}</span>
                    {typeof cat.count === 'number' && (
                      <span
                        style={{
                          fontSize: '10px',
                          padding: '1px 5px',
                          borderRadius: '99px',
                          background: isSelected ? 'rgba(255,255,255,0.2)' : 'var(--hover)',
                          color: 'inherit',
                        }}
                      >
                        {cat.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Copy Helper Function */}
          {(() => {
            const q = copySearchQuery.trim().toLowerCase();
            const matches = (...texts: (string | undefined)[]) => {
              if (!q) return true;
              return texts.some((t) => t && t.toLowerCase().includes(q));
            };

            const renderRow = (label: string, val: string | undefined, keyId: string, isMultiline = false) => {
              if (!val || !val.trim()) return null;
              if (q && !matches(label, val)) return null;

              const isCopied = copiedKey === keyId;

              return (
                <div
                  key={keyId}
                  className="fc"
                  style={{
                    background: 'var(--surface)',
                    border: '1px solid var(--border)',
                    borderRadius: '8px',
                    padding: '8px 10px',
                    gap: '4px',
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                      {label}
                    </span>
                    {isCopied && (
                      <span style={{ fontSize: '11px', color: '#10B981', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '3px' }}>
                        <Check size={11} /> Copied!
                      </span>
                    )}
                  </div>
                  {isMultiline ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      <div
                        style={{
                          fontSize: '12px',
                          color: 'var(--text)',
                          whiteSpace: 'pre-wrap',
                          lineHeight: 1.45,
                          background: 'var(--theme-bg)',
                          padding: '6px 8px',
                          borderRadius: '6px',
                          border: '1px solid var(--border)',
                          maxHeight: '90px',
                          overflowY: 'auto',
                        }}
                      >
                        {val}
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                          variant="soft"
                          size="sm"
                          onClick={() => copyToClipboard(keyId, val)}
                          style={{ minWidth: '70px', display: 'flex', alignItems: 'center', gap: '4px' }}
                        >
                          {isCopied ? <Check size={12} style={{ color: '#10B981' }} /> : <Copy size={12} />}
                          <span>{isCopied ? 'Copied' : 'Copy'}</span>
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="vrow" style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <input
                        className="in"
                        readOnly
                        value={val}
                        style={{
                          flex: 1,
                          fontSize: '12.5px',
                          background: 'var(--theme-bg)',
                          border: '1px solid var(--border)',
                          borderRadius: '6px',
                          padding: '5px 8px',
                          color: 'var(--text)',
                        }}
                      />
                      <Button
                        variant="soft"
                        size="sm"
                        onClick={() => copyToClipboard(keyId, val)}
                        style={{ minWidth: '70px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      >
                        {isCopied ? <Check size={12} style={{ color: '#10B981' }} /> : <Copy size={12} />}
                        <span>{isCopied ? 'Copied' : 'Copy'}</span>
                      </Button>
                    </div>
                  )}
                </div>
              );
            };

            const showPersonal = copyCategory === 'all' || copyCategory === 'personal';
            const showAcademics = copyCategory === 'all' || copyCategory === 'academics';
            const showExperience = copyCategory === 'all' || copyCategory === 'experience';
            const showProjects = copyCategory === 'all' || copyCategory === 'projects';
            const showSkills = copyCategory === 'all' || copyCategory === 'skills';
            const showLinks = copyCategory === 'all' || copyCategory === 'links';
            const showPreferences = copyCategory === 'all' || copyCategory === 'preferences';

            return (
              <div className="stack" style={{ gap: '14px' }}>
                {/* 👤 PERSONAL & CONTACT */}
                {showPersonal && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 2px' }}>
                      <User size={14} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                        Personal & Contact
                      </span>
                    </div>
                    {renderRow('Full Name', profile?.personal.fullName || `${profile?.personal.firstName || ''} ${profile?.personal.lastName || ''}`.trim(), 'p-fullname')}
                    {renderRow('First Name', profile?.personal.firstName, 'p-firstname')}
                    {profile?.personal.middleName && renderRow('Middle Name', profile?.personal.middleName, 'p-middlename')}
                    {renderRow('Last Name', profile?.personal.lastName, 'p-lastname')}
                    {renderRow('Email Address', profile?.personal.email, 'p-email')}
                    {renderRow('Phone Number', profile?.personal.phone, 'p-phone')}
                    {profile?.personal.alternatePhone && renderRow('Alternate Phone', profile?.personal.alternatePhone, 'p-altphone')}
                    {profile?.personal.dateOfBirth && renderRow('Date of Birth', profile?.personal.dateOfBirth, 'p-dob')}
                    {profile?.personal.gender && renderRow('Gender', profile?.personal.gender, 'p-gender')}
                    {renderRow(
                      'Complete Address',
                      `${profile?.address.addressLine1 || ''}${profile?.address.addressLine2 ? ', ' + profile.address.addressLine2 : ''}, ${profile?.address.city || ''}, ${profile?.address.state || ''} ${profile?.address.postalCode || ''}, ${profile?.address.country || ''}`.replace(/^,\s*|,\s*$/g, '').trim(),
                      'p-address-full'
                    )}
                    {renderRow('Street Address 1', profile?.address.addressLine1, 'p-addr1')}
                    {profile?.address.addressLine2 && renderRow('Street Address 2', profile?.address.addressLine2, 'p-addr2')}
                    {renderRow('City', profile?.address.city, 'p-city')}
                    {renderRow('State / Province', profile?.address.state, 'p-state')}
                    {renderRow('Postal Code / ZIP', profile?.address.postalCode, 'p-zip')}
                    {renderRow('Country', profile?.address.country, 'p-country')}
                  </div>
                )}

                {/* 🎓 ACADEMICS & EDUCATION */}
                {showAcademics && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <GraduationCap size={14} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                          Academics & Education ({educationList.length})
                        </span>
                      </div>
                    </div>

                    {educationList.length === 0 ? (
                      <div className="card" style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        No academic records saved. Add degrees in Options.
                      </div>
                    ) : (
                      educationList.map((edu, idx) => {
                        const levelBadge =
                          edu.level === '10th'
                            ? 'Class 10th'
                            : edu.level === '12th'
                            ? 'Class 12th'
                            : edu.level === 'ug'
                            ? 'Undergraduate (UG)'
                            : edu.level === 'pg'
                            ? 'Postgraduate (PG)'
                            : edu.level || 'Education';

                        const fullSummary = `${edu.degree || 'Degree'}${edu.branch ? ` in ${edu.branch}` : ''} from ${edu.institution || 'University'}${edu.startYear || edu.graduationYear ? ` (${edu.startYear ? edu.startYear + '-' : ''}${edu.graduationYear || 'Present'})` : ''}${edu.cgpa ? ` • CGPA: ${edu.cgpa}` : ''}${edu.percentage ? ` • ${edu.percentage}%` : ''}`;

                        if (q && !matches(edu.institution, edu.degree, edu.branch, edu.board, edu.cgpa, edu.percentage, edu.rollNo, edu.graduationYear, levelBadge)) {
                          return null;
                        }

                        return (
                          <div
                            key={edu.id || idx}
                            className="card"
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: '10px',
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <span style={{ fontSize: '11px', fontWeight: 700, background: 'var(--hover)', padding: '2px 8px', borderRadius: '4px', color: 'var(--primary)' }}>
                                  {levelBadge}
                                </span>
                                <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '4px 0 0', color: 'var(--text)' }}>
                                  {edu.institution || 'Institution'}
                                </h4>
                                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                                  {edu.degree} {edu.branch ? `• ${edu.branch}` : ''}
                                </p>
                              </div>
                              <Button
                                variant="soft"
                                size="sm"
                                onClick={() => copyToClipboard(`edu-full-${idx}`, fullSummary)}
                                title="Copy complete education line"
                                style={{ fontSize: '11px', padding: '4px 8px' }}
                              >
                                {copiedKey === `edu-full-${idx}` ? '✓ Copied Line' : 'Copy Summary'}
                              </Button>
                            </div>

                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '6px' }}>
                              {edu.cgpa && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--theme-bg)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>CGPA: <strong>{edu.cgpa}</strong></span>
                                  <button type="button" onClick={() => copyToClipboard(`edu-cgpa-${idx}`, edu.cgpa)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '11px', fontWeight: 600 }}>
                                    {copiedKey === `edu-cgpa-${idx}` ? '✓' : 'Copy'}
                                  </button>
                                </div>
                              )}
                              {edu.percentage && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--theme-bg)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>%: <strong>{edu.percentage}%</strong></span>
                                  <button type="button" onClick={() => copyToClipboard(`edu-pct-${idx}`, edu.percentage)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '11px', fontWeight: 600 }}>
                                    {copiedKey === `edu-pct-${idx}` ? '✓' : 'Copy'}
                                  </button>
                                </div>
                              )}
                              {edu.graduationYear && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--theme-bg)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Year: <strong>{edu.graduationYear}</strong></span>
                                  <button type="button" onClick={() => copyToClipboard(`edu-yr-${idx}`, edu.graduationYear)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '11px', fontWeight: 600 }}>
                                    {copiedKey === `edu-yr-${idx}` ? '✓' : 'Copy'}
                                  </button>
                                </div>
                              )}
                              {edu.rollNo && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--theme-bg)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Roll: <strong>{edu.rollNo}</strong></span>
                                  <button type="button" onClick={() => copyToClipboard(`edu-roll-${idx}`, edu.rollNo)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '11px', fontWeight: 600 }}>
                                    {copiedKey === `edu-roll-${idx}` ? '✓' : 'Copy'}
                                  </button>
                                </div>
                              )}
                              {edu.board && (
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--theme-bg)', padding: '4px 8px', borderRadius: '6px', border: '1px solid var(--border)', gridColumn: 'span 2' }}>
                                  <span style={{ fontSize: '11px', color: 'var(--muted)' }}>Board: <strong>{edu.board}</strong></span>
                                  <button type="button" onClick={() => copyToClipboard(`edu-board-${idx}`, edu.board)} style={{ background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--primary)', fontSize: '11px', fontWeight: 600 }}>
                                    {copiedKey === `edu-board-${idx}` ? '✓' : 'Copy'}
                                  </button>
                                </div>
                              )}
                            </div>

                            {/* Individual Quick Copy Buttons */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginTop: '2px' }}>
                              <button type="button" onClick={() => copyToClipboard(`edu-inst-${idx}`, edu.institution)} style={{ background: 'var(--hover)', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: 'var(--text)' }}>
                                Copy College Name
                              </button>
                              <button type="button" onClick={() => copyToClipboard(`edu-deg-${idx}`, edu.degree)} style={{ background: 'var(--hover)', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: 'var(--text)' }}>
                                Copy Degree
                              </button>
                              {edu.branch && (
                                <button type="button" onClick={() => copyToClipboard(`edu-br-${idx}`, edu.branch)} style={{ background: 'var(--hover)', border: 'none', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: 'var(--text)' }}>
                                  Copy Branch
                                </button>
                              )}
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 💼 WORK EXPERIENCE */}
                {showExperience && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Briefcase size={14} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                          Work Experience ({experienceList.length})
                        </span>
                      </div>
                    </div>

                    {experienceList.length === 0 ? (
                      <div className="card" style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        No experience records saved yet.
                      </div>
                    ) : (
                      experienceList.map((exp, idx) => {
                        const dur = exp.startDate
                          ? `${exp.startDate} - ${exp.currentlyWorking ? 'Present' : exp.endDate || 'Present'}`
                          : '';
                        const roleSummary = `${exp.designation} at ${exp.companyName}${dur ? ` (${dur})` : ''}`;

                        if (q && !matches(exp.companyName, exp.designation, exp.description, exp.employmentType, ...(exp.technologies || []))) {
                          return null;
                        }

                        return (
                          <div
                            key={exp.id || idx}
                            className="card"
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: '10px',
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <span style={{ fontSize: '10.5px', fontWeight: 700, background: 'var(--hover)', padding: '2px 7px', borderRadius: '4px', color: 'var(--primary)' }}>
                                  {exp.employmentType || 'Full-time'}
                                </span>
                                <h4 style={{ fontSize: '13px', fontWeight: 700, margin: '4px 0 0', color: 'var(--text)' }}>
                                  {exp.designation}
                                </h4>
                                <p style={{ fontSize: '12px', color: 'var(--muted)', margin: 0 }}>
                                  {exp.companyName} {dur ? `• ${dur}` : ''}
                                </p>
                              </div>
                              <Button
                                variant="soft"
                                size="sm"
                                onClick={() => copyToClipboard(`exp-sum-${idx}`, roleSummary)}
                                style={{ fontSize: '11px', padding: '4px 8px' }}
                              >
                                {copiedKey === `exp-sum-${idx}` ? '✓ Copied' : 'Copy Summary'}
                              </Button>
                            </div>

                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px' }}>
                              <button type="button" onClick={() => copyToClipboard(`exp-co-${idx}`, exp.companyName)} style={{ background: 'var(--theme-bg)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: 'var(--text)' }}>
                                Copy Company
                              </button>
                              <button type="button" onClick={() => copyToClipboard(`exp-des-${idx}`, exp.designation)} style={{ background: 'var(--theme-bg)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: 'var(--text)' }}>
                                Copy Title
                              </button>
                              {dur && (
                                <button type="button" onClick={() => copyToClipboard(`exp-dur-${idx}`, dur)} style={{ background: 'var(--theme-bg)', border: '1px solid var(--border)', padding: '3px 8px', borderRadius: '4px', fontSize: '11px', cursor: 'pointer', color: 'var(--text)' }}>
                                  Copy Dates
                                </button>
                              )}
                            </div>

                            {/* Technologies */}
                            {exp.technologies && exp.technologies.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                <span style={{ fontSize: '10.5px', color: 'var(--muted)' }}>Tech:</span>
                                {exp.technologies.map((t, tIdx) => (
                                  <span
                                    key={tIdx}
                                    onClick={() => copyToClipboard(`exp-t-${idx}-${tIdx}`, t)}
                                    title="Click to copy technology"
                                    style={{
                                      fontSize: '10.5px',
                                      background: copiedKey === `exp-t-${idx}-${tIdx}` ? '#10B981' : 'var(--hover)',
                                      color: copiedKey === `exp-t-${idx}-${tIdx}` ? '#fff' : 'var(--text)',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* Description / Bullet Points */}
                            {exp.description && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--muted)' }}>
                                    Responsibilities & Bullet Points
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(`exp-desc-${idx}`, exp.description)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                                  >
                                    {copiedKey === `exp-desc-${idx}` ? '✓ Copied' : 'Copy Bullets'}
                                  </button>
                                </div>
                                <div
                                  style={{
                                    fontSize: '11.5px',
                                    color: 'var(--text)',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.4,
                                    background: 'var(--theme-bg)',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    maxHeight: '80px',
                                    overflowY: 'auto',
                                  }}
                                >
                                  {exp.description}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 🚀 PROJECTS */}
                {showProjects && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <FolderGit2 size={14} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                          Projects & Portfolios ({projectList.length})
                        </span>
                      </div>
                    </div>

                    {projectList.length === 0 ? (
                      <div className="card" style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        No projects saved yet. Add projects in Options dashboard.
                      </div>
                    ) : (
                      projectList.map((prj, idx) => {
                        if (q && !matches(prj.name, prj.shortDescription, prj.detailedDescription, prj.githubUrl, prj.liveUrl, ...(prj.technologies || []))) {
                          return null;
                        }

                        return (
                          <div
                            key={prj.id || idx}
                            className="card"
                            style={{
                              background: 'var(--surface)',
                              border: '1px solid var(--border)',
                              borderRadius: '10px',
                              padding: '12px',
                              display: 'flex',
                              flexDirection: 'column',
                              gap: '8px',
                            }}
                          >
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                              <div>
                                <h4 style={{ fontSize: '13px', fontWeight: 700, margin: 0, color: 'var(--text)' }}>
                                  {prj.name}
                                </h4>
                                {prj.shortDescription && (
                                  <p style={{ fontSize: '11.5px', color: 'var(--muted)', margin: '2px 0 0' }}>
                                    {prj.shortDescription}
                                  </p>
                                )}
                              </div>
                              <Button
                                variant="soft"
                                size="sm"
                                onClick={() => copyToClipboard(`prj-name-${idx}`, prj.name)}
                                style={{ fontSize: '11px', padding: '4px 8px' }}
                              >
                                {copiedKey === `prj-name-${idx}` ? '✓ Copied' : 'Copy Title'}
                              </Button>
                            </div>

                            {/* Tech Stack */}
                            {prj.technologies && prj.technologies.length > 0 && (
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', alignItems: 'center' }}>
                                <span style={{ fontSize: '10.5px', color: 'var(--muted)' }}>Stack:</span>
                                {prj.technologies.map((t, tIdx) => (
                                  <span
                                    key={tIdx}
                                    onClick={() => copyToClipboard(`prj-t-${idx}-${tIdx}`, t)}
                                    title="Click to copy"
                                    style={{
                                      fontSize: '10.5px',
                                      background: copiedKey === `prj-t-${idx}-${tIdx}` ? '#10B981' : 'var(--hover)',
                                      color: copiedKey === `prj-t-${idx}-${tIdx}` ? '#fff' : 'var(--text)',
                                      padding: '1px 6px',
                                      borderRadius: '4px',
                                      cursor: 'pointer',
                                    }}
                                  >
                                    {t}
                                  </span>
                                ))}
                              </div>
                            )}

                            {/* URLs */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                              {prj.githubUrl && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--theme-bg)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '6px' }}>
                                  <span style={{ fontSize: '11px' }}>🐙 GitHub:</span>
                                  <button type="button" onClick={() => copyToClipboard(`prj-gh-${idx}`, prj.githubUrl)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                    {copiedKey === `prj-gh-${idx}` ? '✓ Copied' : 'Copy'}
                                  </button>
                                  <a href={prj.githubUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--muted)' }} title="Open repo">
                                    <ExternalLink size={11} />
                                  </a>
                                </div>
                              )}
                              {prj.liveUrl && (
                                <div style={{ display: 'flex', alignItems: 'center', gap: '4px', background: 'var(--theme-bg)', border: '1px solid var(--border)', padding: '2px 8px', borderRadius: '6px' }}>
                                  <span style={{ fontSize: '11px' }}>🔗 Live:</span>
                                  <button type="button" onClick={() => copyToClipboard(`prj-live-${idx}`, prj.liveUrl)} style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}>
                                    {copiedKey === `prj-live-${idx}` ? '✓ Copied' : 'Copy'}
                                  </button>
                                  <a href={prj.liveUrl} target="_blank" rel="noreferrer" style={{ color: 'var(--muted)' }} title="Open demo">
                                    <ExternalLink size={11} />
                                  </a>
                                </div>
                              )}
                            </div>

                            {/* Detailed Description */}
                            {prj.detailedDescription && (
                              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                  <span style={{ fontSize: '10.5px', fontWeight: 600, color: 'var(--muted)' }}>
                                    Full Project Details & Features
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => copyToClipboard(`prj-desc-${idx}`, prj.detailedDescription)}
                                    style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                                  >
                                    {copiedKey === `prj-desc-${idx}` ? '✓ Copied' : 'Copy Full Details'}
                                  </button>
                                </div>
                                <div
                                  style={{
                                    fontSize: '11.5px',
                                    color: 'var(--text)',
                                    whiteSpace: 'pre-wrap',
                                    lineHeight: 1.4,
                                    background: 'var(--theme-bg)',
                                    padding: '6px 8px',
                                    borderRadius: '6px',
                                    border: '1px solid var(--border)',
                                    maxHeight: '80px',
                                    overflowY: 'auto',
                                  }}
                                >
                                  {prj.detailedDescription}
                                </div>
                              </div>
                            )}
                          </div>
                        );
                      })
                    )}
                  </div>
                )}

                {/* 🛠️ SKILLS */}
                {showSkills && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 2px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <Wrench size={14} style={{ color: 'var(--primary)' }} />
                        <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                          Skills ({skillsList.length})
                        </span>
                      </div>
                      {skillsList.length > 0 && (
                        <Button
                          variant="soft"
                          size="sm"
                          onClick={() => copyToClipboard('skills-all', skillsList.map((s) => s.name).join(', '))}
                          style={{ fontSize: '11px', padding: '4px 8px' }}
                        >
                          {copiedKey === 'skills-all' ? '✓ Copied All' : 'Copy All Skills'}
                        </Button>
                      )}
                    </div>

                    {skillsList.length === 0 ? (
                      <div className="card" style={{ padding: '14px', textAlign: 'center', fontSize: '12px', color: 'var(--muted)', background: 'var(--surface)', border: '1px solid var(--border)' }}>
                        No skills added yet.
                      </div>
                    ) : (
                      <>
                        {[
                          { key: 'languages', title: 'Languages' },
                          { key: 'frameworks', title: 'Frameworks & Libraries' },
                          { key: 'databases', title: 'Databases & Storage' },
                          { key: 'cloud', title: 'Cloud & DevOps' },
                          { key: 'developerTools', title: 'Developer Tools' },
                          { key: 'ai', title: 'AI & Machine Learning' },
                          { key: 'other', title: 'Other Skills' },
                        ].map((group) => {
                          const groupSkills = skillsList.filter((s) =>
                            group.key === 'other' ? !s.category || s.category === 'other' : s.category === group.key
                          );
                          if (groupSkills.length === 0) return null;
                          const filtered = groupSkills.filter((s) => matches(s.name, group.title));
                          if (filtered.length === 0) return null;

                          return (
                            <div
                              key={group.key}
                              className="card"
                              style={{
                                background: 'var(--surface)',
                                border: '1px solid var(--border)',
                                borderRadius: '10px',
                                padding: '10px 12px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '6px',
                              }}
                            >
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <span style={{ fontSize: '11.5px', fontWeight: 700, color: 'var(--text)' }}>
                                  {group.title} ({filtered.length})
                                </span>
                                <button
                                  type="button"
                                  onClick={() => copyToClipboard(`grp-${group.key}`, filtered.map((s) => s.name).join(', '))}
                                  style={{ background: 'transparent', border: 'none', color: 'var(--primary)', fontSize: '11px', fontWeight: 600, cursor: 'pointer' }}
                                >
                                  {copiedKey === `grp-${group.key}` ? '✓ Copied' : 'Copy Category'}
                                </button>
                              </div>
                              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '5px' }}>
                                {filtered.map((s) => {
                                  const isCopied = copiedKey === `sk-${s.id}`;
                                  return (
                                    <button
                                      key={s.id}
                                      type="button"
                                      onClick={() => copyToClipboard(`sk-${s.id}`, s.name)}
                                      title="Click to copy skill"
                                      style={{
                                        fontSize: '11px',
                                        background: isCopied ? '#10B981' : 'var(--theme-bg)',
                                        color: isCopied ? '#fff' : 'var(--text)',
                                        border: '1px solid var(--border)',
                                        padding: '3px 8px',
                                        borderRadius: '6px',
                                        cursor: 'pointer',
                                        transition: 'all 0.15s ease',
                                        fontWeight: 500,
                                      }}
                                    >
                                      {isCopied ? `✓ ${s.name}` : s.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          );
                        })}
                      </>
                    )}
                  </div>
                )}

                {/* 🌐 LINKS & ONLINE PROFILES */}
                {showLinks && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 2px' }}>
                      <Globe size={14} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                        Online Profiles & Links
                      </span>
                    </div>

                    {renderRow('LinkedIn Profile', profile?.links.linkedInUrl, 'lnk-linkedin')}
                    {renderRow('GitHub Profile', profile?.links.githubUrl, 'lnk-github')}
                    {renderRow('Portfolio / Website', profile?.links.portfolioUrl || profile?.links.personalWebsite, 'lnk-portfolio')}
                    {renderRow('Resume Drive Link', profile?.links.resumeDriveUrl, 'lnk-drive')}
                    {renderRow('LeetCode Profile', profile?.links.leetcodeUrl, 'lnk-leetcode')}
                    {renderRow('Codeforces Profile', profile?.links.codeforcesUrl, 'lnk-codeforces')}
                    {renderRow('CodeChef Profile', profile?.links.codechefUrl, 'lnk-codechef')}
                    {renderRow('HackerRank Profile', profile?.links.hackerrankUrl, 'lnk-hackerrank')}
                    {renderRow('Kaggle Profile', profile?.links.kaggleUrl, 'lnk-kaggle')}
                    {renderRow('Medium Profile', profile?.links.mediumUrl, 'lnk-medium')}
                    {renderRow('GeeksforGeeks Profile', profile?.links.gfgUrl, 'lnk-gfg')}
                    {renderRow('X / Twitter Profile', profile?.links.xUrl, 'lnk-x')}
                    {renderRow('Behance Profile', profile?.links.behanceUrl, 'lnk-behance')}
                    {renderRow('Dribbble Profile', profile?.links.dribbbleUrl, 'lnk-dribbble')}

                    {/* Custom user links */}
                    {profile?.links.otherLinks && profile.links.otherLinks.map((customLnk) => (
                      renderRow(customLnk.label || 'Custom Link', customLnk.url, `lnk-custom-${customLnk.id}`)
                    ))}
                  </div>
                )}

                {/* 📋 WORK AUTHORIZATION & PREFERENCES */}
                {showPreferences && (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '0 2px' }}>
                      <ShieldCheck size={14} style={{ color: 'var(--primary)' }} />
                      <span style={{ fontSize: '13px', fontWeight: 700, color: 'var(--text)' }}>
                        Work Authorization & Preferences
                      </span>
                    </div>

                    {renderRow('Work Authorization Status', profile?.preferences.workAuthorizationStatus, 'prf-auth')}
                    {renderRow('Requires Visa Sponsorship?', profile?.preferences.requiresVisaSponsorship ? 'Yes' : 'No', 'prf-visa')}
                    {renderRow('Notice Period', profile?.preferences.noticePeriodDays || 'Immediate Joiner', 'prf-notice')}
                    {renderRow('Preferred Work Model', profile?.preferences.workModel || 'Flexible', 'prf-model')}
                    {profile?.preferences.preferredTitles && profile.preferences.preferredTitles.length > 0 && (
                      renderRow('Target Job Titles', profile.preferences.preferredTitles.join(', '), 'prf-titles')
                    )}
                    {profile?.preferences.preferredLocations && profile.preferences.preferredLocations.length > 0 && (
                      renderRow('Preferred Locations', profile.preferences.preferredLocations.join(', '), 'prf-locs')
                    )}
                    {renderRow('Expected Compensation', profile?.preferences.expectedCompensation, 'prf-expctc')}
                    {renderRow('Current Compensation', profile?.preferences.currentCompensation, 'prf-curctc')}
                    {renderRow('Earliest Availability Date', profile?.preferences.availabilityDate || 'Immediate', 'prf-avail')}
                    {renderRow('Willing to Relocate?', profile?.preferences.willingToRelocate ? 'Yes' : 'No', 'prf-reloc')}
                    {profile?.preferences.veteranStatus && renderRow('Veteran Status', profile?.preferences.veteranStatus, 'prf-vet')}
                    {profile?.preferences.disabilityStatus && renderRow('Disability Disclosure', profile?.preferences.disabilityStatus, 'prf-disab')}
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      )}

      {/* Body: Resumes Tab */}
      {activeTab === 'resume' && (
        <div className="pbody">
          {resumes.length === 0 ? (
            <div className="card empty" style={{ textAlign: 'center', padding: '32px 14px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <b>No resumes in vault</b>
              <p className="hint">Upload a resume in the Options dashboard.</p>
            </div>
          ) : (
            resumes.map((res) => (
              <div key={res.id} className="fc">
                <div className="fh">
                  <label>{res.fileName}</label>
                  {res.isDefault && <Pill variant="m">Active</Pill>}
                </div>
                <p className="hint">
                  {Math.round((res.fileSize || 0) / 1024)} KB · {res.uploadedAt?.split('T')[0]}
                </p>
                <div className="row" style={{ marginTop: '8px' }}>
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() => copyToClipboard(res.id, res.fileName)}
                  >
                    {copiedKey === res.id ? 'Copied name' : 'Copy filename'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Body: AI Tab */}
      {activeTab === 'ai' && (
        <div className="pbody">
          <div style={{ display: 'flex', gap: '6px', marginBottom: '12px' }}>
            <Button
              size="sm"
              variant={aiMode === 'qa' ? 'primary' : 'soft'}
              onClick={() => setAiMode('qa')}
              style={{ flex: 1, padding: '6px 4px', fontSize: '11px' }}
            >
              Q&A
            </Button>
            <Button
              size="sm"
              variant={aiMode === 'coverLetter' ? 'primary' : 'soft'}
              onClick={() => setAiMode('coverLetter')}
              style={{ flex: 1, padding: '6px 4px', fontSize: '11px' }}
            >
              Cover Letter
            </Button>
            <Button
              size="sm"
              variant={aiMode === 'match' ? 'primary' : 'soft'}
              onClick={() => setAiMode('match')}
              style={{ flex: 1, padding: '6px 4px', fontSize: '11px' }}
            >
              ATS Match
            </Button>
          </div>

          {aiMode === 'qa' ? (
            <>
              <div className="card">
                <h3 style={{ fontSize: '16px', marginBottom: '8px' }}>AI Answer Generator</h3>
                <label className="f" htmlFor="ai-prompt">Question prompt</label>
                <textarea
                  className="in"
                  id="ai-prompt"
                  rows={3}
                  placeholder="e.g. Why should we hire you for this role?"
                  value={aiCustomQuestion}
                  onChange={(e) => setAiCustomQuestion(e.target.value)}
                />
                <Button
                  size="sm"
                  style={{ marginTop: '10px' }}
                  disabled={isGeneratingAi || !aiCustomQuestion.trim() || !profile}
                  onClick={async () => {
                    if (!profile) return;
                    setIsGeneratingAi(true);
                    try {
                      const res = await aiService.generateAnswer(
                        aiCustomQuestion,
                        profile,
                        projectList,
                        experienceList,
                        educationList
                      );
                      setAiGeneratedText(res.answer);
                    } catch {
                      setAiGeneratedText('Could not generate answer. Check API key in Settings.');
                    } finally {
                      setIsGeneratingAi(false);
                    }
                  }}
                >
                  {isGeneratingAi ? 'Drafting...' : 'Generate Answer'}
                </Button>
              </div>

              {aiGeneratedText && (
                <div className="fc">
                  <div className="ai">{aiGeneratedText}</div>
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() => copyToClipboard('ai-gen', aiGeneratedText)}
                  >
                    {copiedKey === 'ai-gen' ? 'Copied' : 'Copy Answer'}
                  </Button>
                </div>
              )}
            </>
          ) : aiMode === 'coverLetter' ? (
            <>
              <div className="card">
                <h3 style={{ fontSize: '16px', marginBottom: '6px' }}>1-Page Cover Letter</h3>
                <p className="hint" style={{ marginBottom: '12px', fontSize: '12px' }}>
                  Grounded in your real projects and experience. Formatted in 3 concise paragraphs.
                </p>

                <div className="stack" style={{ gap: '10px' }}>
                  <div>
                    <label className="f" htmlFor="cl-company">Target Company</label>
                    <input
                      className="in"
                      id="cl-company"
                      placeholder="e.g. Stripe, Google, Meta"
                      value={clCompany}
                      onChange={(e) => setClCompany(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="f" htmlFor="cl-role">Target Role</label>
                    <input
                      className="in"
                      id="cl-role"
                      placeholder="e.g. Senior Software Engineer"
                      value={clJobTitle}
                      onChange={(e) => setClJobTitle(e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="f">Tone</label>
                    <div style={{ display: 'flex', gap: '6px', marginTop: '4px' }}>
                      {(['Confident', 'Technical', 'Enthusiastic'] as const).map((tone) => (
                        <button
                          key={tone}
                          type="button"
                          onClick={() => setClTone(tone)}
                          style={{
                            flex: 1,
                            padding: '6px 8px',
                            borderRadius: '6px',
                            border: clTone === tone ? '1.5px solid var(--accent)' : '1px solid var(--line)',
                            background: clTone === tone ? 'var(--a-bg)' : 'transparent',
                            color: clTone === tone ? 'var(--a-t)' : 'var(--ink)',
                            fontWeight: 600,
                            fontSize: '12px',
                            cursor: 'pointer',
                          }}
                        >
                          {tone}
                        </button>
                      ))}
                    </div>
                  </div>

                  <Button
                    size="sm"
                    style={{ marginTop: '4px' }}
                    disabled={isGeneratingCl || !profile}
                    onClick={async () => {
                      if (!profile) return;
                      setIsGeneratingCl(true);
                      try {
                        const res = await aiService.generateCoverLetter({
                          companyName: clCompany.trim() || 'the Company',
                          jobTitle: clJobTitle.trim() || 'Software Engineer',
                          tone: clTone,
                          profile,
                          projects: projectList,
                          experience: experienceList,
                          skills: skillsList,
                        });
                        setClGenerated(res.coverLetter);
                        setClSource(res.groundedIn?.[0] || 'Profile Synthesis');
                      } catch {
                        setClGenerated('Failed to generate cover letter. Check settings or retry.');
                        setClSource('');
                      } finally {
                        setIsGeneratingCl(false);
                      }
                    }}
                  >
                    {isGeneratingCl ? 'Synthesizing...' : 'Generate 1-Page Cover Letter'}
                  </Button>
                </div>
              </div>

              {clGenerated && (
                <div className="fc">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                    <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                      <Pill variant="a">{clTone} Tone</Pill>
                      {clSource && <Pill variant="i">{clSource}</Pill>}
                    </div>
                    <span style={{ fontSize: '11px', color: 'var(--muted)' }}>
                      {clGenerated.split(/\s+/).filter(Boolean).length} words
                    </span>
                  </div>
                  <div
                    className="ai"
                    style={{
                      whiteSpace: 'pre-wrap',
                      fontSize: '12px',
                      lineHeight: '1.6',
                      maxHeight: '280px',
                      overflowY: 'auto',
                    }}
                  >
                    {clGenerated}
                  </div>
                  <div className="row" style={{ marginTop: '8px' }}>
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => copyToClipboard('cl-gen', clGenerated)}
                    >
                      {copiedKey === 'cl-gen' ? 'Copied to Clipboard!' : 'Copy Cover Letter'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          ) : (
            <>
              <div className="card">
                <h3 style={{ fontSize: '16px', marginBottom: '4px' }}>ATS Match & Skill Gap</h3>
                <p className="hint" style={{ marginBottom: '10px', fontSize: '12px' }}>
                  Analyze job description against your profile skills to maximize interview callback rates.
                </p>

                <div className="row" style={{ gap: '8px', marginBottom: '10px' }}>
                  <Button
                    size="sm"
                    variant="primary"
                    disabled={isAnalyzingJob}
                    onClick={handleAnalyzeActivePage}
                    style={{ flex: 1 }}
                  >
                    {isAnalyzingJob ? 'Analyzing Page...' : '⚡ Scan Active Job Post'}
                  </Button>
                </div>

                <label className="f" htmlFor="jd-text">Job Description Text</label>
                <textarea
                  className="in"
                  id="jd-text"
                  rows={4}
                  placeholder="Paste job description here or click 'Scan Active Job Post'..."
                  value={jobText}
                  onChange={(e) => setJobText(e.target.value)}
                />

                {jobText && !jobAnalysis && !isAnalyzingJob && (
                  <Button
                    size="sm"
                    style={{ marginTop: '8px' }}
                    onClick={handleAnalyzeActivePage}
                  >
                    Analyze Pasted Text
                  </Button>
                )}
              </div>

              {addedSkillNotice && (
                <div style={{
                  padding: '8px 12px',
                  background: 'rgba(52, 199, 89, 0.15)',
                  border: '1px solid #34c759',
                  borderRadius: '8px',
                  color: '#2e7d32',
                  fontSize: '12px',
                  fontWeight: 600,
                  margin: '8px 0',
                  textAlign: 'center'
                }}>
                  ✓ {addedSkillNotice}
                </div>
              )}

              {jobAnalysis && (
                <div className="fc">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <div>
                      <b style={{ fontSize: '16px', display: 'block' }}>{jobAnalysis.matchScore}% Match</b>
                      <span style={{ fontSize: '12px', color: 'var(--muted)' }}>{jobAnalysis.summary}</span>
                    </div>
                    <Pill variant={jobAnalysis.matchScore >= 75 ? 'm' : jobAnalysis.matchScore >= 50 ? 'r' : 'u'}>
                      {jobAnalysis.matchScore >= 75 ? 'Strong Fit' : jobAnalysis.matchScore >= 50 ? 'Moderate' : 'Skill Gap'}
                    </Pill>
                  </div>

                  {jobAnalysis.matchedSkills.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <label className="f" style={{ fontSize: '11px', color: '#2e7d32' }}>
                        Matched Skills ({jobAnalysis.matchedSkills.length})
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        {jobAnalysis.matchedSkills.map((sk) => (
                          <Pill key={sk} variant="m" style={{ fontSize: '11px' }}>
                            ✓ {sk}
                          </Pill>
                        ))}
                      </div>
                    </div>
                  )}

                  {jobAnalysis.missingSkills.length > 0 && (
                    <div style={{ marginBottom: '10px' }}>
                      <label className="f" style={{ fontSize: '11px', color: 'var(--warn)' }}>
                        Missing Keywords ({jobAnalysis.missingSkills.length})
                      </label>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginTop: '4px' }}>
                        {jobAnalysis.missingSkills.map((sk) => (
                          <button
                            key={sk}
                            type="button"
                            onClick={() => handleAddSkillToProfile(sk)}
                            title="Click to add skill to your profile"
                            style={{
                              border: '1px dashed var(--warn)',
                              borderRadius: '99px',
                              padding: '2px 8px',
                              fontSize: '11px',
                              background: 'transparent',
                              color: 'var(--warn)',
                              cursor: 'pointer',
                              fontWeight: 500,
                            }}
                          >
                            + {sk}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {jobAnalysis.tips.length > 0 && (
                    <div style={{ marginTop: '8px', borderTop: '1px solid var(--line)', paddingTop: '8px' }}>
                      <label className="f" style={{ fontSize: '11px' }}>ATS Strategy Tips</label>
                      <ul style={{ margin: '4px 0 0 16px', padding: 0, fontSize: '12px', color: 'var(--muted)', lineHeight: '1.5' }}>
                        {jobAnalysis.tips.map((tip, idx) => (
                          <li key={idx} style={{ marginBottom: '4px' }}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Body: Answers Tab */}
      {activeTab === 'answers' && (
        <div className="pbody">
          {answers.length === 0 ? (
            <div className="card empty" style={{ textAlign: 'center', padding: '32px 14px', background: 'var(--surface)', border: '1px solid var(--border)' }}>
              <b>No saved answers</b>
              <p className="hint">Save common behavioral and technical responses in Options.</p>
            </div>
          ) : (
            answers.map((ans) => (
              <div key={ans.id} className="fc">
                <Pill variant="a">{ans.category}</Pill>
                <b style={{ fontSize: '14px', margin: '4px 0' }}>{ans.question}</b>
                <p style={{ fontSize: '13px', color: 'var(--muted)' }}>{ans.answer}</p>
                <div className="row" style={{ marginTop: '8px' }}>
                  <Button
                    variant="soft"
                    size="sm"
                    onClick={() => copyToClipboard(ans.id, ans.answer)}
                  >
                    {copiedKey === ans.id ? 'Copied' : 'Copy Answer'}
                  </Button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};
