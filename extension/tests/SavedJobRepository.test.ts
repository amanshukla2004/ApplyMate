import { describe, it, expect, beforeEach } from 'vitest';
import { savedJobRepository } from '../src/services/savedJob/savedJobRepository';
import { indexedDBClient } from '../src/services/storage/indexedDB';
import { SavedJobRecord } from '../src/types/savedJob';

describe('SavedJobRepository', () => {
  beforeEach(async () => {
    await indexedDBClient.clearAllStores();
  });

  const createDummyJob = (id: string, title: string, createdAt: string): SavedJobRecord => ({
    id,
    rawText: `Raw text for ${title}`,
    type: 'email',
    jobTitle: title,
    company: 'TechCorp',
    applyEmail: 'jobs@techcorp.com',
    requiredSubject: `Application: ${title}`,
    requiredInstructions: 'Attach CV',
    formLink: null,
    formQuestions: [],
    deadline: null,
    summary: 'Senior software engineering role.',
    status: 'to-apply',
    extractionStatus: 'success',
    createdAt,
    updatedAt: createdAt,
  });

  it('saves and retrieves a saved job by ID', async () => {
    const job = createDummyJob('job-1', 'Frontend Engineer', new Date().toISOString());
    await savedJobRepository.save(job);

    const retrieved = await savedJobRepository.getById('job-1');
    expect(retrieved).not.toBeNull();
    expect(retrieved?.jobTitle).toBe('Frontend Engineer');
    expect(retrieved?.applyEmail).toBe('jobs@techcorp.com');
    expect(retrieved?.rawText).toBe('Raw text for Frontend Engineer');
  });

  it('returns all jobs sorted in descending order by createdAt', async () => {
    const jobOld = createDummyJob('job-old', 'Old Role', '2026-11-01T10:00:00.000Z');
    const jobNew = createDummyJob('job-new', 'New Role', '2026-11-20T10:00:00.000Z');
    const jobMid = createDummyJob('job-mid', 'Mid Role', '2026-11-10T10:00:00.000Z');

    await savedJobRepository.save(jobOld);
    await savedJobRepository.save(jobNew);
    await savedJobRepository.save(jobMid);

    const all = await savedJobRepository.getAll();
    expect(all.length).toBe(3);
    expect(all[0].id).toBe('job-new');
    expect(all[1].id).toBe('job-mid');
    expect(all[2].id).toBe('job-old');
  });

  it('supports getRecent with limit', async () => {
    for (let i = 1; i <= 6; i++) {
      const date = `2026-11-0${i}T10:00:00.000Z`;
      await savedJobRepository.save(createDummyJob(`job-${i}`, `Role ${i}`, date));
    }

    const recent = await savedJobRepository.getRecent(3);
    expect(recent.length).toBe(3);
    expect(recent[0].id).toBe('job-6');
    expect(recent[1].id).toBe('job-5');
    expect(recent[2].id).toBe('job-4');
  });

  it('updates partial fields of an existing job', async () => {
    const job = createDummyJob('job-edit', 'Junior Dev', new Date().toISOString());
    await savedJobRepository.save(job);

    const updated = await savedJobRepository.update('job-edit', {
      jobTitle: 'Senior Dev',
      status: 'applied',
    });

    expect(updated.jobTitle).toBe('Senior Dev');
    expect(updated.status).toBe('applied');
    // Ensure rawText is untouched
    expect(updated.rawText).toBe('Raw text for Junior Dev');

    const fresh = await savedJobRepository.getById('job-edit');
    expect(fresh?.jobTitle).toBe('Senior Dev');
    expect(fresh?.status).toBe('applied');
  });

  it('throws an error if attempting to update a non-existent job', async () => {
    await expect(savedJobRepository.update('non-existent-id', { status: 'applied' })).rejects.toThrow(
      'Saved job with id non-existent-id not found.'
    );
  });

  it('deletes a job by ID', async () => {
    const job = createDummyJob('job-del', 'To Delete', new Date().toISOString());
    await savedJobRepository.save(job);

    const result = await savedJobRepository.delete('job-del');
    expect(result).toBe(true);

    const retrieved = await savedJobRepository.getById('job-del');
    expect(retrieved).toBeNull();
  });
});
