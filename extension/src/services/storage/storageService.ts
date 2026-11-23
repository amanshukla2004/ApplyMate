import { indexedDBClient, STORES } from './indexedDB';
import { chromeStorageClient } from './chromeStorage';
import { profileService } from '../profileService';
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
  CertificateRecord,
} from '../../types/profile';

export interface ExportData {
  exportedAt: string;
  version: string;
  profile: UserProfile | null;
  education: EducationRecord[];
  experience: ExperienceRecord[];
  skills: SkillItem[];
  certificates?: CertificateRecord[];
  resumes: Omit<ResumeRecord, 'blobData'>[];
  projects: ProjectRecord[];
  answers: SavedAnswer[];
  applications: ApplicationRecord[];
  settings: AppSettings;
}

export class StorageService {
  async exportAllData(): Promise<ExportData> {
    const profiles = await indexedDBClient.getAll<UserProfile>(STORES.PROFILES);
    const education = await indexedDBClient.getAll<EducationRecord>(STORES.EDUCATION);
    const experience = await indexedDBClient.getAll<ExperienceRecord>(STORES.EXPERIENCE);
    const skills = await indexedDBClient.getAll<SkillItem>(STORES.SKILLS);
    const resumes = await indexedDBClient.getAll<ResumeRecord>(STORES.RESUMES);
    const projects = await indexedDBClient.getAll<ProjectRecord>(STORES.PROJECTS);
    const answers = await indexedDBClient.getAll<SavedAnswer>(STORES.ANSWERS);
    const applications = await indexedDBClient.getAll<ApplicationRecord>(STORES.APPLICATIONS);
    const settings = await chromeStorageClient.getSettings();

    // Fetch certificates
    let certificates: CertificateRecord[] = [];
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      certificates = await new Promise<CertificateRecord[]>((resolve) => {
        chrome.storage.local.get(['applymate_certificates'], (res) => {
          resolve(res.applymate_certificates || []);
        });
      });
    } else {
      try {
        const raw = localStorage.getItem('applymate_certificates');
        if (raw) certificates = JSON.parse(raw);
      } catch {
        // ignore
      }
    }

    // Strip blobData from exported JSON
    const sanitizedResumes = resumes.map((r) => {
      const { blobData: _, ...rest } = r;
      return rest;
    });

    // Strip sensitive secrets (API keys) from exported backup
    const { aiApiKey: _, ...safeSettings } = settings;

    return {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      profile: profiles[0] || null,
      education,
      experience,
      skills,
      certificates,
      resumes: sanitizedResumes,
      projects,
      answers,
      applications,
      settings: safeSettings as AppSettings,
    };
  }

  private sanitizePayload<T>(input: T, depth = 0): T {
    if (depth > 10) return null as unknown as T;
    if (!input || typeof input !== 'object') {
      if (typeof input === 'string' && input.length > 50000) {
        return input.slice(0, 50000) as unknown as T;
      }
      return input;
    }
    if (Array.isArray(input)) {
      const capped = input.slice(0, 1000);
      return capped.map((item) => this.sanitizePayload(item, depth + 1)) as unknown as T;
    }
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(input)) {
      if (k === '__proto__' || k === 'constructor' || k === 'prototype') {
        continue;
      }
      // Never import or overwrite active AI API keys from external JSON backups
      if (k === 'aiApiKey') {
        continue;
      }
      clean[k] = v && typeof v === 'object' ? this.sanitizePayload(v, depth + 1) : (typeof v === 'string' && v.length > 50000 ? v.slice(0, 50000) : v);
    }
    return clean as T;
  }

  async importAllData(data: Partial<ExportData>): Promise<boolean> {
    if (!data || typeof data !== 'object') {
      throw new Error('Invalid import data format');
    }
    const safeData = this.sanitizePayload(data);

    if (safeData.profile) {
      await indexedDBClient.put(STORES.PROFILES, safeData.profile);
    }
    if (safeData.education && Array.isArray(safeData.education)) {
      for (const item of safeData.education) {
        await indexedDBClient.put(STORES.EDUCATION, item);
      }
    }
    if (safeData.experience && Array.isArray(safeData.experience)) {
      for (const item of safeData.experience) {
        await indexedDBClient.put(STORES.EXPERIENCE, item);
      }
    }
    if (safeData.skills && Array.isArray(safeData.skills)) {
      for (const item of safeData.skills) {
        await indexedDBClient.put(STORES.SKILLS, item);
      }
    }
    if (safeData.certificates && Array.isArray(safeData.certificates)) {
      if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
        await new Promise<void>((resolve) => {
          chrome.storage.local.set({ applymate_certificates: safeData.certificates }, () => resolve());
        });
      } else {
        localStorage.setItem('applymate_certificates', JSON.stringify(safeData.certificates));
      }
    }
    if (safeData.projects && Array.isArray(safeData.projects)) {
      for (const item of safeData.projects) {
        await indexedDBClient.put(STORES.PROJECTS, item);
      }
    }
    if (safeData.answers && Array.isArray(safeData.answers)) {
      for (const item of safeData.answers) {
        await indexedDBClient.put(STORES.ANSWERS, item);
      }
    }
    if (safeData.applications && Array.isArray(safeData.applications)) {
      for (const item of safeData.applications) {
        await indexedDBClient.put(STORES.APPLICATIONS, item);
      }
    }
    if (safeData.settings) {
      await chromeStorageClient.saveSettings(safeData.settings);
    }
    profileService.clearCache();
    return true;
  }

  async wipeAllData(): Promise<void> {
    await indexedDBClient.clearAllStores();
    await chromeStorageClient.clearSettings();
    profileService.clearCache();
    if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
      chrome.storage.local.remove(['applymate_certificates']);
    } else {
      localStorage.removeItem('applymate_certificates');
    }
  }
}

export const storageService = new StorageService();
