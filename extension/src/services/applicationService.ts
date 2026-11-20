import { indexedDBClient, STORES } from './storage/indexedDB';
import { ApplicationRecord, ApplicationStatus } from '../types/profile';

export interface ApplicationStats {
  total: number;
  applied: number;
  interview: number;
  offer: number;
  rejected: number;
  activeCount: number;
}

export class ApplicationService {
  async getApplications(): Promise<ApplicationRecord[]> {
    const records = await indexedDBClient.getAll<ApplicationRecord>(STORES.APPLICATIONS);
    // Sort descending by applicationDate
    return records.sort((a, b) => new Date(b.applicationDate).getTime() - new Date(a.applicationDate).getTime());
  }

  async getApplicationById(id: string): Promise<ApplicationRecord | null> {
    return indexedDBClient.getById<ApplicationRecord>(STORES.APPLICATIONS, id);
  }

  async saveApplication(app: ApplicationRecord): Promise<ApplicationRecord> {
    const now = new Date().toISOString();
    const updated: ApplicationRecord = {
      ...app,
      updatedAt: now,
      createdAt: app.createdAt || now,
    };
    return indexedDBClient.put(STORES.APPLICATIONS, updated);
  }

  async updateStatus(id: string, status: ApplicationStatus): Promise<ApplicationRecord | null> {
    const app = await this.getApplicationById(id);
    if (!app) return null;
    app.status = status;
    return this.saveApplication(app);
  }

  async deleteApplication(id: string): Promise<boolean> {
    return indexedDBClient.delete(STORES.APPLICATIONS, id);
  }

  async getStats(): Promise<ApplicationStats> {
    const apps = await this.getApplications();
    return {
      total: apps.length,
      applied: apps.filter((a) => a.status === 'Applied').length,
      interview: apps.filter((a) => a.status === 'Interview' || a.status === 'Assessment').length,
      offer: apps.filter((a) => a.status === 'Offer').length,
      rejected: apps.filter((a) => a.status === 'Rejected').length,
      activeCount: apps.filter((a) => ['Applied', 'Assessment', 'Interview'].includes(a.status)).length,
    };
  }
}

export const applicationService = new ApplicationService();
