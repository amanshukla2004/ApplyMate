import { indexedDBClient, STORES } from './indexedDB';
import { chromeStorageClient } from './chromeStorage';
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
} from '../../types/profile';

export interface ExportData {
  exportedAt: string;
  version: string;
  profile: UserProfile | null;
  education: EducationRecord[];
  experience: ExperienceRecord[];
  skills: SkillItem[];
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

    // Strip blobData from exported JSON
    const sanitizedResumes = resumes.map((r) => {
      const { blobData: _, ...rest } = r;
      return rest;
    });

    return {
      exportedAt: new Date().toISOString(),
      version: '1.0.0',
      profile: profiles[0] || null,
      education,
      experience,
      skills,
      resumes: sanitizedResumes,
      projects,
      answers,
      applications,
      settings,
    };
  }

  async importAllData(data: Partial<ExportData>): Promise<boolean> {
    if (data.profile) {
      await indexedDBClient.put(STORES.PROFILES, data.profile);
    }
    if (data.education && Array.isArray(data.education)) {
      for (const item of data.education) {
        await indexedDBClient.put(STORES.EDUCATION, item);
      }
    }
    if (data.experience && Array.isArray(data.experience)) {
      for (const item of data.experience) {
        await indexedDBClient.put(STORES.EXPERIENCE, item);
      }
    }
    if (data.skills && Array.isArray(data.skills)) {
      for (const item of data.skills) {
        await indexedDBClient.put(STORES.SKILLS, item);
      }
    }
    if (data.projects && Array.isArray(data.projects)) {
      for (const item of data.projects) {
        await indexedDBClient.put(STORES.PROJECTS, item);
      }
    }
    if (data.answers && Array.isArray(data.answers)) {
      for (const item of data.answers) {
        await indexedDBClient.put(STORES.ANSWERS, item);
      }
    }
    if (data.applications && Array.isArray(data.applications)) {
      for (const item of data.applications) {
        await indexedDBClient.put(STORES.APPLICATIONS, item);
      }
    }
    if (data.settings) {
      await chromeStorageClient.saveSettings(data.settings);
    }
    return true;
  }

  async wipeAllData(): Promise<void> {
    await indexedDBClient.clearAllStores();
    await chromeStorageClient.clearSettings();
  }
}

export const storageService = new StorageService();
