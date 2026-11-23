import { indexedDBClient, STORES } from '../storage/indexedDB';
import { SavedJobRecord } from '../../types/savedJob';

export interface ISavedJobRepository {
  getAll(): Promise<SavedJobRecord[]>;
  getById(id: string): Promise<SavedJobRecord | null>;
  save(job: SavedJobRecord): Promise<SavedJobRecord>;
  update(id: string, partial: Partial<SavedJobRecord>): Promise<SavedJobRecord>;
  delete(id: string): Promise<boolean>;
  getRecent(limit?: number): Promise<SavedJobRecord[]>;
}

export class SavedJobRepository implements ISavedJobRepository {
  async getAll(): Promise<SavedJobRecord[]> {
    const list = await indexedDBClient.getAll<SavedJobRecord>(STORES.SAVED_JOBS);
    return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getById(id: string): Promise<SavedJobRecord | null> {
    return indexedDBClient.getById<SavedJobRecord>(STORES.SAVED_JOBS, id);
  }

  async save(job: SavedJobRecord): Promise<SavedJobRecord> {
    return indexedDBClient.put<SavedJobRecord>(STORES.SAVED_JOBS, job);
  }

  async update(id: string, partial: Partial<SavedJobRecord>): Promise<SavedJobRecord> {
    const existing = await this.getById(id);
    if (!existing) {
      throw new Error(`Saved job with id ${id} not found.`);
    }

    const updated: SavedJobRecord = {
      ...existing,
      ...partial,
      id: existing.id, // preserve immutable ID
      updatedAt: new Date().toISOString(),
    };

    await indexedDBClient.put<SavedJobRecord>(STORES.SAVED_JOBS, updated);
    return updated;
  }

  async delete(id: string): Promise<boolean> {
    return indexedDBClient.delete(STORES.SAVED_JOBS, id);
  }

  async getRecent(limit = 5): Promise<SavedJobRecord[]> {
    const all = await this.getAll();
    return all.slice(0, limit);
  }
}

export const savedJobRepository = new SavedJobRepository();
