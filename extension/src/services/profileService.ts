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
  private cachedProfile: UserProfile | null = null;
  private cachedEducation: EducationRecord[] | null = null;
  private cachedExperience: ExperienceRecord[] | null = null;
  private cachedSkills: SkillItem[] | null = null;

  clearCache(): void {
    this.cachedProfile = null;
    this.cachedEducation = null;
    this.cachedExperience = null;
    this.cachedSkills = null;
  }

  async getProfile(): Promise<UserProfile> {
    if (this.cachedProfile) {
      return this.cachedProfile;
    }
    const profile = await indexedDBClient.getById<UserProfile>(STORES.PROFILES, DEFAULT_PROFILE_ID);
    if (!profile) {
      await indexedDBClient.put(STORES.PROFILES, INITIAL_PROFILE);
      this.cachedProfile = INITIAL_PROFILE;
      return INITIAL_PROFILE;
    }
    this.cachedProfile = profile;
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
    const saved = await indexedDBClient.put(STORES.PROFILES, updated);
    this.cachedProfile = saved;
    return saved;
  }

  async updatePreferences(preferences: Partial<JobPreferences>): Promise<UserProfile> {
    const current = await this.getProfile();
    return this.updateProfile({
      preferences: { ...current.preferences, ...preferences },
    });
  }

  // Education CRUD
  async getEducation(): Promise<EducationRecord[]> {
    if (this.cachedEducation) return this.cachedEducation;
    const res = await indexedDBClient.getAll<EducationRecord>(STORES.EDUCATION);
    this.cachedEducation = res;
    return res;
  }

  async saveEducation(record: EducationRecord): Promise<EducationRecord> {
    const saved = await indexedDBClient.put(STORES.EDUCATION, record);
    this.cachedEducation = null;
    return saved;
  }

  async deleteEducation(id: string): Promise<boolean> {
    const res = await indexedDBClient.delete(STORES.EDUCATION, id);
    this.cachedEducation = null;
    return res;
  }

  // Experience CRUD
  async getExperience(): Promise<ExperienceRecord[]> {
    if (this.cachedExperience) return this.cachedExperience;
    const res = await indexedDBClient.getAll<ExperienceRecord>(STORES.EXPERIENCE);
    this.cachedExperience = res;
    return res;
  }

  async saveExperience(record: ExperienceRecord): Promise<ExperienceRecord> {
    const saved = await indexedDBClient.put(STORES.EXPERIENCE, record);
    this.cachedExperience = null;
    return saved;
  }

  async deleteExperience(id: string): Promise<boolean> {
    const res = await indexedDBClient.delete(STORES.EXPERIENCE, id);
    this.cachedExperience = null;
    return res;
  }

  // Skills CRUD
  async getSkills(): Promise<SkillItem[]> {
    if (this.cachedSkills) return this.cachedSkills;
    const res = await indexedDBClient.getAll<SkillItem>(STORES.SKILLS);
    this.cachedSkills = res;
    return res;
  }

  async saveSkill(skill: SkillItem): Promise<SkillItem> {
    const saved = await indexedDBClient.put(STORES.SKILLS, skill);
    this.cachedSkills = null;
    return saved;
  }

  async deleteSkill(id: string): Promise<boolean> {
    const res = await indexedDBClient.delete(STORES.SKILLS, id);
    this.cachedSkills = null;
    return res;
  }

  // Profile Completeness Score (0-100%)
  calculateCompleteness(
    profile: UserProfile,
    education: EducationRecord[],
    experience: ExperienceRecord[],
    skills: SkillItem[],
    resumesCount: number,
    projectsCount: number = 0,
    certificatesCount: number = 0
  ): number {
    let score = 0;
    // Personal (25%)
    if (profile?.personal?.firstName) score += 5;
    if (profile?.personal?.lastName) score += 5;
    if (profile?.personal?.email) score += 10;
    if (profile?.personal?.phone) score += 5;

    // Address (10%)
    if (profile?.address?.city && profile?.address?.country) score += 10;
    else if (profile?.address?.city || profile?.address?.country) score += 5;

    // Links (15%)
    if (profile?.links?.linkedInUrl) score += 10;
    if (profile?.links?.githubUrl) score += 5;

    // Education (10%)
    const hasRealEdu = education?.some(e => Boolean(e.institution && e.institution.trim() !== '' && e.institution.trim() !== 'N/A'));
    if (hasRealEdu) score += 10;

    // Experience (15%)
    if (experience?.length > 0) score += 15;

    // Skills (10%)
    if (skills?.length >= 3) score += 10;
    else if (skills?.length > 0) score += 5;

    // Projects (5%)
    if (projectsCount > 0) score += 5;

    // Certificates (5%)
    if (certificatesCount > 0) score += 5;

    // Active Resume (5%)
    if (resumesCount > 0) score += 5;

    return Math.min(100, score);
  }
}

export const profileService = new ProfileService();
