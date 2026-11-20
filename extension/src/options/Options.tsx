import React, { useState, useEffect } from 'react';
import {
  Briefcase,
  User,
  GraduationCap,
  Award,
  Layers,
  FileText,
  FolderGit2,
  HelpCircle,
  Clock,
  Settings,
  Plus,
  Trash2,
  Edit2,
  Check,
  Download,
  Upload,
  Search,
  BarChart3,
  Copy,
  X,
  ExternalLink,
} from 'lucide-react';

import { profileService } from '../services/profileService';
import { resumeService } from '../services/resumeService';
import { projectService } from '../services/projectService';
import { answerService } from '../services/answerService';
import { applicationService, ApplicationStats } from '../services/applicationService';
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
  ApplicationStatus,
  AppSettings,
  SkillCategory,
  AnswerCategory,
} from '../types/profile';

type NavSection =
  | 'overview'
  | 'profile'
  | 'education'
  | 'experience'
  | 'skills'
  | 'resumes'
  | 'projects'
  | 'answers'
  | 'applications'
  | 'settings';

const COUNTRY_CODES = [
  { code: '+91', country: 'India (+91)' },
  { code: '+1', country: 'US / Canada (+1)' },
  { code: '+44', country: 'UK (+44)' },
  { code: '+61', country: 'Australia (+61)' },
  { code: '+49', country: 'Germany (+49)' },
  { code: '+971', country: 'UAE (+971)' },
  { code: '+65', country: 'Singapore (+65)' },
  { code: '+353', country: 'Ireland (+353)' },
  { code: '+31', country: 'Netherlands (+31)' },
  { code: '+33', country: 'France (+33)' },
  { code: '+41', country: 'Switzerland (+41)' },
  { code: '+81', country: 'Japan (+81)' },
];

const POPULAR_COUNTRIES = [
  'India',
  'United States',
  'United Kingdom',
  'Canada',
  'Germany',
  'Australia',
  'Singapore',
  'United Arab Emirates',
  'Netherlands',
  'Ireland',
  'France',
  'Switzerland',
];

const POPULAR_STATES = [
  'Uttar Pradesh',
  'Delhi',
  'Maharashtra',
  'Karnataka',
  'Telangana',
  'Tamil Nadu',
  'Haryana',
  'Gujarat',
  'West Bengal',
  'California',
  'New York',
  'Texas',
  'Washington',
  'Massachusetts',
  'Illinois',
];

const NOTICE_PERIOD_SUGGESTIONS = [
  'Immediate / 0 Days',
  '15 Days',
  '30 Days',
  '60 Days',
  '90 Days',
  'Serving Notice (15 Days left)',
];

