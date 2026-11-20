import React, { useEffect, useState, useMemo } from 'react';
import {
  Briefcase,
  Scan,
  CheckCircle2,
  AlertCircle,
  Settings,
  Sparkles,
  FileText,
  Copy,
  Check,
  Edit2,
  RefreshCw,
  BookmarkPlus,
  HelpCircle,
  ClipboardList,
  Search,
  ArrowRight,
} from 'lucide-react';
import { DetectedField, WebsiteMetadata } from '../types/messaging';
import { ApplicationField, CANONICAL_FIELDS } from '../types/canonicalFields';
import { profileService } from '../services/profileService';
import { resumeService } from '../services/resumeService';
import { answerService } from '../services/answerService';
import { applicationService } from '../services/applicationService';
import { aiService } from '../services/ai/aiService';
import {
  UserProfile,
  ResumeRecord,
  SavedAnswer,
  EducationRecord,
  ExperienceRecord,
  SkillItem,
} from '../types/profile';

type TabType = 'autofill' | 'quickcopy' | 'resumes' | 'ai' | 'answers';

export const SidePanel: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabType>('autofill');
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [resumes, setResumes] = useState<ResumeRecord[]>([]);
  const [answers, setAnswers] = useState<SavedAnswer[]>([]);
  const [educationList, setEducationList] = useState<EducationRecord[]>([]);
  const [experienceList, setExperienceList] = useState<ExperienceRecord[]>([]);
  const [skillsList, setSkillsList] = useState<SkillItem[]>([]);

  // Scanning & Autofill state
  const [isScanning, setIsScanning] = useState(false);
  const [isFilling, setIsFilling] = useState(false);
  const [fields, setFields] = useState<DetectedField[]>([]);
  const [selectedFieldIds, setSelectedFieldIds] = useState<Set<string>>(new Set());
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [websiteInfo, setWebsiteInfo] = useState<WebsiteMetadata | null>(null);
  const [fillResults, setFillResults] = useState<{ total: number; success: number; failed: number } | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Quick Copy search query
  const [copySearchQuery, setCopySearchQuery] = useState('');

  // AI Copilot state
  const [customQuestion, setCustomQuestion] = useState('');
  const [aiAnswer, setAiAnswer] = useState<string>('');
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  // Application tracker quick save
  const [isSavedApp, setIsSavedApp] = useState(false);

  useEffect(() => {
    loadAllData();
  }, []);

  async function loadAllData() {
    try {
      const [p, r, a, edu, exp, sk] = await Promise.all([
        profileService.getProfile(),
        resumeService.getResumes(),
        answerService.getAnswers(),
        profileService.getEducation(),
        profileService.getExperience(),
        profileService.getSkills(),
      ]);
      setProfile(p);
      setResumes(r);
      setAnswers(a);
      setEducationList(edu);
      setExperienceList(exp);
      setSkillsList(sk);
    } catch (err) {
      console.error('Failed to load profile data', err);
    }
  }

  // Map canonical fields to profile values
  function resolveProfileValue(canonicalField?: string): string {
    if (!profile || !canonicalField) return '';
    switch (canonicalField) {
      case 'FIRST_NAME':
        return profile.personal.firstName;
      case 'LAST_NAME':
        return profile.personal.lastName;
      case 'FULL_NAME':
        return profile.personal.fullName || `${profile.personal.firstName} ${profile.personal.lastName}`.trim();
      case 'EMAIL':
        return profile.personal.email;
      case 'PHONE':
        return profile.personal.phone;
      case 'ADDRESS':
        return profile.address.addressLine1;
      case 'ADDRESS_LINE_2':
        return profile.address.addressLine2 || '';
      case 'CITY':
        return profile.address.city;
      case 'STATE':
        return profile.address.state;
      case 'COUNTRY':
        return profile.address.country;
      case 'ZIP_CODE':
        return profile.address.postalCode;
      case 'LINKEDIN_URL':
        return profile.links.linkedInUrl;
      case 'GITHUB_URL':
        return profile.links.githubUrl;
      case 'PORTFOLIO_URL':
        return profile.links.portfolioUrl || '';
      case 'COLLEGE':
        return educationList[0]?.institution || '';
      case 'DEGREE':
        return educationList[0]?.degree || '';
      case 'BRANCH':
        return educationList[0]?.branch || '';
      case 'CGPA':
        return educationList[0]?.cgpa || '';
      case 'GRADUATION_YEAR':
        return educationList[0]?.graduationYear || '';
      case 'EXPERIENCE':
        return experienceList[0]?.companyName ? `${experienceList.length} role(s)` : '';
      case 'SKILLS':
        return skillsList.map((s) => s.name).join(', ');
      case 'WORK_AUTHORIZATION':
        return profile.preferences.workAuthorizationStatus || 'Authorized to work';
      case 'RELOCATION':
        return profile.preferences.willingToRelocate ? 'Yes' : 'No';
      case 'NOTICE_PERIOD':
        return profile.preferences.noticePeriodDays || 'Immediate';
      case 'CURRENT_CTC':
        return profile.preferences.currentCompensation || '';
      case 'EXPECTED_CTC':
        return profile.preferences.expectedCompensation || '';
      case 'GENDER':
        return profile.personal.gender || '';
      case 'RACE_ETHNICITY':
        return profile.personal.race || '';
      default:
        return '';
    }
  }

  const handleScanForm = async () => {
    setIsScanning(true);
    setErrorMessage(null);
    setFillResults(null);

    try {
      if (typeof chrome === 'undefined' || !chrome.runtime) {
        // Mock fallback for browser / testing environment
        setTimeout(() => {
          const mockFields: DetectedField[] = [
            { id: 'jm-1', tagName: 'INPUT', fieldType: 'text', name: 'firstName', label: 'First Name', required: true, canonicalField: 'FIRST_NAME', confidence: 0.95, status: 'MATCHED' },
            { id: 'jm-2', tagName: 'INPUT', fieldType: 'text', name: 'lastName', label: 'Last Name', required: true, canonicalField: 'LAST_NAME', confidence: 0.95, status: 'MATCHED' },
            { id: 'jm-3', tagName: 'INPUT', fieldType: 'email', name: 'email', label: 'Email Address', required: true, canonicalField: 'EMAIL', confidence: 0.98, status: 'MATCHED' },
            { id: 'jm-4', tagName: 'INPUT', fieldType: 'tel', name: 'phone', label: 'Phone Number', required: true, canonicalField: 'PHONE', confidence: 0.92, status: 'MATCHED' },
            { id: 'jm-5', tagName: 'INPUT', fieldType: 'url', name: 'linkedin', label: 'LinkedIn Profile', required: false, canonicalField: 'LINKEDIN_URL', confidence: 0.9, status: 'MATCHED' },
            { id: 'jm-6', tagName: 'INPUT', fieldType: 'url', name: 'github', label: 'GitHub Profile', required: false, canonicalField: 'GITHUB_URL', confidence: 0.9, status: 'MATCHED' },
            { id: 'jm-7', tagName: 'INPUT', fieldType: 'file', name: 'resume', label: 'Resume / CV File', required: true, canonicalField: 'RESUME', confidence: 0.9, status: 'MATCHED' },
          ];
          processScannedFields(mockFields, {
            url: window.location.href,
            hostname: 'greenhouse.io',
            adapterName: 'Greenhouse Job Board',
            title: 'Senior Software Engineer Application',
          });
          setIsScanning(false);
        }, 600);
        return;
      }

      chrome.runtime.sendMessage({ type: 'SCAN_FORM' }, (response) => {
        setIsScanning(false);
        if (chrome.runtime.lastError) {
          const err = chrome.runtime.lastError.message || '';
          setErrorMessage(
            err.includes('Receiving end') || err.includes('connection')
              ? 'Could not connect to the active tab. Please refresh the webpage tab (F5) once and try again.'
              : err || 'Could not communicate with tab.'
          );
          return;
        }
        if (!response || !response.success) {
          setErrorMessage(response?.error || 'Failed to detect application fields.');
          return;
        }

        const scanData = response.data;
        processScannedFields(scanData.fields, scanData.website);
      });
    } catch (err) {
      setIsScanning(false);
      setErrorMessage((err as Error).message);
    }
  };

  const handleReloadPageAndScan = async () => {
    setErrorMessage(null);
    setIsScanning(true);
    try {
      if (typeof chrome !== 'undefined' && chrome.runtime) {
        await chrome.runtime.sendMessage({ type: 'RELOAD_ACTIVE_TAB' });
        setTimeout(() => {
          handleScanForm();
        }, 1500);
      }
    } catch {
      setIsScanning(false);
    }
  };

  function processScannedFields(scannedFields: DetectedField[], website?: WebsiteMetadata) {
    setFields(scannedFields);
    if (website) setWebsiteInfo(website);

    const values: Record<string, string> = {};
    const selected = new Set<string>();

    for (const f of scannedFields) {
      if (f.fieldType === 'file') continue;
      const val = resolveProfileValue(f.canonicalField);
      if (val) {
        values[f.id] = val;
        selected.add(f.id);
      }
    }

    setFieldValues(values);
    setSelectedFieldIds(selected);
  }

  const handleToggleField = (id: string) => {
    setSelectedFieldIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Manual Mapping for unrecognized fields
  const handleMapField = (fieldId: string, canonical: ApplicationField | '') => {
    if (!canonical) return;
    const value = resolveProfileValue(canonical);

    setFields((prev) =>
      prev.map((f) => {
        if (f.id === fieldId) {
          return {
            ...f,
            canonicalField: canonical,
            status: 'MATCHED',
            confidence: 1.0,
          };
        }
        return f;
      })
    );

    setFieldValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    setSelectedFieldIds((prev) => new Set([...prev, fieldId]));
  };

  const handleFillFields = async (onlySelected: boolean) => {
    setIsFilling(true);
    setErrorMessage(null);

    const toFill: Record<string, string> = {};
    fields.forEach((f) => {
      if (f.fieldType === 'file') return;
      if (!onlySelected || selectedFieldIds.has(f.id)) {
        if (fieldValues[f.id] !== undefined) {
          toFill[f.id] = fieldValues[f.id];
        }
      }
    });

    if (Object.keys(toFill).length === 0) {
      setIsFilling(false);
      setErrorMessage('No valid matched fields selected to fill.');
      return;
    }

    if (typeof chrome === 'undefined' || !chrome.runtime) {
      setTimeout(() => {
        setIsFilling(false);
        setFillResults({
          total: Object.keys(toFill).length,
          success: Object.keys(toFill).length,
          failed: 0,
        });
      }, 500);
      return;
    }

    chrome.runtime.sendMessage({ type: 'FILL_FIELDS', values: toFill }, (response) => {
      setIsFilling(false);
      if (chrome.runtime.lastError || !response || !response.success) {
        setErrorMessage(response?.error || 'Failed to fill fields on the page.');
        return;
      }
      setFillResults(response.data.summary);
    });
  };

  const handleGenerateAnswer = async () => {
    if (!customQuestion.trim() || !profile) return;
    setIsGeneratingAi(true);
    try {
      const projects = await profileService.getExperience();
      const res = await aiService.generateAnswer(customQuestion, profile, [], projects, []);
      setAiAnswer(res.answer);
    } catch (err) {
      setErrorMessage('AI generation error: ' + (err as Error).message);
    } finally {
      setIsGeneratingAi(false);
    }
  };

  const handleCopy = (text: string, key: string) => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleQuickSaveApplication = async () => {
    const title = websiteInfo?.title || 'Job Application';
    const company = websiteInfo?.hostname.replace('.com', '').replace('boards.', '') || 'Company';

    await applicationService.saveApplication({
      id: `app-${Date.now()}`,
      companyName: company.charAt(0).toUpperCase() + company.slice(1),
      jobTitle: title,
      jobUrl: websiteInfo?.url || window.location.href,
      applicationDate: new Date().toISOString(),
      status: 'Applied',
      notes: 'Logged via JobMate Side Panel Copilot',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    setIsSavedApp(true);
    setTimeout(() => setIsSavedApp(false), 3000);
  };

  const openOptions = () => {
    if (typeof chrome !== 'undefined' && chrome.runtime?.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open('options.html', '_blank');
    }
  };

  // Build full profile key-value catalogue for Quick Copy tab
  const quickCopyCatalog = useMemo(() => {
    if (!profile) return [];
    return [
      {
        category: 'Personal Details',
        items: [
          { label: 'Full Name', value: profile.personal.fullName || `${profile.personal.firstName} ${profile.personal.lastName}`.trim() },
          { label: 'First Name', value: profile.personal.firstName },
          { label: 'Last Name', value: profile.personal.lastName },
          { label: 'Email Address', value: profile.personal.email },
          { label: 'Phone Number', value: profile.personal.phone },
          { label: 'Date of Birth', value: profile.personal.dateOfBirth || '' },
          { label: 'Gender', value: profile.personal.gender || '' },
          { label: 'Race / Ethnicity', value: profile.personal.race || '' },
        ],
      },
      {
        category: 'Address Details',
        items: [
          { label: 'Street Address', value: profile.address.addressLine1 },
          { label: 'City', value: profile.address.city },
          { label: 'State / Province', value: profile.address.state },
          { label: 'Postal / Zip Code', value: profile.address.postalCode },
          { label: 'Country', value: profile.address.country },
        ],
      },
      {
        category: 'Professional Links',
        items: [
          { label: 'LinkedIn Profile', value: profile.links.linkedInUrl },
          { label: 'GitHub Profile', value: profile.links.githubUrl },
          { label: 'Portfolio / Website', value: profile.links.portfolioUrl || '' },
        ],
      },
      {
        category: 'Education',
        items: [
          { label: 'College / University', value: educationList[0]?.institution || '' },
          { label: 'Degree', value: educationList[0]?.degree || '' },
          { label: 'Branch / Specialization', value: educationList[0]?.branch || '' },
          { label: 'CGPA / Percentage', value: educationList[0]?.cgpa || '' },
          { label: 'Graduation Year', value: educationList[0]?.graduationYear || '' },
        ],
      },
      {
        category: 'Employment Preferences',
        items: [
          { label: 'Notice Period', value: profile.preferences.noticePeriodDays || 'Immediate' },
          { label: 'Expected Compensation', value: profile.preferences.expectedCompensation || '' },
          { label: 'Work Authorization', value: profile.preferences.workAuthorizationStatus || 'Authorized to work' },
          { label: 'Willing to Relocate', value: profile.preferences.willingToRelocate ? 'Yes' : 'No' },
          { label: 'Key Skills', value: skillsList.map((s) => s.name).join(', ') },
        ],
      },
    ];
  }, [profile, educationList, skillsList]);

  // Stats
  const matchedCount = useMemo(() => fields.filter((f) => f.status === 'MATCHED').length, [fields]);
  const reviewCount = useMemo(() => fields.filter((f) => f.status === 'NEEDS_REVIEW').length, [fields]);
  const unmatchedCount = useMemo(() => fields.filter((f) => f.status === 'UNMATCHED').length, [fields]);

  return (
    <div className="flex flex-col h-screen bg-slate-50 text-slate-900 font-sans text-xs select-none">
      {/* Header */}
      <header className="bg-white border-b border-slate-200 px-3.5 py-2.5 flex items-center justify-between shrink-0 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Briefcase className="w-4 h-4" />
          </div>
          <div>
            <h1 className="font-bold text-slate-800 text-sm tracking-tight leading-none">JobMate</h1>
            <span className="text-[10px] text-slate-500 font-medium">Application Copilot</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5">
          {websiteInfo && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 truncate max-w-[120px]">
              {websiteInfo.adapterName}
            </span>
          )}
          <button
            onClick={openOptions}
            title="Options & Profile"
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition"
          >
            <Settings className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
      <nav className="flex border-b border-slate-200 bg-white px-1.5 shrink-0">
        <button
          onClick={() => setActiveTab('autofill')}
          className={`flex-1 py-2 text-center font-medium border-b-2 text-[11px] flex items-center justify-center gap-1 transition ${
            activeTab === 'autofill'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          <Scan className="w-3.5 h-3.5" />
          Autofill
        </button>
        <button
          onClick={() => setActiveTab('quickcopy')}
          className={`flex-1 py-2 text-center font-medium border-b-2 text-[11px] flex items-center justify-center gap-1 transition ${
            activeTab === 'quickcopy'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          <ClipboardList className="w-3.5 h-3.5 text-indigo-600" />
          Quick Copy
        </button>
        <button
          onClick={() => setActiveTab('resumes')}
          className={`flex-1 py-2 text-center font-medium border-b-2 text-[11px] flex items-center justify-center gap-1 transition ${
            activeTab === 'resumes'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          <FileText className="w-3.5 h-3.5" />
          Resumes ({resumes.length})
        </button>
        <button
          onClick={() => setActiveTab('ai')}
          className={`flex-1 py-2 text-center font-medium border-b-2 text-[11px] flex items-center justify-center gap-1 transition ${
            activeTab === 'ai'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          <Sparkles className="w-3.5 h-3.5 text-indigo-500" />
          AI
        </button>
        <button
          onClick={() => setActiveTab('answers')}
          className={`flex-1 py-2 text-center font-medium border-b-2 text-[11px] flex items-center justify-center gap-1 transition ${
            activeTab === 'answers'
              ? 'border-indigo-600 text-indigo-600 font-semibold'
              : 'border-transparent text-slate-600 hover:text-slate-800'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5" />
          Answers
        </button>
      </nav>

      {/* Main Content Area */}
      <main className="flex-1 overflow-y-auto p-3 space-y-3">
        {/* Error Alert Banner */}
        {errorMessage && (
          <div className="p-2.5 rounded-lg bg-rose-50 border border-rose-200 text-rose-800 flex items-start gap-2 text-[11px]">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Notice</span>
              <p>{errorMessage}</p>
              {errorMessage.toLowerCase().includes('refresh') && (
                <button
                  onClick={handleReloadPageAndScan}
                  className="mt-2 inline-flex items-center gap-1.5 px-2.5 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium transition-colors text-[10.5px] shadow-sm"
                >
                  <RefreshCw className="w-3 h-3" />
                  Refresh Webpage & Scan
                </button>
              )}
            </div>
          </div>
        )}

        {/* Fill Result Notification */}
        {fillResults && (
          <div className="p-2.5 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-900 flex items-center justify-between text-[11px]">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>
                Filled <strong>{fillResults.success}</strong> of {fillResults.total} fields successfully!
              </span>
            </div>
            <button
              onClick={() => setFillResults(null)}
              className="text-emerald-700 hover:underline font-medium text-[10px]"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* TAB 1: AUTOFILL */}
        {activeTab === 'autofill' && (
          <div className="space-y-3">
            {/* Scan Action Card */}
            <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-sm space-y-2.5">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-800 text-xs">Form Detection</h3>
                  <p className="text-[11px] text-slate-500">Scan page to identify fillable application inputs</p>
                </div>
                <button
                  onClick={handleScanForm}
                  disabled={isScanning}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition active:scale-95"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanning ? 'animate-spin' : ''}`} />
                  {isScanning ? 'Scanning...' : 'Scan Form'}
                </button>
              </div>

              {/* Statistics Counters */}
              {fields.length > 0 && (
                <div className="grid grid-cols-4 gap-1.5 pt-2 border-t border-slate-100 text-center">
                  <div className="bg-slate-50 p-1.5 rounded-lg">
                    <span className="block text-[10px] text-slate-500 font-medium">Total</span>
                    <strong className="text-xs text-slate-800">{fields.length}</strong>
                  </div>
                  <div className="bg-emerald-50/70 p-1.5 rounded-lg border border-emerald-100">
                    <span className="block text-[10px] text-emerald-600 font-medium">Matched</span>
                    <strong className="text-xs text-emerald-700">{matchedCount}</strong>
                  </div>
                  <div className="bg-amber-50/70 p-1.5 rounded-lg border border-amber-100">
                    <span className="block text-[10px] text-amber-600 font-medium">Review</span>
                    <strong className="text-xs text-amber-700">{reviewCount}</strong>
                  </div>
                  <div className="bg-slate-100/60 p-1.5 rounded-lg">
                    <span className="block text-[10px] text-slate-400 font-medium">Unknown</span>
                    <strong className="text-xs text-slate-600">{unmatchedCount}</strong>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Copy Fallback Banner */}
            <div className="bg-indigo-50/70 border border-indigo-100 rounded-xl p-2.5 flex items-center justify-between text-[11px]">
              <div className="flex items-center gap-2 text-indigo-900">
                <ClipboardList className="w-4 h-4 text-indigo-600 shrink-0" />
                <span>Need to copy fields manually?</span>
              </div>
              <button
                onClick={() => setActiveTab('quickcopy')}
                className="text-indigo-600 hover:text-indigo-800 font-bold flex items-center gap-0.5 text-[11px]"
              >
                <span>Quick Copy</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            {/* Field Inspection Checklist */}
            {fields.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between px-1">
                  <span className="text-[11px] font-semibold text-slate-600 uppercase tracking-wider">
                    Detected Fields ({fields.length})
                  </span>
                  <div className="flex gap-2 text-[11px]">
                    <button
                      onClick={() => setSelectedFieldIds(new Set(fields.map((f) => f.id)))}
                      className="text-indigo-600 hover:underline"
                    >
                      Select All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button onClick={() => setSelectedFieldIds(new Set())} className="text-slate-500 hover:underline">
                      Clear
                    </button>
                  </div>
                </div>

                <div className="space-y-2">
                  {fields.map((field) => {
                    const isSelected = selectedFieldIds.has(field.id);
                    const isEditing = editingFieldId === field.id;
                    const currentValue = fieldValues[field.id] || '';

                    return (
                      <div
                        key={field.id}
                        className={`p-2.5 rounded-xl border bg-white transition ${
                          isSelected ? 'border-indigo-300 shadow-xs' : 'border-slate-200/80 opacity-90'
                        }`}
                      >
                        <div className="flex items-start gap-2.5">
                          {field.fieldType !== 'file' ? (
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => handleToggleField(field.id)}
                              className="mt-1 rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                            />
                          ) : (
                            <FileText className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" />
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-1 mb-0.5">
                              <span className="font-semibold text-slate-800 text-[11px] truncate" title={field.label}>
                                {field.label}
                                {field.required && <span className="text-rose-500 ml-0.5">*</span>}
                              </span>

                              {field.canonicalField ? (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-indigo-50 text-indigo-600 border border-indigo-100 shrink-0">
                                  {field.canonicalField}
                                </span>
                              ) : (
                                <span className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-slate-100 text-slate-500 shrink-0">
                                  Unmatched
                                </span>
                              )}
                            </div>

                            {/* Dropdown to manually map unrecognized fields */}
                            {!field.canonicalField && (
                              <div className="my-1">
                                <select
                                  onChange={(e) => handleMapField(field.id, e.target.value as ApplicationField)}
                                  className="w-full text-[10px] p-1 border border-indigo-200 rounded bg-indigo-50/50 text-indigo-900 font-medium"
                                  defaultValue=""
                                >
                                  <option value="" disabled>
                                    ⚡ Map this field to your profile...
                                  </option>
                                  {Object.values(CANONICAL_FIELDS).map((def) => (
                                    <option key={def.id} value={def.id}>
                                      {def.displayLabel}
                                    </option>
                                  ))}
                                </select>
                              </div>
                            )}

                            {/* Proposed Autofill Value */}
                            {field.fieldType === 'file' ? (
                              <p className="text-[11px] text-indigo-600 font-medium">
                                Resume upload input detected. Switch to Resumes tab to prepare file.
                              </p>
                            ) : isEditing ? (
                              <div className="mt-1 flex gap-1">
                                <input
                                  type="text"
                                  value={currentValue}
                                  onChange={(e) =>
                                    setFieldValues({ ...fieldValues, [field.id]: e.target.value })
                                  }
                                  className="flex-1 px-2 py-1 text-xs border border-indigo-300 rounded focus:outline-indigo-500"
                                  autoFocus
                                />
                                <button
                                  onClick={() => setEditingFieldId(null)}
                                  className="px-2 py-1 bg-indigo-600 text-white rounded text-[10px] font-medium"
                                >
                                  Save
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center justify-between mt-1 bg-slate-50 px-2 py-1 rounded border border-slate-100 text-[11px]">
                                <span
                                  className={`truncate mr-2 ${
                                    currentValue ? 'text-slate-800 font-medium' : 'text-slate-400 italic'
                                  }`}
                                >
                                  {currentValue || 'No value assigned'}
                                </span>
                                <div className="flex items-center gap-1 shrink-0">
                                  <button
                                    onClick={() => setEditingFieldId(field.id)}
                                    title="Edit value before filling"
                                    className="p-0.5 text-slate-400 hover:text-indigo-600 rounded"
                                  >
                                    <Edit2 className="w-3 h-3" />
                                  </button>
                                  {currentValue && (
                                    <button
                                      onClick={() => handleCopy(currentValue, field.id)}
                                      title="Copy value"
                                      className="p-1 text-slate-400 hover:text-indigo-600 rounded flex items-center gap-0.5 text-[9px] font-semibold"
                                    >
                                      {copiedKey === field.id ? (
                                        <span className="text-emerald-600 font-bold">✓ Copied</span>
                                      ) : (
                                        <>
                                          <Copy className="w-3 h-3" /> Copy
                                        </>
                                      )}
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : (
              <div className="bg-white border border-slate-200/90 rounded-xl p-6 text-center shadow-xs">
                <Scan className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                <h4 className="font-semibold text-slate-700 text-xs mb-1">No Form Scanned Yet</h4>
                <p className="text-[11px] text-slate-500 mb-3 max-w-[200px] mx-auto">
                  Click 'Scan Form' while on a job application page to detect all form inputs.
                </p>
                <button
                  onClick={handleScanForm}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg inline-flex items-center gap-1.5 shadow-sm transition"
                >
                  <RefreshCw className="w-3 h-3" />
                  Scan Now
                </button>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: QUICK COPY (MANUAL COPY / PASTE CATALOG) */}
        {activeTab === 'quickcopy' && (
          <div className="space-y-3">
            <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs space-y-2.5">
              <div>
                <h3 className="font-semibold text-slate-800 text-xs">📋 1-Click Profile Copy</h3>
                <p className="text-[11px] text-slate-500">
                  Easily copy any of your profile details with 1 click to paste into forms that don't allow automatic scanning.
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  placeholder="Filter fields e.g. Phone, Email, Address..."
                  value={copySearchQuery}
                  onChange={(e) => setCopySearchQuery(e.target.value)}
                  className="w-full pl-8 pr-2.5 py-1.5 text-[11px] border border-slate-300 rounded-lg focus:outline-indigo-500"
                />
              </div>

              {/* Catalog Groups */}
              <div className="space-y-3 pt-1">
                {quickCopyCatalog.map((group) => {
                  const filteredItems = group.items.filter((item) =>
                    !copySearchQuery
                      ? true
                      : item.label.toLowerCase().includes(copySearchQuery.toLowerCase()) ||
                        item.value.toLowerCase().includes(copySearchQuery.toLowerCase())
                  );

                  if (filteredItems.length === 0) return null;

                  return (
                    <div key={group.category} className="space-y-1.5">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                        {group.category}
                      </span>
                      <div className="space-y-1">
                        {filteredItems.map((item) => (
                          <div
                            key={item.label}
                            className="p-2 bg-slate-50 hover:bg-indigo-50/40 border border-slate-200/90 rounded-lg flex items-center justify-between gap-2 transition"
                          >
                            <div className="min-w-0 flex-1">
                              <span className="text-[10px] text-slate-500 block leading-tight font-medium">
                                {item.label}
                              </span>
                              <span
                                className={`text-[11px] font-semibold truncate block ${
                                  item.value ? 'text-slate-800' : 'text-slate-400 italic'
                                }`}
                              >
                                {item.value || 'Not configured in profile'}
                              </span>
                            </div>

                            {item.value && (
                              <button
                                onClick={() => handleCopy(item.value, item.label)}
                                className="px-2 py-1 rounded bg-white hover:bg-indigo-600 hover:text-white border border-slate-200 text-slate-700 text-[10px] font-semibold flex items-center gap-1 shrink-0 shadow-2xs transition active:scale-95"
                              >
                                {copiedKey === item.label ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-600" />
                                    <span>Copied!</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Copy</span>
                                  </>
                                )}
                              </button>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 3: RESUMES */}
        {activeTab === 'resumes' && (
          <div className="space-y-3">
            <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs">
              <h3 className="font-semibold text-slate-800 text-xs mb-1">Saved Resumes</h3>
              <p className="text-[11px] text-slate-500 mb-3">
                Select a resume below to download and prepare it for upload into the job form.
              </p>

              {resumes.length > 0 ? (
                <div className="space-y-2">
                  {resumes.map((resume) => (
                    <div
                      key={resume.id}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 flex items-center justify-between"
                    >
                      <div className="min-w-0 pr-2">
                        <div className="flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                          <span className="font-semibold text-slate-800 truncate text-[11px]">
                            {resume.name}
                          </span>
                          {resume.isDefault && (
                            <span className="px-1.5 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800 font-bold shrink-0">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">
                          {resume.fileName} • {(resume.fileSize / 1024).toFixed(1)} KB
                        </p>
                      </div>

                      <button
                        onClick={() => {
                          if (resume.blobData) {
                            const url = URL.createObjectURL(resume.blobData);
                            const a = document.createElement('a');
                            a.href = url;
                            a.download = resume.fileName;
                            a.click();
                            URL.revokeObjectURL(url);
                          }
                        }}
                        className="px-2.5 py-1 bg-white hover:bg-slate-100 border border-slate-200 rounded text-slate-700 font-medium text-[10px] shrink-0 shadow-2xs"
                      >
                        Download
                      </button>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <p className="text-[11px] text-slate-500 mb-2">No resumes saved yet.</p>
                  <button
                    onClick={openOptions}
                    className="text-indigo-600 hover:underline font-semibold text-xs"
                  >
                    Upload Resume in Settings
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: AI COPILOT */}
        {activeTab === 'ai' && (
          <div className="space-y-3">
            <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs space-y-2.5">
              <div className="flex items-center gap-1.5 text-indigo-700 font-semibold text-xs">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                <span>AI Application Q&A Generator</span>
              </div>
              <p className="text-[11px] text-slate-500">
                Generate factual, tailored answers grounded in your real profile and projects.
              </p>

              <div>
                <label className="block text-[11px] font-medium text-slate-700 mb-1">
                  Application Question:
                </label>
                <textarea
                  value={customQuestion}
                  onChange={(e) => setCustomQuestion(e.target.value)}
                  placeholder="e.g., Why do you believe you are a strong fit for this engineering role?"
                  rows={3}
                  className="w-full text-xs p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <button
                onClick={handleGenerateAnswer}
                disabled={isGeneratingAi || !customQuestion.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition"
              >
                <Sparkles className="w-3.5 h-3.5" />
                {isGeneratingAi ? 'Synthesizing Answer...' : 'Draft Grounded Answer'}
              </button>

              {aiAnswer && (
                <div className="pt-2 border-t border-slate-100 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-slate-700 text-[11px]">Proposed Answer:</span>
                    <button
                      onClick={() => handleCopy(aiAnswer, 'ai-answer')}
                      className="text-indigo-600 hover:text-indigo-800 flex items-center gap-1 text-[10px] font-medium"
                    >
                      {copiedKey === 'ai-answer' ? (
                        <>
                          <Check className="w-3 h-3 text-emerald-600" /> Copied!
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                  <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200 text-[11px] text-slate-800 leading-relaxed whitespace-pre-wrap">
                    {aiAnswer}
                  </div>
                  <p className="text-[9px] text-slate-400 italic">
                    Review and verify before pasting into the application form.
                  </p>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: ANSWER BANK */}
        {activeTab === 'answers' && (
          <div className="space-y-3">
            <div className="bg-white border border-slate-200/90 rounded-xl p-3 shadow-xs space-y-2">
              <h3 className="font-semibold text-slate-800 text-xs">Reusable Answer Bank</h3>
              <p className="text-[11px] text-slate-500">Quickly copy your pre-written answers.</p>

              {answers.length > 0 ? (
                <div className="space-y-2 max-h-96 overflow-y-auto">
                  {answers.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg border border-slate-200 bg-slate-50/50 space-y-1.5"
                    >
                      <div className="flex items-start justify-between gap-1">
                        <span className="font-semibold text-slate-800 text-[11px] leading-tight">
                          {item.question}
                        </span>
                        <button
                          onClick={() => handleCopy(item.answer, item.id)}
                          title="Copy Answer"
                          className="p-1 text-slate-400 hover:text-indigo-600 rounded shrink-0"
                        >
                          {copiedKey === item.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      </div>
                      <p className="text-[10px] text-slate-600 line-clamp-3 bg-white p-1.5 rounded border border-slate-100">
                        {item.answer}
                      </p>
                      <div className="flex items-center gap-1">
                        <span className="px-1.5 py-0.2 rounded text-[9px] bg-indigo-50 text-indigo-700 font-medium">
                          {item.category}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-4 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                  <p className="text-[11px] text-slate-500 mb-2">No answers saved in bank.</p>
                  <button onClick={openOptions} className="text-indigo-600 hover:underline font-semibold text-xs">
                    Add in Settings Dashboard
                  </button>
                </div>
              )}
            </div>
          </div>
        )}
      </main>

      {/* Footer Toolbar */}
      {activeTab === 'autofill' && fields.length > 0 && (
        <footer className="bg-white border-t border-slate-200 p-2.5 shrink-0 space-y-2 shadow-xs">
          <div className="flex gap-2">
            <button
              onClick={() => handleFillFields(true)}
              disabled={isFilling || selectedFieldIds.size === 0}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white font-medium text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              {isFilling ? 'Filling...' : `Fill Selected (${selectedFieldIds.size})`}
            </button>
            <button
              onClick={() => handleFillFields(false)}
              disabled={isFilling}
              className="flex-1 bg-slate-800 hover:bg-slate-900 disabled:opacity-50 text-white font-medium text-xs py-2 rounded-lg flex items-center justify-center gap-1.5 shadow-sm transition active:scale-98"
            >
              <span>Fill All Matched</span>
            </button>
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-slate-500 border-t border-slate-100">
            <button
              onClick={handleQuickSaveApplication}
              disabled={isSavedApp}
              className="text-indigo-600 hover:text-indigo-800 font-medium flex items-center gap-1"
            >
              <BookmarkPlus className="w-3.5 h-3.5" />
              {isSavedApp ? 'Saved to Tracker!' : 'Save to Application Tracker'}
            </button>
            <span className="text-[10px] text-slate-400">Review before submitting</span>
          </div>
        </footer>
      )}
    </div>
  );
};
