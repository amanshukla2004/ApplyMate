import { indexedDBClient, STORES } from './storage/indexedDB';
import { ProjectRecord } from '../types/profile';

export class ProjectService {
  async getProjects(): Promise<ProjectRecord[]> {
    return indexedDBClient.getAll<ProjectRecord>(STORES.PROJECTS);
  }

  async getProjectById(id: string): Promise<ProjectRecord | null> {
    return indexedDBClient.getById<ProjectRecord>(STORES.PROJECTS, id);
  }

  async saveProject(project: ProjectRecord): Promise<ProjectRecord> {
    return indexedDBClient.put(STORES.PROJECTS, project);
  }

  async deleteProject(id: string): Promise<boolean> {
    return indexedDBClient.delete(STORES.PROJECTS, id);
  }

  async searchProjectsByTech(techQuery: string): Promise<ProjectRecord[]> {
    const projects = await this.getProjects();
    const normalized = techQuery.toLowerCase().trim();
    return projects.filter((p) =>
      p.technologies.some((t) => t.toLowerCase().includes(normalized)) ||
      p.name.toLowerCase().includes(normalized) ||
      p.shortDescription.toLowerCase().includes(normalized)
    );
  }
}

export const projectService = new ProjectService();
