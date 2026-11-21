export interface PersonalInfo {
  firstName: string;
  middleName?: string;
  lastName: string;
  fullName: string;
  email: string;
  phone: string;
  alternatePhone?: string;
  dateOfBirth?: string;
  gender?: string;
  race?: string;
}

export interface AddressInfo {
  addressLine1: string;
  addressLine2?: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
}

export interface ProfessionalLinks {
  linkedInUrl: string;
  githubUrl: string;
  portfolioUrl?: string;
  personalWebsite?: string;
  otherLinks?: { label: string; url: string }[];
}

export interface EducationRecord {
  id: string;
  institution: string;
  degree: string;
  branch: string;
  startYear: string;
  graduationYear: string;
  cgpa: string;
  coursework?: string;
  additionalDetails?: string;
}

export interface ExperienceRecord {
  id: string;
  companyName: string;
  designation: string;
  employmentType: 'Full-time' | 'Part-time' | 'Internship' | 'Contract';
  startDate: string;
  endDate?: string;
  currentlyWorking: boolean;
  description: string;
  technologies: string[];
  responsibilities?: string;
  achievements?: string;
}

export type SkillCategory = 'languages' | 'frameworks' | 'databases' | 'cloud' | 'developerTools' | 'ai' | 'other';

export interface SkillItem {
  id: string;
  name: string;
  category: SkillCategory;
  proficiency?: 'Beginner' | 'Intermediate' | 'Advanced' | 'Expert';
}

export interface ResumeRecord {
  id: string;
  name: string;
  fileName: string;
  fileType: string;
  fileSize: number;
  uploadedAt: string;
  isDefault: boolean;
  roleCategory: string;
  blobData?: Blob; // stored in IndexedDB
}

export interface ProjectRecord {
  id: string;
  name: string;
  shortDescription: string;
  detailedDescription: string;
  problemStatement?: string;
  solution?: string;
  keyFeatures?: string;
  contribution?: string;
  githubUrl?: string;
  liveUrl?: string;
  technologies: string[];
  startDate?: string;
  endDate?: string;
  category?: string;
  achievements?: string;
}

export interface CertificateRecord {
  id: string;
  name: string;
  issuer: string;
  issueDate?: string;
  credentialId?: string;
  credentialUrl?: string;
}

export type AnswerCategory =
  | 'Personal'
  | 'Introduction'
  | 'Education'
  | 'Experience'
  | 'Technical'
  | 'Projects'
  | 'Behavioral'
  | 'Salary'
  | 'Availability'
  | 'Relocation'
  | 'Work Authorization'
  | 'Other';

export interface SavedAnswer {
  id: string;
  question: string;
  answer: string;
  category: AnswerCategory;
  tags: string[];
  relatedProjectId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface JobPreferences {
  preferredTitles: string[];
  employmentType: ('Full-time' | 'Internship' | 'Contract')[];
  preferredLocations: string[];
  workModel: 'Remote' | 'Hybrid' | 'On-site' | 'Flexible';
  expectedCompensation?: string;
  currentCompensation?: string;
  noticePeriodDays?: string;
  availabilityDate?: string;
  willingToRelocate: boolean;
  workAuthorizationStatus: string;
  requiresVisaSponsorship: boolean;
}

export type ApplicationStatus =
  | 'Saved'
  | 'Planned'
  | 'Applied'
  | 'Assessment'
  | 'Interview'
  | 'Offer'
  | 'Rejected'
  | 'Withdrawn';

export interface ApplicationRecord {
  id: string;
  companyName: string;
  jobTitle: string;
  jobDescription?: string;
  jobUrl: string;
  platform?: string;
  applicationDate: string;
  resumeId?: string;
  status: ApplicationStatus;
  notes?: string;
  interviewDate?: string;
  followUpDate?: string;
  createdAt: string;
  updatedAt: string;
}

export interface AppSettings {
  aiEnabled: boolean;
  aiProvider: 'groq' | 'gemini' | 'custom';
  aiApiKey?: string;
  aiModel?: string;
  autofillHighlight: boolean;
  showConfidenceScores: boolean;
  soundEffects: boolean;
  theme: 'light' | 'dark' | 'system';
}

export interface UserProfile {
  id: string;
  personal: PersonalInfo;
  address: AddressInfo;
  links: ProfessionalLinks;
  preferences: JobPreferences;
  createdAt: string;
  updatedAt: string;
}
