import { indexedDBClient, STORES } from './storage/indexedDB';
import { ResumeRecord } from '../types/profile';

export class ResumeService {
  async getResumes(): Promise<ResumeRecord[]> {
    return indexedDBClient.getAll<ResumeRecord>(STORES.RESUMES);
  }

  async getResumeById(id: string): Promise<ResumeRecord | null> {
    return indexedDBClient.getById<ResumeRecord>(STORES.RESUMES, id);
  }

  async getDefaultResume(): Promise<ResumeRecord | null> {
    const resumes = await this.getResumes();
    return resumes.find((r) => r.isDefault) || resumes[0] || null;
  }

  async saveResume(file: File, name: string, roleCategory: string = 'General'): Promise<ResumeRecord> {
    const existing = await this.getResumes();
    const isFirst = existing.length === 0;

    const record: ResumeRecord = {
      id: `resume-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      name: name || file.name.replace(/\.[^/.]+$/, ''),
      fileName: file.name,
      fileType: file.type || 'application/pdf',
      fileSize: file.size,
      uploadedAt: new Date().toISOString(),
      isDefault: isFirst,
      roleCategory: roleCategory || 'General',
      blobData: file,
    };

    return indexedDBClient.put(STORES.RESUMES, record);
  }

  async setDefaultResume(id: string): Promise<void> {
    const resumes = await this.getResumes();
    for (const resume of resumes) {
      if (resume.id === id && !resume.isDefault) {
        resume.isDefault = true;
        await indexedDBClient.put(STORES.RESUMES, resume);
      } else if (resume.id !== id && resume.isDefault) {
        resume.isDefault = false;
        await indexedDBClient.put(STORES.RESUMES, resume);
      }
    }
  }

  async deleteResume(id: string): Promise<boolean> {
    const success = await indexedDBClient.delete(STORES.RESUMES, id);
    // If the deleted resume was default, assign default to another if available
    const remaining = await this.getResumes();
    if (remaining.length > 0 && !remaining.some((r) => r.isDefault)) {
      remaining[0].isDefault = true;
      await indexedDBClient.put(STORES.RESUMES, remaining[0]);
    }
    return success;
  }
}

export const resumeService = new ResumeService();