const SKILL_SUGGESTIONS: Record<SkillCategory, string[]> = {
  languages: ['JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'Go', 'SQL', 'HTML/CSS', 'Rust', 'PHP'],
  frameworks: ['React', 'Next.js', 'Node.js', 'Express.js', 'Spring Boot', 'Tailwind CSS', 'Django', 'Vue.js', 'FastAPI'],
  databases: ['PostgreSQL', 'MongoDB', 'MySQL', 'Redis', 'Supabase', 'DynamoDB', 'SQLite'],
  cloud: ['Docker', 'Kubernetes', 'AWS', 'Google Cloud (GCP)', 'CI/CD', 'Git & GitHub', 'Linux', 'Terraform'],
  developerTools: ['Git', 'VS Code', 'Postman', 'Vite', 'Webpack', 'Jira', 'Figma', 'npm / pnpm'],
  ai: ['OpenAI API', 'Google Gemini API', 'LangChain', 'Prompt Engineering', 'PyTorch', 'RAG', 'Hugging Face'],
  other: ['RESTful APIs', 'Microservices', 'System Design', 'Agile / Scrum', 'Unit Testing'],
};

export const Options: React.FC = () => {
  const [activeNav, setActiveNav] = useState<NavSection>('overview');
  const [saveToast, setSaveToast] = useState<string | null>(null);

  // Core Data States
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [educationList, setEducationList] = useState<EducationRecord[]>([]);
  const [experienceList, setExperienceList] = useState<ExperienceRecord[]>([]);
  const [skillsList, setSkillsList] = useState<SkillItem[]>([]);
  const [resumeList, setResumeList] = useState<ResumeRecord[]>([]);
  const [projectList, setProjectList] = useState<ProjectRecord[]>([]);
  const [answerList, setAnswerList] = useState<SavedAnswer[]>([]);
  const [applicationList, setApplicationList] = useState<ApplicationRecord[]>([]);
  const [appStats, setAppStats] = useState<ApplicationStats | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);

  // Phone Country Code state
  const [phoneCountryCode, setPhoneCountryCode] = useState('+91');
  const [phoneNumberOnly, setPhoneNumberOnly] = useState('');

  // Modals & Editing States
  const [educationModalOpen, setEducationModalOpen] = useState(false);
  const [editingEducation, setEditingEducation] = useState<EducationRecord | null>(null);

  const [experienceModalOpen, setExperienceModalOpen] = useState(false);
  const [editingExperience, setEditingExperience] = useState<ExperienceRecord | null>(null);

  const [projectModalOpen, setProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<ProjectRecord | null>(null);

  const [answerModalOpen, setAnswerModalOpen] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState<SavedAnswer | null>(null);

  const [applicationModalOpen, setApplicationModalOpen] = useState(false);
  const [editingApplication, setEditingApplication] = useState<ApplicationRecord | null>(null);

  // Quick Skill Bar
  const [newSkillName, setNewSkillName] = useState('');
  const [newSkillCategory, setNewSkillCategory] = useState<SkillCategory>('languages');
  const [answerSearchQuery, setAnswerSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    loadAllRecords();
  }, []);

  async function loadAllRecords() {
    try {
      const [p, edu, exp, sk, res, proj, ans, apps, stats, setts] = await Promise.all([
        profileService.getProfile(),
        profileService.getEducation(),
        profileService.getExperience(),
        profileService.getSkills(),
        resumeService.getResumes(),
        projectService.getProjects(),
        answerService.getAnswers(),
        applicationService.getApplications(),
        applicationService.getStats(),
        chromeStorageClient.getSettings(),
      ]);

      setProfile(p);
      setEducationList(edu);
      setExperienceList(exp);
      setSkillsList(sk);
      setResumeList(res);
      setProjectList(proj);
      setAnswerList(ans);
      setApplicationList(apps);
      setAppStats(stats);
      setSettings(setts);

      // Parse phone country code if present
      if (p.personal.phone) {
        const found = COUNTRY_CODES.find((c) => p.personal.phone.startsWith(c.code));
        if (found) {
          setPhoneCountryCode(found.code);
          setPhoneNumberOnly(p.personal.phone.slice(found.code.length).trim());
        } else {
          setPhoneNumberOnly(p.personal.phone);
        }
      }
    } catch (err) {
      console.error('Failed to load records in Options dashboard:', err);
    }
  }

  const triggerToast = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => setSaveToast(null), 3000);
  };

  // Profile Save
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!profile) return;

    // Combine country code with phone number
    const combinedPhone = phoneNumberOnly.trim()
      ? `${phoneCountryCode} ${phoneNumberOnly.trim()}`.trim()
      : '';

    const updatedProfile = {
      ...profile,
      personal: {
        ...profile.personal,
        phone: combinedPhone,
      },
    };

    await profileService.updateProfile(updatedProfile);
    setProfile(updatedProfile);
    triggerToast('Profile saved successfully!');
  };

  // ==========================================
  // EDUCATION HANDLERS
  // ==========================================
  const handleOpenAddEducation = () => {
    setEditingEducation({
      id: `edu-${Date.now()}`,
      institution: '',
      degree: '',
      branch: '',
      startYear: '',
      graduationYear: '',
      cgpa: '',
      coursework: '',
    });
    setEducationModalOpen(true);
  };

  const handleOpenEditEducation = (record: EducationRecord) => {
    setEditingEducation({ ...record });
    setEducationModalOpen(true);
  };

  const handleSaveEducationModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEducation) return;
    const saved = await profileService.saveEducation(editingEducation);
    const updated = await profileService.getEducation();
    setEducationList(updated);
    setEducationModalOpen(false);
    setEditingEducation(null);
    triggerToast(`Education at ${saved.institution} saved!`);
  };

  const handleDeleteEducation = async (id: string) => {
    await profileService.deleteEducation(id);
    setEducationList(educationList.filter((e) => e.id !== id));
    triggerToast('Education record removed');
  };

  // ==========================================
  // EXPERIENCE HANDLERS
  // ==========================================
  const handleOpenAddExperience = () => {
    setEditingExperience({
      id: `exp-${Date.now()}`,
      companyName: '',
      designation: '',
      employmentType: 'Full-time',
      startDate: '',
      endDate: '',
      currentlyWorking: true,
      description: '',
      technologies: [],
    });
    setExperienceModalOpen(true);
  };

  const handleOpenEditExperience = (record: ExperienceRecord) => {
    setEditingExperience({ ...record });
    setExperienceModalOpen(true);
  };

  const handleSaveExperienceModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExperience) return;
    const saved = await profileService.saveExperience(editingExperience);
    const updated = await profileService.getExperience();
    setExperienceList(updated);
    setExperienceModalOpen(false);
    setEditingExperience(null);
    triggerToast(`Experience at ${saved.companyName} saved!`);
  };

  const handleDeleteExperience = async (id: string) => {
    await profileService.deleteExperience(id);
    setExperienceList(experienceList.filter((e) => e.id !== id));
    triggerToast('Experience record removed');
  };

  // ==========================================
  // SKILLS HANDLERS
  // ==========================================
  const handleAddSkillDirect = async (name: string, category: SkillCategory) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    if (skillsList.some((s) => s.name.toLowerCase() === trimmed.toLowerCase())) {
      triggerToast(`${trimmed} is already in your skills!`);
      return;
    }
    const item: SkillItem = {
      id: `skill-${Date.now()}-${Math.random().toString(36).substring(2, 5)}`,
      name: trimmed,
      category,
      proficiency: 'Advanced',
    };
    const saved = await profileService.saveSkill(item);
    setSkillsList([...skillsList, saved]);
    triggerToast(`Added ${saved.name}`);
  };

  const handleDeleteSkill = async (id: string) => {
    await profileService.deleteSkill(id);
    setSkillsList(skillsList.filter((s) => s.id !== id));
  };

  // ==========================================
  // RESUME HANDLERS
  // ==========================================
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const saved = await resumeService.saveResume(file, file.name.replace(/\.[^/.]+$/, ''));
      setResumeList([...resumeList, saved]);
      triggerToast('Resume uploaded and stored locally in IndexedDB!');
    } catch (err) {
      alert('Failed to save resume: ' + (err as Error).message);
    }
  };

  const handleSetDefaultResume = async (id: string) => {
    await resumeService.setDefaultResume(id);
    const updated = await resumeService.getResumes();
    setResumeList(updated);
    triggerToast('Default resume updated');
  };

  const handleDeleteResume = async (id: string) => {
    await resumeService.deleteResume(id);
    setResumeList(resumeList.filter((r) => r.id !== id));
    triggerToast('Resume deleted');
  };

  // ==========================================
  // PROJECT HANDLERS
  // ==========================================
  const handleOpenAddProject = () => {
    setEditingProject({
      id: `proj-${Date.now()}`,
      name: '',
      shortDescription: '',
      detailedDescription: '',
      problemStatement: '',
      solution: '',
      technologies: [],
      githubUrl: '',
      liveUrl: '',
    });
    setProjectModalOpen(true);
  };

  const handleOpenEditProject = (record: ProjectRecord) => {
    setEditingProject({ ...record });
    setProjectModalOpen(true);
  };

  const handleSaveProjectModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProject) return;
    await projectService.saveProject(editingProject);
    const updated = await projectService.getProjects();
    setProjectList(updated);
    setProjectModalOpen(false);
    setEditingProject(null);
    triggerToast(`Project "${editingProject.name}" saved!`);
  };

  const handleDeleteProject = async (id: string) => {
    await projectService.deleteProject(id);
    setProjectList(projectList.filter((p) => p.id !== id));
    triggerToast('Project removed');
  };

  // ==========================================
  // ANSWER BANK HANDLERS
  // ==========================================
  const handleOpenAddAnswer = () => {
    setEditingAnswer({
      id: `ans-${Date.now()}`,
      question: '',
      answer: '',
      category: 'Behavioral',
      tags: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setAnswerModalOpen(true);
  };

  const handleOpenEditAnswer = (record: SavedAnswer) => {
    setEditingAnswer({ ...record });
    setAnswerModalOpen(true);
  };

  const handleSaveAnswerModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAnswer) return;
    await answerService.saveAnswer(editingAnswer);
    const updated = await answerService.getAnswers();
    setAnswerList(updated);
    setAnswerModalOpen(false);
    setEditingAnswer(null);
    triggerToast('Answer saved to bank!');
  };

  const handleDeleteAnswer = async (id: string) => {
    await answerService.deleteAnswer(id);
    setAnswerList(answerList.filter((a) => a.id !== id));
    triggerToast('Answer deleted');
  };

  // ==========================================
  // APPLICATION TRACKER HANDLERS
  // ==========================================
  const handleOpenAddApplication = () => {
    setEditingApplication({
      id: `app-${Date.now()}`,
      companyName: '',
      jobTitle: '',
      jobUrl: '',
      applicationDate: new Date().toISOString().split('T')[0],
      status: 'Applied',
      notes: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    setApplicationModalOpen(true);
  };

  const handleOpenEditApplication = (record: ApplicationRecord) => {
    setEditingApplication({ ...record });
    setApplicationModalOpen(true);
  };

  const handleSaveApplicationModal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingApplication) return;
    await applicationService.saveApplication(editingApplication);
    const updated = await applicationService.getApplications();
    const stats = await applicationService.getStats();
    setApplicationList(updated);
    setAppStats(stats);
    setApplicationModalOpen(false);
    setEditingApplication(null);
    triggerToast('Application recorded!');
  };

  const handleUpdateAppStatus = async (id: string, status: ApplicationStatus) => {
    await applicationService.updateStatus(id, status);
    const updated = await applicationService.getApplications();
    const stats = await applicationService.getStats();
    setApplicationList(updated);
    setAppStats(stats);
    triggerToast(`Status updated to ${status}`);
  };

  const handleDeleteApplication = async (id: string) => {
    await applicationService.deleteApplication(id);
    setApplicationList(applicationList.filter((a) => a.id !== id));
    const stats = await applicationService.getStats();
    setAppStats(stats);
    triggerToast('Application deleted');
  };

  // Backup & Wipe
  const handleExportData = async () => {
    const data = await storageService.exportAllData();
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `jobmate-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    triggerToast('Backup exported successfully');
  };

  const handleImportData = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const raw = event.target?.result as string;
        const parsed = JSON.parse(raw);
        await storageService.importAllData(parsed);
        await loadAllRecords();
        triggerToast('Profile and documents restored!');
      } catch (err) {
        alert('Failed to import backup file: ' + (err as Error).message);
      }
    };
    reader.readAsText(file);
  };

  const handleWipeAll = async () => {
    if (confirm('Are you sure you want to delete all local data? This action cannot be undone.')) {
      await storageService.wipeAllData();
      await loadAllRecords();
      triggerToast('All data cleared.');
    }
  };

  const completeness = profile
    ? profileService.calculateCompleteness(
        profile,
        educationList,
        experienceList,
        skillsList,
        resumeList.length
      )
    : 0;

  return (
    <div className="flex h-screen bg-slate-100 text-slate-800 font-sans antialiased overflow-hidden">
      {/* Toast Notification */}
      {saveToast && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white text-xs px-4 py-2.5 rounded-xl shadow-xl flex items-center gap-2 border border-slate-700 animate-fade-in">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{saveToast}</span>
        </div>
      )}

      {/* Sidebar Navigation */}
      <aside className="w-64 bg-white border-r border-slate-200 flex flex-col shrink-0">
        <div className="p-4 border-b border-slate-100 flex items-center gap-2.5">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center text-white shadow-sm">
            <Briefcase className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-bold text-slate-900 text-base leading-none">JobMate</h1>
            <span className="text-[11px] text-slate-500 font-medium">Career Profile Manager</span>
          </div>
        </div>

        {/* Profile Completeness Card */}
        <div className="p-3 mx-3 my-3 bg-indigo-50/70 border border-indigo-100 rounded-xl">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="font-semibold text-indigo-950">Profile Ready</span>
            <span className="font-bold text-indigo-600">{completeness}%</span>
          </div>
          <div className="w-full bg-indigo-200/50 h-1.5 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{ width: `${completeness}%` }}
            />
          </div>
        </div>

        {/* Navigation Menu */}
        <nav className="flex-1 px-3 space-y-1 overflow-y-auto">
          {[
            { id: 'overview', label: 'Overview', icon: BarChart3 },
            { id: 'profile', label: 'Personal Details', icon: User },
            { id: 'education', label: 'Education', icon: GraduationCap, count: educationList.length },
            { id: 'experience', label: 'Experience', icon: Award, count: experienceList.length },
            { id: 'skills', label: 'Technical Skills', icon: Layers, count: skillsList.length },
            { id: 'resumes', label: 'Resumes', icon: FileText, count: resumeList.length },
            { id: 'projects', label: 'Projects', icon: FolderGit2, count: projectList.length },
            { id: 'answers', label: 'Answer Bank', icon: HelpCircle, count: answerList.length },
            { id: 'applications', label: 'Applications', icon: Clock, count: applicationList.length },
            { id: 'settings', label: 'Settings & Backup', icon: Settings },
          ].map((item) => {
            const Icon = item.icon;
            const isActive = activeNav === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveNav(item.id as NavSection)}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition ${
                  isActive
                    ? 'bg-indigo-600 text-white font-semibold shadow-xs'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-slate-400'}`} />
                  <span>{item.label}</span>
                </div>
                {item.count !== undefined && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                      isActive ? 'bg-indigo-700 text-white' : 'bg-slate-100 text-slate-500'
                    }`}
                  >
                    {item.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        <div className="p-3 border-t border-slate-100 text-[11px] text-slate-400 flex items-center justify-between">
          <span>v1.0.0 • Local-First</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Local Storage Ready" />
        </div>
      </aside>

      {/* Main Content Pane */}
      <main className="flex-1 overflow-y-auto p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          {/* SECTION 1: OVERVIEW */}
          {activeNav === 'overview' && (
            <div className="space-y-6">
              <div className="flex justify-between items-end">
                <div>
                  <h2 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Welcome back, {profile?.personal.firstName || 'Candidate'}!
                  </h2>
                  <p className="text-slate-500 text-sm mt-0.5">
                    Your central repository of career details, resumes, and tracked applications.
                  </p>
                </div>
              </div>

              {/* Stat Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-medium text-slate-500 block">Total Applications</span>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    {appStats?.total || 0}
                  </div>
                  <span className="text-[11px] text-emerald-600 font-medium">
                    {appStats?.activeCount || 0} active
                  </span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-medium text-slate-500 block">Interviews</span>
                  <div className="text-2xl font-bold text-indigo-600 mt-1">
                    {appStats?.interview || 0}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">In evaluation</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-medium text-slate-500 block">Saved Resumes</span>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    {resumeList.length}
                  </div>
                  <span className="text-[11px] text-indigo-600 font-medium">IndexedDB Blobs</span>
                </div>
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
                  <span className="text-xs font-medium text-slate-500 block">Answer Bank</span>
                  <div className="text-2xl font-bold text-slate-800 mt-1">
                    {answerList.length}
                  </div>
                  <span className="text-[11px] text-slate-400 font-medium">Reusable responses</span>
                </div>
              </div>

              {/* Quick Actions */}
              <div className="bg-indigo-600 rounded-xl p-5 text-white flex items-center justify-between shadow-sm">
                <div>
                  <h3 className="text-base font-bold">Ready to apply for jobs?</h3>
                  <p className="text-indigo-100 text-xs mt-1">
                    Navigate to any job application page (Greenhouse, Lever, LinkedIn, Workday) and open the Side Panel to autofill!
                  </p>
                </div>
                <button
                  onClick={() => setActiveNav('profile')}
                  className="px-4 py-2 bg-white text-indigo-600 hover:bg-indigo-50 font-semibold text-xs rounded-lg transition shrink-0"
                >
                  Edit Profile
                </button>
              </div>

              {/* Recent Applications Preview */}
              <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-2xs space-y-3">
                <div className="flex justify-between items-center">
                  <h3 className="font-bold text-slate-900 text-sm">Recent Applications</h3>
                  <button
                    onClick={() => setActiveNav('applications')}
                    className="text-indigo-600 hover:underline text-xs font-medium"
                  >
                    View All →
                  </button>
                </div>

                {applicationList.length > 0 ? (
                  <div className="divide-y divide-slate-100">
                    {applicationList.slice(0, 4).map((app) => (
                      <div key={app.id} className="py-2.5 flex items-center justify-between text-xs">
                        <div>
                          <strong className="text-slate-800 block">{app.companyName}</strong>
                          <span className="text-slate-500 text-[11px]">{app.jobTitle}</span>
                        </div>
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700">
                          {app.status}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-slate-400 text-xs py-4 text-center">No applications logged yet.</p>
                )}
              </div>
            </div>
          )}

          {/* SECTION 2: PERSONAL PROFILE */}
          {activeNav === 'profile' && profile && (
            <form onSubmit={handleSaveProfile} className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Personal Information</h2>
                  <p className="text-xs text-slate-500">
                    Canonical details used to autofill job applications.
                  </p>
                </div>
                <button
                  type="submit"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-lg transition flex items-center gap-1.5 shadow-sm"
                >
                  <Check className="w-3.5 h-3.5" />
                  Save Changes
                </button>
              </div>

              <div className="grid grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">First Name *</label>
                  <input
                    type="text"
                    required
                    value={profile.personal.firstName}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        personal: { ...profile.personal, firstName: e.target.value },
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Last Name *</label>
                  <input
                    type="text"
                    required
                    value={profile.personal.lastName}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        personal: { ...profile.personal, lastName: e.target.value },
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    value={profile.personal.fullName}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        personal: { ...profile.personal, fullName: e.target.value },
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    required
                    value={profile.personal.email}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        personal: { ...profile.personal, email: e.target.value },
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>

                {/* Phone Number with Country Code Dropdown */}
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone Number *</label>
                  <div className="flex gap-1.5">
                    <select
                      value={phoneCountryCode}
                      onChange={(e) => setPhoneCountryCode(e.target.value)}
                      className="w-28 p-2 border border-slate-300 rounded-lg focus:outline-indigo-500 bg-white font-medium text-xs"
                    >
                      {COUNTRY_CODES.map((item) => (
                        <option key={item.code} value={item.code}>
                          {item.country}
                        </option>
                      ))}
                    </select>
                    <input
                      type="tel"
                      required
                      placeholder="e.g. 7983163187"
                      value={phoneNumberOnly}
                      onChange={(e) => setPhoneNumberOnly(e.target.value)}
                      className="flex-1 p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date of Birth</label>
                  <input
                    type="date"
                    value={profile.personal.dateOfBirth || ''}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        personal: { ...profile.personal, dateOfBirth: e.target.value },
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>

                <div>
                  <label className="block font-medium text-slate-700 mb-1">Gender</label>
                  <select
                    value={profile.personal.gender || ''}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        personal: { ...profile.personal, gender: e.target.value },
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500 bg-white"
                  >
                    <option value="">Select Gender (Optional)</option>
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Non-Binary">Non-Binary</option>
                    <option value="Other">Other</option>
                    <option value="Prefer not to say">Prefer not to say</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block font-medium text-slate-700 mb-1">Race / Ethnicity (for EEO surveys)</label>
                  <select
                    value={profile.personal.race || ''}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        personal: { ...profile.personal, race: e.target.value },
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500 bg-white"
                  >
                    <option value="">Select Race / Ethnicity (Optional)</option>
                    <option value="Asian (including Indian subcontinent / South Asian)">
                      Asian (including Indian subcontinent / South Asian)
                    </option>
                    <option value="White">White / Caucasian</option>
                    <option value="Black or African American">Black or African American</option>
                    <option value="Hispanic or Latino">Hispanic or Latino</option>
                    <option value="Native American or Alaska Native">Native American or Alaska Native</option>
                    <option value="Native Hawaiian or Other Pacific Islander">Native Hawaiian or Other Pacific Islander</option>
                    <option value="Two or More Races">Two or More Races</option>
                    <option value="Prefer not to say">Prefer not to say / Decline to self-identify</option>
                  </select>
                </div>
              </div>

              {/* Address with Country & State Suggestions */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm mb-3">Address Information</h3>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="col-span-2">
                    <label className="block font-medium text-slate-700 mb-1">Street Address</label>
                    <input
                      type="text"
                      value={profile.address.addressLine1}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          address: { ...profile.address, addressLine1: e.target.value },
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                      placeholder="House/Apt No., Street, Area"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">City</label>
                    <input
                      type="text"
                      value={profile.address.city}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          address: { ...profile.address, city: e.target.value },
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                      placeholder="e.g. Noida, Bangalore, San Francisco"
                    />
                  </div>

                  {/* State with Datalist Suggestions */}
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">State / Province</label>
                    <input
                      type="text"
                      list="state-suggestions"
                      value={profile.address.state}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          address: { ...profile.address, state: e.target.value },
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                      placeholder="e.g. Uttar Pradesh, California"
                    />
                    <datalist id="state-suggestions">
                      {POPULAR_STATES.map((s) => (
                        <option key={s} value={s} />
                      ))}
                    </datalist>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Postal / Zip Code</label>
                    <input
                      type="text"
                      value={profile.address.postalCode}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          address: { ...profile.address, postalCode: e.target.value },
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                      placeholder="e.g. 201209, 94105"
                    />
                  </div>

                  {/* Country with Suggestions */}
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Country</label>
                    <input
                      type="text"
                      list="country-suggestions"
                      value={profile.address.country}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          address: { ...profile.address, country: e.target.value },
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                      placeholder="e.g. India, United States"
                    />
                    <datalist id="country-suggestions">
                      {POPULAR_COUNTRIES.map((c) => (
                        <option key={c} value={c} />
                      ))}
                    </datalist>
                  </div>
                </div>
              </div>

              {/* Professional Links */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm mb-3">Professional Profiles & Links</h3>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">LinkedIn Profile URL</label>
                    <input
                      type="url"
                      value={profile.links.linkedInUrl}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          links: { ...profile.links, linkedInUrl: e.target.value },
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                      placeholder="https://linkedin.com/in/username"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">GitHub Profile URL</label>
                    <input
                      type="url"
                      value={profile.links.githubUrl}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          links: { ...profile.links, githubUrl: e.target.value },
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                      placeholder="https://github.com/username"
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Portfolio / Website</label>
                    <input
                      type="url"
                      value={profile.links.portfolioUrl || ''}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          links: { ...profile.links, portfolioUrl: e.target.value },
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                      placeholder="https://yourportfolio.dev"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Preferences with Notice Period Chips */}
              <div className="pt-4 border-t border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm mb-3">Employment Preferences</h3>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div className="col-span-2">
                    <label className="block font-medium text-slate-700 mb-1">Notice Period</label>
                    <input
                      type="text"
                      value={profile.preferences.noticePeriodDays || ''}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          preferences: { ...profile.preferences, noticePeriodDays: e.target.value },
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500 mb-1.5"
                      placeholder="Select a suggestion below or type custom"
                    />
                    {/* Notice Period Quick Suggestion Chips */}
                    <div className="flex flex-wrap gap-1.5">
                      {NOTICE_PERIOD_SUGGESTIONS.map((period) => (
                        <button
                          type="button"
                          key={period}
                          onClick={() =>
                            setProfile({
                              ...profile,
                              preferences: { ...profile.preferences, noticePeriodDays: period },
                            })
                          }
                          className="px-2 py-0.5 rounded text-[10px] font-medium bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition"
                        >
                          {period}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Expected Compensation</label>
                    <input
                      type="text"
                      value={profile.preferences.expectedCompensation || ''}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          preferences: { ...profile.preferences, expectedCompensation: e.target.value },
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                      placeholder="e.g. ₹15,00,000 or $120,000 / year"
                    />
                  </div>

                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Work Authorization</label>
                    <select
                      value={profile.preferences.workAuthorizationStatus}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          preferences: { ...profile.preferences, workAuthorizationStatus: e.target.value },
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500 bg-white"
                    >
                      <option value="Authorized to work">Authorized to work</option>
                      <option value="Requires sponsorship">Requires visa sponsorship</option>
                      <option value="Citizen">Citizen / Permanent Resident</option>
                    </select>
                  </div>
                </div>
              </div>
            </form>
          )}

          {/* SECTION 3: EDUCATION */}
          {activeNav === 'education' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Education Details</h2>
                  <p className="text-xs text-slate-500">
                    Add and manage your academic degrees, branch, university, and grades.
                  </p>
                </div>
                <button
                  onClick={handleOpenAddEducation}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Degree
                </button>
              </div>

              {educationList.length > 0 ? (
                <div className="space-y-3">
                  {educationList.map((edu) => (
                    <div
                      key={edu.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-50/80 transition flex items-start justify-between"
                    >
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{edu.institution}</h4>
                        <p className="text-xs text-indigo-600 font-semibold mt-0.5">
                          {edu.degree} {edu.branch ? `• ${edu.branch}` : ''}
                        </p>
                        <p className="text-xs text-slate-500 mt-1">
                          {edu.startYear} – {edu.graduationYear} {edu.cgpa ? `• CGPA/Grade: ${edu.cgpa}` : ''}
                        </p>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button
                          onClick={() => handleOpenEditEducation(edu)}
                          className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition"
                          title="Edit Degree Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteEducation(edu.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition"
                          title="Delete Degree"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <GraduationCap className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">No education records added yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Add your college, degree, and GPA for automatic form filling.</p>
                  <button
                    onClick={handleOpenAddEducation}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Degree Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECTION 4: EXPERIENCE */}
          {activeNav === 'experience' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Work Experience</h2>
                  <p className="text-xs text-slate-500">Employment history, roles, responsibilities, and technologies.</p>
                </div>
                <button
                  onClick={handleOpenAddExperience}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Experience
                </button>
              </div>

              {experienceList.length > 0 ? (
                <div className="space-y-3">
                  {experienceList.map((exp) => (
                    <div
                      key={exp.id}
                      className="p-4 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-50/80 transition flex items-start justify-between"
                    >
                      <div className="space-y-1">
                        <h4 className="font-bold text-slate-900 text-sm">{exp.designation}</h4>
                        <p className="text-xs text-indigo-600 font-medium">
                          {exp.companyName} • {exp.employmentType} ({exp.startDate} – {exp.currentlyWorking ? 'Present' : exp.endDate})
                        </p>
                        <p className="text-xs text-slate-600 leading-relaxed pt-1 whitespace-pre-wrap">{exp.description}</p>
                        {exp.technologies && exp.technologies.length > 0 && (
                          <div className="flex flex-wrap gap-1 pt-1.5">
                            {exp.technologies.map((t, idx) => (
                              <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-700">
                                {t}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0 ml-3">
                        <button
                          onClick={() => handleOpenEditExperience(exp)}
                          className="text-slate-500 hover:text-indigo-600 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition"
                          title="Edit Experience"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteExperience(exp.id)}
                          className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg hover:bg-white border border-transparent hover:border-slate-200 transition"
                          title="Delete Experience"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Award className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">No experience entries recorded.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Add full-time jobs, internships, or freelance roles.</p>
                  <button
                    onClick={handleOpenAddExperience}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Experience Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECTION 5: SKILLS WITH QUICK SUGGESTION PILLS */}
          {activeNav === 'skills' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900">Technical Skills</h2>
                <p className="text-xs text-slate-500">
                  Click on any recommended skill below to instantly add it to your profile, or type your own.
                </p>
              </div>

              {/* Add Custom Skill Bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="Type a skill e.g. React, Go, Docker, AWS..."
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      handleAddSkillDirect(newSkillName, newSkillCategory);
                      setNewSkillName('');
                    }
                  }}
                  className="flex-1 p-2 text-xs border border-slate-300 rounded-lg focus:outline-indigo-500"
                />
                <select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value as SkillCategory)}
                  className="p-2 text-xs border border-slate-300 rounded-lg bg-white font-medium"
                >
                  <option value="languages">Languages</option>
                  <option value="frameworks">Frameworks</option>
                  <option value="databases">Databases</option>
                  <option value="cloud">Cloud / DevOps</option>
                  <option value="developerTools">Developer Tools</option>
                  <option value="ai">AI / LLM</option>
                  <option value="other">Other</option>
                </select>
                <button
                  onClick={() => {
                    handleAddSkillDirect(newSkillName, newSkillCategory);
                    setNewSkillName('');
                  }}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-lg"
                >
                  Add Skill
                </button>
              </div>

              {/* Your Active Skills */}
              <div>
                <h3 className="font-semibold text-slate-800 text-xs mb-2">
                  Your Saved Skills ({skillsList.length})
                </h3>
                {skillsList.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {skillsList.map((skill) => (
                      <span
                        key={skill.id}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200"
                      >
                        <span>{skill.name}</span>
                        <button
                          onClick={() => handleDeleteSkill(skill.id)}
                          className="text-indigo-400 hover:text-rose-600 ml-1 font-bold text-sm"
                          title="Remove skill"
                        >
                          ×
                        </button>
                      </span>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-slate-400 italic">No skills added yet.</p>
                )}
              </div>

              {/* Quick Clickable Suggestions Grouped By Category */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="font-semibold text-slate-800 text-xs">
                  ⚡ Suggested Popular Skills (Click to Add):
                </h3>

                {(Object.entries(SKILL_SUGGESTIONS) as [SkillCategory, string[]][]).map(([category, items]) => (
                  <div key={category} className="space-y-1">
                    <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">
                      {category}
                    </span>
                    <div className="flex flex-wrap gap-1.5">
                      {items.map((suggested) => {
                        const isAlreadyAdded = skillsList.some(
                          (s) => s.name.toLowerCase() === suggested.toLowerCase()
                        );
                        return (
                          <button
                            key={suggested}
                            type="button"
                            disabled={isAlreadyAdded}
                            onClick={() => handleAddSkillDirect(suggested, category)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium transition ${
                              isAlreadyAdded
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-default'
                                : 'bg-white hover:bg-indigo-50 hover:border-indigo-300 text-slate-700 border border-slate-200 active:scale-95'
                            }`}
                          >
                            {isAlreadyAdded ? `✓ ${suggested}` : `+ ${suggested}`}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 6: RESUMES */}
          {activeNav === 'resumes' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Resume Management</h2>
                  <p className="text-xs text-slate-500">
                    PDF binaries are stored strictly in browser IndexedDB Blobs.
                  </p>
                </div>
                <label className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-2 rounded-lg flex items-center gap-1.5 shadow-sm cursor-pointer transition">
                  <Upload className="w-3.5 h-3.5" />
                  <span>Upload PDF</span>
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={handleFileUpload}
                    className="hidden"
                  />
                </label>
              </div>

              <div className="grid grid-cols-2 gap-4">
                {resumeList.map((resume) => (
                  <div
                    key={resume.id}
                    className={`p-4 rounded-xl border transition ${
                      resume.isDefault ? 'border-indigo-400 bg-indigo-50/30' : 'border-slate-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <FileText className="w-6 h-6 text-indigo-600" />
                        <div>
                          <h4 className="font-bold text-slate-900 text-xs">{resume.name}</h4>
                          <span className="text-[10px] text-slate-500 block truncate max-w-[170px]">
                            {resume.fileName}
                          </span>
                        </div>
                      </div>
                      {resume.isDefault ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                          Default
                        </span>
                      ) : (
                        <button
                          onClick={() => handleSetDefaultResume(resume.id)}
                          className="text-[10px] text-slate-500 hover:text-indigo-600 font-medium"
                        >
                          Set Default
                        </button>
                      )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                      <span>{(resume.fileSize / 1024).toFixed(1)} KB</span>
                      <div className="flex items-center gap-2">
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
                          className="text-slate-600 hover:text-indigo-600"
                          title="Download"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteResume(resume.id)}
                          className="text-slate-400 hover:text-rose-600"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 7: PROJECTS */}
          {activeNav === 'projects' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Projects Portfolio</h2>
                  <p className="text-xs text-slate-500">Showcase technical solutions, architecture, and results.</p>
                </div>
                <button
                  onClick={handleOpenAddProject}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Project
                </button>
              </div>

              {projectList.length > 0 ? (
                <div className="space-y-4">
                  {projectList.map((proj) => (
                    <div key={proj.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-bold text-slate-900 text-sm">{proj.name}</h4>
                          <p className="text-xs text-slate-600 mt-0.5">{proj.shortDescription}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button
                            onClick={() => handleOpenEditProject(proj)}
                            className="text-slate-500 hover:text-indigo-600 p-1 rounded"
                            title="Edit Project"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleDeleteProject(proj.id)}
                            className="text-slate-400 hover:text-rose-600 p-1 rounded"
                            title="Delete Project"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {proj.problemStatement && (
                        <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-100 space-y-1">
                          <strong className="text-slate-700 block text-[11px]">Problem & Solution:</strong>
                          <p className="text-slate-600 text-[11px]">{proj.problemStatement}</p>
                        </div>
                      )}

                      {proj.technologies && proj.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-1">
                          {proj.technologies.map((t, idx) => (
                            <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                              {t}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <FolderGit2 className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">No projects added yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Add software engineering projects to ground your AI answers.</p>
                  <button
                    onClick={handleOpenAddProject}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Project Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECTION 8: ANSWER BANK */}
          {activeNav === 'answers' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Reusable Answer Bank</h2>
                  <p className="text-xs text-slate-500">Pre-drafted answers for recurring job application questions.</p>
                </div>
                <button
                  onClick={handleOpenAddAnswer}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Answer
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search questions or keywords..."
                  value={answerSearchQuery}
                  onChange={(e) => setAnswerSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-indigo-500"
                />
              </div>

              {/* Answers List */}
              {answerList.length > 0 ? (
                <div className="space-y-3">
                  {answerList
                    .filter((a) =>
                      !answerSearchQuery
                        ? true
                        : a.question.toLowerCase().includes(answerSearchQuery.toLowerCase()) ||
                          a.answer.toLowerCase().includes(answerSearchQuery.toLowerCase())
                    )
                    .map((ans) => (
                      <div key={ans.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <span className="font-bold text-slate-800 text-xs block">{ans.question}</span>
                            <span className="px-2 py-0.5 rounded text-[9px] font-semibold bg-indigo-100 text-indigo-700 inline-block mt-1">
                              {ans.category}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(ans.answer);
                                setCopiedKey(ans.id);
                                setTimeout(() => setCopiedKey(null), 2000);
                              }}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 rounded"
                              title="Copy to clipboard"
                            >
                              {copiedKey === ans.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-600" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                            <button
                              onClick={() => handleOpenEditAnswer(ans)}
                              className="p-1.5 text-slate-500 hover:text-indigo-600 rounded"
                              title="Edit Answer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDeleteAnswer(ans.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <p className="text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap">
                          {ans.answer}
                        </p>
                      </div>
                    ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <HelpCircle className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">No saved answers yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">Add frequently asked interview and application questions.</p>
                  <button
                    onClick={handleOpenAddAnswer}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Answer Now
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECTION 9: APPLICATION TRACKER */}
          {activeNav === 'applications' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Application Pipeline</h2>
                  <p className="text-xs text-slate-500">Track company applications, stages, and notes.</p>
                </div>
                <button
                  onClick={handleOpenAddApplication}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm transition"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Application
                </button>
              </div>

              {applicationList.length > 0 ? (
                <div className="space-y-3">
                  {applicationList.map((app) => (
                    <div key={app.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <strong className="text-slate-900 text-sm">{app.companyName}</strong>
                          <span className="text-xs text-indigo-600 font-medium">• {app.jobTitle}</span>
                          {app.jobUrl && (
                            <a
                              href={app.jobUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-slate-400 hover:text-indigo-600"
                              title="Open Job URL"
                            >
                              <ExternalLink className="w-3 h-3" />
                            </a>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-500 mt-0.5">
                          Applied: {app.applicationDate?.slice(0, 10)} {app.notes ? `• ${app.notes}` : ''}
                        </p>
                      </div>

                      <div className="flex items-center gap-2 shrink-0">
                        <select
                          value={app.status}
                          onChange={(e) => handleUpdateAppStatus(app.id, e.target.value as ApplicationStatus)}
                          className="text-xs font-semibold px-2.5 py-1 rounded-lg border border-slate-300 bg-white"
                        >
                          <option value="Saved">Saved</option>
                          <option value="Applied">Applied</option>
                          <option value="Assessment">Assessment</option>
                          <option value="Interview">Interview</option>
                          <option value="Offer">Offer</option>
                          <option value="Rejected">Rejected</option>
                        </select>

                        <button
                          onClick={() => handleOpenEditApplication(app)}
                          className="text-slate-500 hover:text-indigo-600 p-1"
                          title="Edit Details"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteApplication(app.id)}
                          className="text-slate-400 hover:text-rose-600 p-1"
                          title="Delete Application"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 bg-slate-50 rounded-xl border border-dashed border-slate-200">
                  <Clock className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                  <p className="text-xs text-slate-600 font-medium">No applications logged yet.</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 mb-3">
                    Click "Save to Application Tracker" inside the Side Panel when applying, or log one manually here.
                  </p>
                  <button
                    onClick={handleOpenAddApplication}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-3 py-1.5 rounded-lg inline-flex items-center gap-1.5"
                  >
                    <Plus className="w-3.5 h-3.5" /> Log First Application
                  </button>
                </div>
              )}
            </div>
          )}

          {/* SECTION 10: SETTINGS & BACKUP */}
          {activeNav === 'settings' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-6">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900">Settings & Local Data</h2>
                <p className="text-xs text-slate-500">
                  Configure AI assistance and manage profile backups.
                </p>
              </div>

              {/* AI Settings */}
              {settings && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="font-semibold text-slate-800 text-sm">AI Copilot Configuration</h3>
                      <p className="text-xs text-slate-500">
                        Generate grounded answers for behavioral questions using your real experience.
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={settings.aiEnabled}
                        onChange={(e) =>
                          setSettings({ ...settings, aiEnabled: e.target.checked })
                        }
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-indigo-600"></div>
                      <span className="ml-2 text-xs font-medium text-slate-700">
                        {settings.aiEnabled ? 'Enabled' : 'Disabled'}
                      </span>
                    </label>
                  </div>

                  <div className="grid grid-cols-2 gap-4 text-xs pt-1">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Provider</label>
                      <select
                        value={settings.aiProvider}
                        onChange={(e) =>
                          setSettings({ ...settings, aiProvider: e.target.value as 'groq' | 'gemini' })
                        }
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="groq">Groq (Llama 3.3 70B - Ultra Fast)</option>
                        <option value="gemini">Google Gemini 1.5 Flash</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">API Key (Stored only in local storage)</label>
                      <input
                        type="password"
                        placeholder="gsk_... or AIza..."
                        value={settings.aiApiKey || ''}
                        onChange={(e) => setSettings({ ...settings, aiApiKey: e.target.value })}
                        className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      chromeStorageClient.saveSettings(settings);
                      triggerToast('AI settings saved!');
                    }}
                    className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3.5 py-1.5 rounded-lg"
                  >
                    Save AI Settings
                  </button>
                </div>
              )}

              {/* Data Export / Import */}
              <div className="pt-4 border-t border-slate-100 space-y-3">
                <h3 className="font-semibold text-slate-800 text-sm">Data Backup & Migration</h3>
                <p className="text-xs text-slate-500">
                  Export your complete professional data as a JSON file or restore from a previous backup.
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={handleExportData}
                    className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition"
                  >
                    <Download className="w-3.5 h-3.5" /> Export Data (JSON)
                  </button>
                  <label className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 cursor-pointer transition">
                    <Upload className="w-3.5 h-3.5" /> Restore Backup
                    <input type="file" accept=".json" onChange={handleImportData} className="hidden" />
                  </label>
                </div>
              </div>

              {/* Danger Zone */}
              <div className="pt-4 border-t border-rose-100 space-y-2">
                <h3 className="font-semibold text-rose-800 text-sm">Danger Zone</h3>
                <p className="text-xs text-slate-500">
                  Clear all local data from IndexedDB and Chrome Storage.
                </p>
                <button
                  onClick={handleWipeAll}
                  className="bg-rose-50 hover:bg-rose-100 border border-rose-200 text-rose-700 font-semibold text-xs px-4 py-2 rounded-lg flex items-center gap-1.5 transition"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Reset All Local Data
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* ========================================================================= */}
      {/* INTERACTIVE MODALS */}
      {/* ========================================================================= */}

      {/* 1. EDUCATION MODAL */}
      {educationModalOpen && editingEducation && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {educationList.some((e) => e.id === editingEducation.id) ? 'Edit Education' : 'Add Degree / Education'}
              </h3>
              <button
                onClick={() => setEducationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEducationModal} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">College / University Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Stanford University, IIT Delhi"
                  value={editingEducation.institution}
                  onChange={(e) => setEditingEducation({ ...editingEducation, institution: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Degree *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. B.Tech, B.S., M.S., High School"
                    value={editingEducation.degree}
                    onChange={(e) => setEditingEducation({ ...editingEducation, degree: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Branch / Major / Discipline</label>
                  <input
                    type="text"
                    placeholder="e.g. Computer Science, Information Technology"
                    value={editingEducation.branch}
                    onChange={(e) => setEditingEducation({ ...editingEducation, branch: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Year</label>
                  <input
                    type="text"
                    placeholder="e.g. 2020"
                    value={editingEducation.startYear}
                    onChange={(e) => setEditingEducation({ ...editingEducation, startYear: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Graduation Year</label>
                  <input
                    type="text"
                    placeholder="e.g. 2024"
                    value={editingEducation.graduationYear}
                    onChange={(e) => setEditingEducation({ ...editingEducation, graduationYear: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">CGPA / Grade</label>
                  <input
                    type="text"
                    placeholder="e.g. 8.5/10 or 3.8/4.0"
                    value={editingEducation.cgpa}
                    onChange={(e) => setEditingEducation({ ...editingEducation, cgpa: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setEducationModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm"
                >
                  Save Degree
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 2. EXPERIENCE MODAL */}
      {experienceModalOpen && editingExperience && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {experienceList.some((e) => e.id === editingExperience.id) ? 'Edit Experience' : 'Add Work Experience'}
              </h3>
              <button
                onClick={() => setExperienceModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveExperienceModal} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Google, Microsoft, Startup"
                    value={editingExperience.companyName}
                    onChange={(e) => setEditingExperience({ ...editingExperience, companyName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Designation / Role *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Software Engineer, SDE Intern"
                    value={editingExperience.designation}
                    onChange={(e) => setEditingExperience({ ...editingExperience, designation: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Employment Type</label>
                <select
                  value={editingExperience.employmentType}
                  onChange={(e) =>
                    setEditingExperience({
                      ...editingExperience,
                      employmentType: e.target.value as 'Full-time' | 'Internship' | 'Part-time' | 'Contract',
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Full-time">Full-time</option>
                  <option value="Internship">Internship</option>
                  <option value="Part-time">Part-time</option>
                  <option value="Contract">Contract</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Start Date (YYYY-MM)</label>
                  <input
                    type="text"
                    placeholder="e.g. 2023-06"
                    value={editingExperience.startDate}
                    onChange={(e) => setEditingExperience({ ...editingExperience, startDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">End Date (YYYY-MM)</label>
                  <input
                    type="text"
                    placeholder="e.g. 2024-05"
                    disabled={editingExperience.currentlyWorking}
                    value={editingExperience.currentlyWorking ? '' : editingExperience.endDate || ''}
                    onChange={(e) => setEditingExperience({ ...editingExperience, endDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500 disabled:bg-slate-100"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-slate-700 cursor-pointer pt-0.5">
                <input
                  type="checkbox"
                  checked={editingExperience.currentlyWorking}
                  onChange={(e) =>
                    setEditingExperience({ ...editingExperience, currentlyWorking: e.target.checked })
                  }
                  className="rounded text-indigo-600 focus:ring-indigo-500"
                />
                <span>I currently work here</span>
              </label>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Role Description & Responsibilities</label>
                <textarea
                  rows={3}
                  placeholder="Key contributions, products shipped, impact delivered..."
                  value={editingExperience.description}
                  onChange={(e) => setEditingExperience({ ...editingExperience, description: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Technologies Used (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. TypeScript, React, Spring Boot, PostgreSQL"
                  value={editingExperience.technologies.join(', ')}
                  onChange={(e) =>
                    setEditingExperience({
                      ...editingExperience,
                      technologies: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setExperienceModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm"
                >
                  Save Experience
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 3. PROJECT MODAL */}
      {projectModalOpen && editingProject && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {projectList.some((p) => p.id === editingProject.id) ? 'Edit Project' : 'Add Project'}
              </h3>
              <button
                onClick={() => setProjectModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveProjectModal} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Project Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Distributed Task Orchestrator"
                  value={editingProject.name}
                  onChange={(e) => setEditingProject({ ...editingProject, name: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Short Description</label>
                <input
                  type="text"
                  placeholder="1-line summary of what the project does"
                  value={editingProject.shortDescription}
                  onChange={(e) => setEditingProject({ ...editingProject, shortDescription: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Problem & Architecture Details</label>
                <textarea
                  rows={3}
                  placeholder="The technical challenges solved, architecture choices, and impact..."
                  value={editingProject.problemStatement || ''}
                  onChange={(e) => setEditingProject({ ...editingProject, problemStatement: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">GitHub Repo URL</label>
                  <input
                    type="url"
                    placeholder="https://github.com/..."
                    value={editingProject.githubUrl || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, githubUrl: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Live Demo URL</label>
                  <input
                    type="url"
                    placeholder="https://demo.app"
                    value={editingProject.liveUrl || ''}
                    onChange={(e) => setEditingProject({ ...editingProject, liveUrl: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Technologies (comma-separated)</label>
                <input
                  type="text"
                  placeholder="e.g. React, TypeScript, Docker, PostgreSQL"
                  value={editingProject.technologies.join(', ')}
                  onChange={(e) =>
                    setEditingProject({
                      ...editingProject,
                      technologies: e.target.value
                        .split(',')
                        .map((t) => t.trim())
                        .filter(Boolean),
                    })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setProjectModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm"
                >
                  Save Project
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 4. ANSWER BANK MODAL */}
      {answerModalOpen && editingAnswer && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {answerList.some((a) => a.id === editingAnswer.id) ? 'Edit Saved Answer' : 'Add Reusable Answer'}
              </h3>
              <button
                onClick={() => setAnswerModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveAnswerModal} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium text-slate-700 mb-1">Application Question *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Why are you interested in this role?"
                  value={editingAnswer.question}
                  onChange={(e) => setEditingAnswer({ ...editingAnswer, question: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Category</label>
                <select
                  value={editingAnswer.category}
                  onChange={(e) =>
                    setEditingAnswer({ ...editingAnswer, category: e.target.value as AnswerCategory })
                  }
                  className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                >
                  <option value="Behavioral">Behavioral</option>
                  <option value="Technical">Technical</option>
                  <option value="Introduction">Introduction / About Me</option>
                  <option value="Salary">Salary & Compensation</option>
                  <option value="Availability">Availability & Notice Period</option>
                  <option value="Relocation">Relocation</option>
                  <option value="Work Authorization">Work Authorization</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Saved Answer *</label>
                <textarea
                  required
                  rows={5}
                  placeholder="Your comprehensive answer..."
                  value={editingAnswer.answer}
                  onChange={(e) => setEditingAnswer({ ...editingAnswer, answer: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setAnswerModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm"
                >
                  Save Answer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* 5. APPLICATION TRACKER MODAL */}
      {applicationModalOpen && editingApplication && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-2xl border border-slate-200 shadow-2xl max-w-lg w-full p-6 space-y-4">
            <div className="flex justify-between items-center border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">
                {applicationList.some((a) => a.id === editingApplication.id) ? 'Edit Application Record' : 'Log New Application'}
              </h3>
              <button
                onClick={() => setApplicationModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveApplicationModal} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Company Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Google, Stripe"
                    value={editingApplication.companyName}
                    onChange={(e) => setEditingApplication({ ...editingApplication, companyName: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Job Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Full Stack Engineer"
                    value={editingApplication.jobTitle}
                    onChange={(e) => setEditingApplication({ ...editingApplication, jobTitle: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Job Posting URL</label>
                <input
                  type="url"
                  placeholder="https://..."
                  value={editingApplication.jobUrl}
                  onChange={(e) => setEditingApplication({ ...editingApplication, jobUrl: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Date Applied</label>
                  <input
                    type="date"
                    value={editingApplication.applicationDate}
                    onChange={(e) => setEditingApplication({ ...editingApplication, applicationDate: e.target.value })}
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Current Status</label>
                  <select
                    value={editingApplication.status}
                    onChange={(e) =>
                      setEditingApplication({
                        ...editingApplication,
                        status: e.target.value as ApplicationStatus,
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                  >
                    <option value="Saved">Saved</option>
                    <option value="Applied">Applied</option>
                    <option value="Assessment">Assessment</option>
                    <option value="Interview">Interview</option>
                    <option value="Offer">Offer</option>
                    <option value="Rejected">Rejected</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block font-medium text-slate-700 mb-1">Notes & Follow-up Details</label>
                <textarea
                  rows={2}
                  placeholder="Referrals, recruiter contacts, interview rounds..."
                  value={editingApplication.notes || ''}
                  onChange={(e) => setEditingApplication({ ...editingApplication, notes: e.target.value })}
                  className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setApplicationModalOpen(false)}
                  className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg hover:bg-slate-50 font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium shadow-sm"
                >
                  Save Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
