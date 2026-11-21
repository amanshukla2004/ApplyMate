import React, { useEffect, useState } from 'react';
import { Backdrop } from '../components/ui/Backdrop';
import { Button } from '../components/ui/Button';
import { Pill } from '../components/ui/Pill';
import { HapplyMateLogo } from '../components/ui/ApplyMateLogo';
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
  const [activeTab, setActiveTab] = useState<TabKey>('autofill');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [answers, setAnswers] = useState<SavedAnswer[]>([]);
  const [educationList, setEducationList] = useState<EducationRecord[]>([]);
  const [experienceList, setExperienceList] = useState<ExperienceRecord[]>([]);
  const [skillsList, setSkillsList] = useState<SkillItem[]>([]);
  const [projectList, setProjectList] = useState<ProjectRecord[]>([]);

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
      console.error('Job analysis failed:', err);
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

      // Auto-scan on load so detected fields appear immediately
      handleScanForm(p, edu);
    } catch (err) {
      console.error('Failed to load side panel data:', err);
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
        return (p.links as any)?.twitterUrl || (p.links as any)?.twitter || '';
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
      console.error(err);
    } finally {
      setDraftingFieldId(null);
    }
  };

  const copyToClipboard = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 1800);
  };

  // Counts
  const matchedCount = fields.filter((f) => f.status === 'MATCHED').length;
  const reviewCount = fields.filter((f) => f.status === 'NEEDS_REVIEW').length;
  const unknownCount = fields.filter((f) => f.status === 'UNMATCHED').length;

  return (
    <div className="panel glass" style={{ position: 'relative' }}>
      <Backdrop />

      {/* Header */}
      <div className="ph">
        <div className="brand">
          <HapplyMateLogo size={28} />
          <span style={{ fontWeight: 700, fontSize: '17px' }}>HapplyMate</span>
        </div>
        <Pill variant="i">
          {websiteInfo?.adapterName || 'Google Forms'}
        </Pill>
        <button
          type="button"
          className="icon"
          aria-label="Settings"
          onClick={() => {
            if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
              chrome.runtime.openOptionsPage();
            }
          }}
        >
          ⚙
        </button>
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
            </div>

            {errorMessage && (
              <div
                className="glass card"
                style={{
                  background: 'var(--u-bg)',
                  borderColor: 'var(--u-t)',
                  color: 'var(--u-t)',
                  padding: '12px 14px',
                }}
              >
                <p style={{ fontSize: '13px', fontWeight: 500 }}>{errorMessage}</p>
                <div className="row" style={{ marginTop: '8px' }}>
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
              <div className="glass card empty" style={{ textAlign: 'center', padding: '32px 14px' }}>
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
                        const val = resolveProfileValue(canon);
                        setFieldValues((prev) => ({ ...prev, [field.id]: val }));
                        setSelectedIds((prev) => new Set(prev).add(field.id));
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

      {/* Body: Copy Tab (Manual 1-click copying) */}
      {activeTab === 'copy' && (
        <div className="pbody">
          <input
            className="in"
            type="search"
            placeholder="Search fields to copy..."
            value={copySearchQuery}
            onChange={(e) => setCopySearchQuery(e.target.value)}
          />

          <div className="stack" style={{ gap: '10px' }}>
            {[
              { label: 'Full Name', val: `${profile?.personal.firstName || ''} ${profile?.personal.lastName || ''}`.trim() },
              { label: 'First Name', val: profile?.personal.firstName || '' },
              { label: 'Last Name', val: profile?.personal.lastName || '' },
              { label: 'Email Address', val: profile?.personal.email || '' },
              { label: 'Phone Number', val: profile?.personal.phone || '' },
              { label: 'LinkedIn URL', val: profile?.links.linkedInUrl || '' },
              { label: 'GitHub URL', val: profile?.links.githubUrl || '' },
              { label: 'Portfolio URL', val: profile?.links.portfolioUrl || '' },
              { label: 'Street Address', val: profile?.address.addressLine1 || '' },
              { label: 'City, State, Zip', val: `${profile?.address.city || ''}, ${profile?.address.state || ''} ${profile?.address.postalCode || ''}`.trim() },
              { label: 'Current Company / Role', val: experienceList[0] ? `${experienceList[0].designation} at ${experienceList[0].companyName}` : '' },
              { label: 'College / Degree', val: educationList[0] ? `${educationList[0].degree} in ${educationList[0].branch || ''} (${educationList[0].institution})` : '' },
              { label: 'Notice Period', val: profile?.preferences.noticePeriodDays || 'Immediate' },
              { label: 'Key Skills', val: skillsList.map((s) => s.name).join(', ') },
            ]
              .filter(
                (item) =>
                  !copySearchQuery ||
                  item.label.toLowerCase().includes(copySearchQuery.toLowerCase()) ||
                  item.val.toLowerCase().includes(copySearchQuery.toLowerCase())
              )
              .map((item) => (
                <div key={item.label} className="fc">
                  <div className="fh">
                    <label>{item.label}</label>
                  </div>
                  <div className="vrow">
                    <input className="in" readOnly value={item.val} />
                    <Button
                      variant="soft"
                      size="sm"
                      onClick={() => copyToClipboard(item.label, item.val)}
                    >
                      {copiedKey === item.label ? 'Copied' : 'Copy'}
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </div>
      )}

      {/* Body: Resumes Tab */}
      {activeTab === 'resume' && (
        <div className="pbody">
          {resumes.length === 0 ? (
            <div className="glass card empty" style={{ textAlign: 'center', padding: '32px 14px' }}>
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
              <div className="glass card">
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
              <div className="glass card">
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
                      } catch {
                        setClGenerated('Failed to generate cover letter. Check settings or retry.');
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
                    <Pill variant="a">{clTone} Tone</Pill>
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
              <div className="glass card">
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
            <div className="glass card empty" style={{ textAlign: 'center', padding: '32px 14px' }}>
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
