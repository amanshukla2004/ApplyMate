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

  detectPlatformFromUrl(url: string): string {
    const u = (url || '').toLowerCase();
    if (u.includes('greenhouse.io')) return 'Greenhouse';
    if (u.includes('lever.co')) return 'Lever';
    if (u.includes('myworkdayjobs.com') || u.includes('workday.com')) return 'Workday';
    if (u.includes('ashbyhq.com')) return 'Ashby';
    if (u.includes('linkedin.com')) return 'LinkedIn';
    if (u.includes('docs.google.com/forms') || u.includes('forms.gle')) return 'Google Forms';
    if (u.includes('indeed.com')) return 'Indeed';
    if (u.includes('smartrecruiters.com')) return 'SmartRecruiters';
    if (u.includes('bamboohr.com')) return 'BambooHR';
    if (u.includes('jobvite.com')) return 'Jobvite';
    if (u.includes('rippling.com')) return 'Rippling';
    return 'Company Portal';
  }

  exportToCSV(applications: ApplicationRecord[]): string {
    const headers = ['Company', 'Job Title', 'Platform', 'Status', 'Application Date', 'Job URL', 'Notes'];
    const rows = applications.map((app) => [
      `"${(app.companyName || '').replace(/"/g, '""')}"`,
      `"${(app.jobTitle || '').replace(/"/g, '""')}"`,
      `"${(app.platform || this.detectPlatformFromUrl(app.jobUrl) || 'Direct').replace(/"/g, '""')}"`,
      `"${(app.status || '').replace(/"/g, '""')}"`,
      `"${(app.applicationDate || '').replace(/"/g, '""')}"`,
      `"${(app.jobUrl || '').replace(/"/g, '""')}"`,
      `"${(app.notes || '').replace(/"/g, '""')}"`,
    ]);
    return [headers.join(','), ...rows.map((r) => r.join(','))].join('\r\n');
  }
}

export const applicationService = new ApplicationService();
