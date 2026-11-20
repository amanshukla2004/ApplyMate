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
  Check,
  Download,
  Upload,
  Search,
  BarChart3,
  Copy,
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

  // Form Modals / Editing States
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
    await profileService.updateProfile(profile);
    triggerToast('Profile updated successfully!');
  };

  // Education Handlers
  const handleAddEducation = async () => {
    const newEdu: EducationRecord = {
      id: `edu-${Date.now()}`,
      institution: 'State University',
      degree: 'B.S. in Computer Science',
      branch: 'Computer Science & Engineering',
      startYear: '2020',
      graduationYear: '2024',
      cgpa: '3.8/4.0',
    };
    const saved = await profileService.saveEducation(newEdu);
    setEducationList([...educationList, saved]);
    triggerToast('Education record added');
  };

  const handleDeleteEducation = async (id: string) => {
    await profileService.deleteEducation(id);
    setEducationList(educationList.filter((e) => e.id !== id));
    triggerToast('Education record removed');
  };

  // Experience Handlers
  const handleAddExperience = async () => {
    const newExp: ExperienceRecord = {
      id: `exp-${Date.now()}`,
      companyName: 'Tech Innovations Inc.',
      designation: 'Software Engineer',
      employmentType: 'Full-time',
      startDate: '2024-01',
      currentlyWorking: true,
      description: 'Building microservices and frontend web applications.',
      technologies: ['TypeScript', 'React', 'Node.js', 'PostgreSQL'],
    };
    const saved = await profileService.saveExperience(newExp);
    setExperienceList([...experienceList, saved]);
    triggerToast('Experience record added');
  };

  const handleDeleteExperience = async (id: string) => {
    await profileService.deleteExperience(id);
    setExperienceList(experienceList.filter((e) => e.id !== id));
    triggerToast('Experience record removed');
  };

  // Skills Handlers
  const handleAddSkill = async () => {
    if (!newSkillName.trim()) return;
    const item: SkillItem = {
      id: `skill-${Date.now()}`,
      name: newSkillName.trim(),
      category: newSkillCategory,
      proficiency: 'Advanced',
    };
    const saved = await profileService.saveSkill(item);
    setSkillsList([...skillsList, saved]);
    setNewSkillName('');
    triggerToast(`Added ${saved.name}`);
  };

  const handleDeleteSkill = async (id: string) => {
    await profileService.deleteSkill(id);
    setSkillsList(skillsList.filter((s) => s.id !== id));
  };

  // Resume Handlers
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

  // Project Handlers
  const handleAddProject = async () => {
    const newProj: ProjectRecord = {
      id: `proj-${Date.now()}`,
      name: 'Cloud E-Commerce Platform',
      shortDescription: 'High-concurrency full-stack e-commerce marketplace.',
      detailedDescription:
        'Engineered responsive storefront with React and high-throughput order processing backend.',
      problemStatement: 'Handling flash sale traffic spikes without dropped checkout transactions.',
      solution: 'Implemented distributed redis queuing and optimistic locking.',
      technologies: ['React', 'TypeScript', 'Node.js', 'PostgreSQL', 'Docker'],
      githubUrl: 'https://github.com/example/ecommerce-platform',
    };
    const saved = await projectService.saveProject(newProj);
    setProjectList([...projectList, saved]);
    triggerToast('Project created');
  };

  const handleDeleteProject = async (id: string) => {
    await projectService.deleteProject(id);
    setProjectList(projectList.filter((p) => p.id !== id));
    triggerToast('Project removed');
  };

  // Answer Handlers
  const handleAddAnswer = async () => {
    const newAns: SavedAnswer = {
      id: `ans-${Date.now()}`,
      question: 'Why are you passionate about software engineering?',
      answer:
        'I am driven by creating elegant, scalable solutions to complex real-world challenges, with a relentless focus on clean code and reliable system design.',
      category: 'Behavioral',
      tags: ['passion', 'motivation'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    const saved = await answerService.saveAnswer(newAns);
    setAnswerList([...answerList, saved]);
    triggerToast('Saved answer added to bank');
  };

  const handleDeleteAnswer = async (id: string) => {
    await answerService.deleteAnswer(id);
    setAnswerList(answerList.filter((a) => a.id !== id));
    triggerToast('Answer deleted');
  };

  // Application Tracker Handlers
  const handleAddApplication = async () => {
    const newApp: ApplicationRecord = {
      id: `app-${Date.now()}`,
      companyName: 'Acme Corporation',
      jobTitle: 'Senior Full-Stack Engineer',
      jobUrl: 'https://careers.acme.com/jobs/123',
      applicationDate: new Date().toISOString().split('T')[0],
      status: 'Applied',
      notes: 'Initial application submitted via portal.',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await applicationService.saveApplication(newApp);
    const updated = await applicationService.getApplications();
    const stats = await applicationService.getStats();
    setApplicationList(updated);
    setAppStats(stats);
    triggerToast('Application record created');
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

  // Settings & Backup Handlers
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
            { id: 'education', label: 'Education', icon: GraduationCap },
            { id: 'experience', label: 'Experience', icon: Award },
            { id: 'skills', label: 'Technical Skills', icon: Layers },
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
          <span className="w-2 h-2 rounded-full bg-emerald-500" title="Online & Synced" />
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
                    Here is an overview of your career profile, documents, and tracked applications.
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
                    Navigate to any job portal (Greenhouse, Lever, LinkedIn, Workday) and open the Side Panel to autofill!
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
                <div>
                  <label className="block font-medium text-slate-700 mb-1">Phone Number *</label>
                  <input
                    type="tel"
                    required
                    value={profile.personal.phone}
                    onChange={(e) =>
                      setProfile({
                        ...profile,
                        personal: { ...profile.personal, phone: e.target.value },
                      })
                    }
                    className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
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
              </div>

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
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">State / Province</label>
                    <input
                      type="text"
                      value={profile.address.state}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          address: { ...profile.address, state: e.target.value },
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                    />
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
                    />
                  </div>
                  <div>
                    <label className="block font-medium text-slate-700 mb-1">Country</label>
                    <input
                      type="text"
                      value={profile.address.country}
                      onChange={(e) =>
                        setProfile({
                          ...profile,
                          address: { ...profile.address, country: e.target.value },
                        })
                      }
                      className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                    />
                  </div>
                </div>
              </div>

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

              <div className="pt-4 border-t border-slate-100">
                <h3 className="font-semibold text-slate-800 text-sm mb-3">Employment Preferences</h3>
                <div className="grid grid-cols-3 gap-4 text-xs">
                  <div>
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
                      className="w-full p-2 border border-slate-300 rounded-lg focus:outline-indigo-500"
                      placeholder="e.g. 30 days or Immediate"
                    />
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
                      placeholder="e.g. $120,000 / year"
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
                  <h2 className="text-lg font-bold text-slate-900">Education</h2>
                  <p className="text-xs text-slate-500">Manage academic degrees and colleges.</p>
                </div>
                <button
                  onClick={handleAddEducation}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Degree
                </button>
              </div>

              <div className="space-y-3">
                {educationList.map((edu) => (
                  <div key={edu.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
                    <div>
                      <h4 className="font-bold text-slate-900 text-sm">{edu.institution}</h4>
                      <p className="text-xs text-indigo-600 font-semibold mt-0.5">{edu.degree} • {edu.branch}</p>
                      <p className="text-xs text-slate-500 mt-1">
                        {edu.startYear} – {edu.graduationYear} • GPA: {edu.cgpa}
                      </p>
                    </div>
                    <button
                      onClick={() => handleDeleteEducation(edu.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 4: EXPERIENCE */}
          {activeNav === 'experience' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Work Experience</h2>
                  <p className="text-xs text-slate-500">Employment history, roles, and technologies.</p>
                </div>
                <button
                  onClick={handleAddExperience}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Experience
                </button>
              </div>

              <div className="space-y-3">
                {experienceList.map((exp) => (
                  <div key={exp.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-start justify-between">
                    <div className="space-y-1">
                      <h4 className="font-bold text-slate-900 text-sm">{exp.designation}</h4>
                      <p className="text-xs text-indigo-600 font-medium">
                        {exp.companyName} • {exp.employmentType} ({exp.startDate} – {exp.currentlyWorking ? 'Present' : exp.endDate})
                      </p>
                      <p className="text-xs text-slate-600 leading-relaxed pt-1">{exp.description}</p>
                      <div className="flex flex-wrap gap-1 pt-1.5">
                        {exp.technologies.map((t, idx) => (
                          <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-white border border-slate-200 text-slate-700">
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                    <button
                      onClick={() => handleDeleteExperience(exp.id)}
                      className="text-slate-400 hover:text-rose-600 p-1 rounded shrink-0 ml-3"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 5: SKILLS */}
          {activeNav === 'skills' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-5">
              <div className="border-b border-slate-100 pb-4">
                <h2 className="text-lg font-bold text-slate-900">Technical Skills</h2>
                <p className="text-xs text-slate-500">Categorized competencies for job matching.</p>
              </div>

              {/* Add Skill Bar */}
              <div className="flex gap-2">
                <input
                  type="text"
                  placeholder="e.g. React, Go, Docker, AWS"
                  value={newSkillName}
                  onChange={(e) => setNewSkillName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleAddSkill()}
                  className="flex-1 p-2 text-xs border border-slate-300 rounded-lg focus:outline-indigo-500"
                />
                <select
                  value={newSkillCategory}
                  onChange={(e) => setNewSkillCategory(e.target.value as SkillCategory)}
                  className="p-2 text-xs border border-slate-300 rounded-lg bg-white"
                >
                  <option value="languages">Languages</option>
                  <option value="frameworks">Frameworks</option>
                  <option value="databases">Databases</option>
                  <option value="cloud">Cloud / DevOps</option>
                  <option value="developerTools">Developer Tools</option>
                  <option value="ai">AI / LLM</option>
                </select>
                <button
                  onClick={handleAddSkill}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-4 py-2 rounded-lg"
                >
                  Add Skill
                </button>
              </div>

              {/* Skill Pills */}
              <div className="flex flex-wrap gap-2 pt-2">
                {skillsList.map((skill) => (
                  <span
                    key={skill.id}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-100 text-slate-800 border border-slate-200"
                  >
                    <span>{skill.name}</span>
                    <button
                      onClick={() => handleDeleteSkill(skill.id)}
                      className="text-slate-400 hover:text-rose-600 ml-1"
                    >
                      ×
                    </button>
                  </span>
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
                  onClick={handleAddProject}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Project
                </button>
              </div>

              <div className="space-y-4">
                {projectList.map((proj) => (
                  <div key={proj.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-bold text-slate-900 text-sm">{proj.name}</h4>
                        <p className="text-xs text-slate-600 mt-0.5">{proj.shortDescription}</p>
                      </div>
                      <button
                        onClick={() => handleDeleteProject(proj.id)}
                        className="text-slate-400 hover:text-rose-600 p-1 rounded"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    {proj.problemStatement && (
                      <div className="text-xs bg-white p-2.5 rounded-lg border border-slate-100 space-y-1">
                        <strong className="text-slate-700 block text-[11px]">Problem & Solution:</strong>
                        <p className="text-slate-600 text-[11px]">{proj.problemStatement}</p>
                      </div>
                    )}

                    <div className="flex flex-wrap gap-1 pt-1">
                      {proj.technologies.map((t, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* SECTION 8: ANSWER BANK */}
          {activeNav === 'answers' && (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-2xs space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-lg font-bold text-slate-900">Reusable Answer Bank</h2>
                  <p className="text-xs text-slate-500">Pre-drafted answers for recurring application questions.</p>
                </div>
                <button
                  onClick={handleAddAnswer}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Add Answer
                </button>
              </div>

              {/* Filters */}
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                  <input
                    type="text"
                    placeholder="Search questions or keywords..."
                    value={answerSearchQuery}
                    onChange={(e) => setAnswerSearchQuery(e.target.value)}
                    className="w-full pl-8 pr-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-indigo-500"
                  />
                </div>
              </div>

              {/* Answers List */}
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
                        <span className="font-bold text-slate-800 text-xs">{ans.question}</span>
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(ans.answer);
                              setCopiedKey(ans.id);
                              setTimeout(() => setCopiedKey(null), 2000);
                            }}
                            className="p-1 text-slate-400 hover:text-indigo-600 rounded"
                            title="Copy to clipboard"
                          >
                            {copiedKey === ans.id ? (
                              <Check className="w-4 h-4 text-emerald-600" />
                            ) : (
                              <Copy className="w-4 h-4" />
                            )}
                          </button>
                          <button
                            onClick={() => handleDeleteAnswer(ans.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 leading-relaxed bg-white p-2.5 rounded-lg border border-slate-100 whitespace-pre-wrap">
                        {ans.answer}
                      </p>
                    </div>
                  ))}
              </div>
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
                  onClick={handleAddApplication}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white font-medium text-xs px-3 py-1.5 rounded-lg flex items-center gap-1.5 shadow-sm"
                >
                  <Plus className="w-3.5 h-3.5" /> Log Application
                </button>
              </div>

              <div className="space-y-3">
                {applicationList.map((app) => (
                  <div key={app.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50 flex items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <strong className="text-slate-900 text-sm">{app.companyName}</strong>
                        <span className="text-xs text-indigo-600 font-medium">• {app.jobTitle}</span>
                      </div>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Applied: {app.applicationDate.slice(0, 10)} {app.notes ? `• ${app.notes}` : ''}
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
                        onClick={() => handleDeleteApplication(app.id)}
                        className="text-slate-400 hover:text-rose-600 p-1"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
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
                  <h3 className="font-semibold text-slate-800 text-sm">AI Copilot Configuration</h3>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">Provider</label>
                      <select
                        value={settings.aiProvider}
                        onChange={(e) =>
                          setSettings({ ...settings, aiProvider: e.target.value as 'groq' | 'gemini' })
                        }
                        className="w-full p-2 border border-slate-300 rounded-lg bg-white"
                      >
                        <option value="groq">Groq (Llama 3.3 70B)</option>
                        <option value="gemini">Google Gemini 1.5</option>
                      </select>
                    </div>
                    <div>
                      <label className="block font-medium text-slate-700 mb-1">API Key (Stored locally)</label>
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
                      triggerToast('Settings saved!');
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
    </div>
  );
};
