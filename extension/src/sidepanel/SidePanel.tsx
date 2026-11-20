import React, { useEffect, useState } from 'react';
import { Backdrop } from '../components/ui/Backdrop';
import { Button } from '../components/ui/Button';
import { Pill } from '../components/ui/Pill';
import { ApplyMateLogo } from '../components/ui/ApplyMateLogo';
import { DetectedField, WebsiteMetadata } from '../types/messaging';
import { CANONICAL_FIELDS, ApplicationField } from '../types/canonicalFields';
import { profileService } from '../services/profileService';
import { resumeService } from '../services/resumeService';
import { answerService } from '../services/answerService';
import { projectService } from '../services/projectService';
import { aiService } from '../services/ai/aiService';
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

  // Copy tab state
  const [copySearchQuery, setCopySearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadAllData();
  }, []);

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
    if (site) setWebsiteInfo(site);

    const activeProfile = customProfile || profile;
    const activeEdu = customEdu || educationList;

    const values: Record<string, string> = {};
    const selected = new Set<string>();

    scanned.forEach((f) => {
      let val = '';
      if (f.canonicalField && activeProfile) {
        val = resolveProfileValue(f.canonicalField, activeProfile, activeEdu);
      }
      if (f.options && f.options.length > 0 && !val) {
        val = f.options[0].value;
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
        return `${p.personal.firstName || ''} ${p.personal.lastName || ''}`.trim();
      case 'EMAIL':
        return p.personal.email || '';
      case 'PHONE':
        return p.personal.phone || '';
      case 'ADDRESS':
        return p.address.addressLine1 || '';
      case 'CITY':
        return p.address.city || '';
      case 'STATE':
        return p.address.state || '';
      case 'ZIP_CODE':
        return p.address.postalCode || '';
      case 'COUNTRY':
        return p.address.country || '';
      case 'LINKEDIN_URL':
        return p.links.linkedInUrl || '';
      case 'GITHUB_URL':
        return p.links.githubUrl || '';
      case 'PORTFOLIO_URL':
        return p.links.portfolioUrl || '';
      case 'COLLEGE':
        return edu[0]?.institution || '';
      case 'DEGREE':
        return edu[0]?.degree || '';
      case 'CGPA':
        return edu[0]?.cgpa || '';
      case 'NOTICE_PERIOD':
        return p.preferences.noticePeriodDays || 'Immediate';
      case 'EXPECTED_CTC':
        return p.preferences.expectedCompensation || '';
      case 'CURRENT_CTC':
        return p.preferences.currentCompensation || '';
      case 'GENDER':
        return p.personal.gender || '';
      case 'RACE_ETHNICITY':
        return p.personal.race || '';
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
          <ApplyMateLogo size={28} />
          <span style={{ fontWeight: 700, fontSize: '17px' }}>ApplyMate</span>
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
              const isLongText = field.fieldType === 'textarea' || (field.label || '').length > 35;
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

                  {/* Choice questions (radio / checkbox) */}
                  {isChoice ? (
                    <div className="choice" role="group" aria-label={field.label}>
                      {field.options!.map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          aria-pressed={fieldValues[field.id] === opt.value}
                          onClick={() => {
                            setFieldValues((prev) => ({ ...prev, [field.id]: opt.value }));
                            setSelectedIds((prev) => new Set(prev).add(field.id));
                          }}
                        >
                          {opt.label}
                        </button>
                      ))}
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
