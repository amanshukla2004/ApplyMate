import { indexedDBClient, STORES } from './storage/indexedDB';
import {
  UserProfile,
  EducationRecord,
  ExperienceRecord,
  SkillItem,
  JobPreferences,
} from '../types/profile';

export const DEFAULT_PROFILE_ID = 'default-profile';

const INITIAL_PROFILE: UserProfile = {
  id: DEFAULT_PROFILE_ID,
  personal: {
    firstName: '',
    lastName: '',
    fullName: '',
    email: '',
    phone: '',
  },
  address: {
    addressLine1: '',
    city: '',
    state: '',
    country: '',
    postalCode: '',
  },
  links: {
    linkedInUrl: '',
    githubUrl: '',
  },
  preferences: {
    preferredTitles: [],
    employmentType: ['Full-time'],
    preferredLocations: [],
    workModel: 'Flexible',
    willingToRelocate: false,
    workAuthorizationStatus: 'Authorized to work',
    requiresVisaSponsorship: false,
  },
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
};

export class ProfileService {
  async getProfile(): Promise<UserProfile> {
    const profile = await indexedDBClient.getById<UserProfile>(STORES.PROFILES, DEFAULT_PROFILE_ID);
    if (!profile) {
      await indexedDBClient.put(STORES.PROFILES, INITIAL_PROFILE);
      return INITIAL_PROFILE;
    }
    return profile;
  }

  async updateProfile(updates: Partial<UserProfile>): Promise<UserProfile> {
    const current = await this.getProfile();
    const updated: UserProfile = {
      ...current,
      ...updates,
      personal: { ...current.personal, ...(updates.personal || {}) },
      address: { ...current.address, ...(updates.address || {}) },
      links: { ...current.links, ...(updates.links || {}) },
      preferences: { ...current.preferences, ...(updates.preferences || {}) },
      updatedAt: new Date().toISOString(),
    };
    // Ensure fullName is synchronized if firstName or lastName changes
    if (updated.personal.firstName || updated.personal.lastName) {
      updated.personal.fullName = `${updated.personal.firstName} ${updated.personal.lastName}`.trim();
    }
    return indexedDBClient.put(STORES.PROFILES, updated);
  }

  async updatePreferences(preferences: Partial<JobPreferences>): Promise<UserProfile> {
    const current = await this.getProfile();
    return this.updateProfile({
      preferences: { ...current.preferences, ...preferences },
    });
  }

  // Education CRUD
  async getEducation(): Promise<EducationRecord[]> {
    return indexedDBClient.getAll<EducationRecord>(STORES.EDUCATION);
  }

  async saveEducation(record: EducationRecord): Promise<EducationRecord> {
    return indexedDBClient.put(STORES.EDUCATION, record);
  }

  async deleteEducation(id: string): Promise<boolean> {
    return indexedDBClient.delete(STORES.EDUCATION, id);
  }

  // Experience CRUD
  async getExperience(): Promise<ExperienceRecord[]> {
    return indexedDBClient.getAll<ExperienceRecord>(STORES.EXPERIENCE);
  }

  async saveExperience(record: ExperienceRecord): Promise<ExperienceRecord> {
    return indexedDBClient.put(STORES.EXPERIENCE, record);
  }

  async deleteExperience(id: string): Promise<boolean> {
    return indexedDBClient.delete(STORES.EXPERIENCE, id);
  }

  // Skills CRUD
  async getSkills(): Promise<SkillItem[]> {
    return indexedDBClient.getAll<SkillItem>(STORES.SKILLS);
  }

  async saveSkill(skill: SkillItem): Promise<SkillItem> {
    return indexedDBClient.put(STORES.SKILLS, skill);
  }

  async deleteSkill(id: string): Promise<boolean> {
    return indexedDBClient.delete(STORES.SKILLS, id);
  }

  // Profile Completeness Score (0-100%)
  calculateCompleteness(
    profile: UserProfile,
    education: EducationRecord[],
    experience: ExperienceRecord[],
    skills: SkillItem[],
    resumesCount: number
  ): number {
    let score = 0;
    // Personal (30%)
    if (profile?.personal?.firstName) score += 5;
    if (profile?.personal?.lastName) score += 5;
    if (profile?.personal?.email) score += 10;
    if (profile?.personal?.phone) score += 10;

    // Address (10%)
    if (profile?.address?.city && profile?.address?.country) score += 10;

    // Links (15%)
    if (profile?.links?.linkedInUrl) score += 10;
    if (profile?.links?.githubUrl) score += 5;

    // Education (15%)
    if (education?.length > 0) score += 15;

    // Experience (10%)
    if (experience?.length > 0) score += 10;

    // Skills (10%)
    if (skills?.length >= 3) score += 10;
    else if (skills?.length > 0) score += 5;

    // Resumes (10%)
    if (resumesCount > 0) score += 10;

    return Math.min(100, score);
  }
}

export const profileService = new ProfileService();
