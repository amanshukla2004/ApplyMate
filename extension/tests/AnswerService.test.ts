import { describe, it, expect, beforeEach } from 'vitest';
import { answerService } from '../src/services/answerService';
import { applicationService } from '../src/services/applicationService';
import { indexedDBClient } from '../src/services/storage/indexedDB';

describe('AnswerService & ApplicationService', () => {
  beforeEach(async () => {
    await indexedDBClient.clearAllStores();
  });

  it('saves, searches, and filters answers by category', async () => {
    await answerService.saveAnswer({
      id: 'ans-1',
      question: 'What is your greatest technical accomplishment?',
      answer: 'Designed a high-throughput event processing pipeline.',
      category: 'Technical',
      tags: ['pipeline', 'architecture'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await answerService.saveAnswer({
      id: 'ans-2',
      question: 'What is your expected salary?',
      answer: '$130,000 USD / year',
      category: 'Salary',
      tags: ['compensation'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const technical = await answerService.getAnswersByCategory('Technical');
    expect(technical.length).toBe(1);
    expect(technical[0].question).toContain('accomplishment');

    const searchResults = await answerService.searchAnswers('pipeline');
    expect(searchResults.length).toBe(1);
  });

  it('tracks applications and aggregates statistics', async () => {
    await applicationService.saveApplication({
      id: 'app-1',
      companyName: 'Google',
      jobTitle: 'Software Engineer III',
      jobUrl: 'https://careers.google.com',
      applicationDate: '2026-11-01',
      status: 'Applied',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    await applicationService.saveApplication({
      id: 'app-2',
      companyName: 'Meta',
      jobTitle: 'Frontend Engineer',
      jobUrl: 'https://metacareers.com',
      applicationDate: '2026-11-05',
      status: 'Interview',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });

    const stats = await applicationService.getStats();
    expect(stats.total).toBe(2);
    expect(stats.applied).toBe(1);
    expect(stats.interview).toBe(1);
    expect(stats.activeCount).toBe(2);

    await applicationService.updateStatus('app-1', 'Offer');
    const updatedStats = await applicationService.getStats();
    expect(updatedStats.offer).toBe(1);
  });
});
