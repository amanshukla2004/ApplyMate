import { describe, it, expect, beforeEach } from 'vitest';
import { JobExtractorService } from '../src/services/savedJob/jobExtractorService';
import { SavedJobExtractionSchema } from '../src/types/savedJob';
import { chromeStorageClient } from '../src/services/storage/chromeStorage';

describe('JobExtractorService & SavedJobExtractionSchema', () => {
  beforeEach(async () => {
    // Reset settings so AI is disabled by default for unit tests
    await chromeStorageClient.saveSettings({
      aiEnabled: false,
      aiProvider: 'groq',
      aiApiKey: '',
      aiModel: 'llama-3.3-70b-versatile',
      autofillHighlight: true,
      showConfidenceScores: true,
      soundEffects: false,
      theme: 'dark',
    });
  });

  describe('Zod Schema Validation', () => {
    it('validates a complete extraction payload', () => {
      const validPayload = {
        type: 'email',
        jobTitle: 'Frontend Engineer',
        company: 'Stripe',
        applyEmail: 'jobs@stripe.com',
        requiredSubject: 'Application: Frontend Engineer',
        requiredInstructions: 'Attach PDF resume and GitHub profile',
        formLink: null,
        formQuestions: ['What is your notice period?'],
        deadline: '2026-12-01',
        summary: 'Frontend role at Stripe focusing on payments dashboard.',
      };

      const result = SavedJobExtractionSchema.safeParse(validPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('email');
        expect(result.data.applyEmail).toBe('jobs@stripe.com');
      }
    });

    it('handles nullable and missing fields gracefully', () => {
      const minimalPayload = {
        type: 'form',
        jobTitle: null,
        company: null,
        applyEmail: null,
        requiredSubject: null,
        requiredInstructions: null,
        formLink: 'https://forms.gle/test',
        formQuestions: [],
        deadline: null,
        summary: null,
      };

      const result = SavedJobExtractionSchema.safeParse(minimalPayload);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.type).toBe('form');
        expect(result.data.formLink).toBe('https://forms.gle/test');
        expect(result.data.jobTitle).toBeNull();
      }
    });

    it('rejects invalid job types', () => {
      const invalidPayload = {
        type: 'invalid-type-123',
        jobTitle: 'Developer',
      };

      const result = SavedJobExtractionSchema.safeParse(invalidPayload);
      expect(result.success).toBe(false);
    });
  });

  describe('Heuristic Extraction', () => {
    it('extracts email address and exact subject line from email job postings', () => {
      const postText = `
        We are looking for a Senior React Developer to join our core team!
        Please send your resume to careers@innovatetech.io with subject 'Application - Senior React Dev - 2026'.
        Include your current notice period and portfolio link.
      `;

      const result = JobExtractorService.extractHeuristically(postText);
      expect(result.type).toBe('email');
      expect(result.applyEmail).toBe('careers@innovatetech.io');
      expect(result.requiredSubject).toBe('Application - Senior React Dev - 2026');
    });

    it('detects Google Forms and job portal links as form applications', () => {
      const formPost = `
        Hiring Founding Product Designer!
        Fill out this quick application form to apply: https://forms.gle/AbCdEf12345
      `;

      const result = JobExtractorService.extractHeuristically(formPost);
      expect(result.type).toBe('form');
      expect(result.formLink).toBe('https://forms.gle/AbCdEf12345');
    });

    it('identifies standalone URL pastes as form applications', () => {
      const rawUrl = 'https://jobs.lever.co/company/a1b2c3d4-5678-90ab';
      const result = JobExtractorService.extractHeuristically(rawUrl);
      expect(result.type).toBe('form');
      expect(result.formLink).toBe(rawUrl);
    });

    it('extracts numbered or bulleted interview/form questions', () => {
      const postWithQuestions = `
        To apply, please provide answers to the following questions:
        1. What is your experience with React 19?
        2. Describe a challenging performance bug you fixed.
        3. Tell us why you want to work at Acme Corp?
      `;

      const result = JobExtractorService.extractHeuristically(postWithQuestions);
      expect(result.formQuestions.length).toBe(3);
      expect(result.formQuestions[0]).toContain('What is your experience with React 19?');
      expect(result.formQuestions[1]).toContain('performance bug');
    });
  });

  describe('extract() safe fallback when AI is disabled or unconfigured', () => {
    it('falls back to deterministic heuristics and stores rawText without crashing', async () => {
      const raw = 'Send details to hr@startuphq.co with subject line: Frontend Specialist';
      const result = await JobExtractorService.extract(raw);

      expect(result.extractionStatus).toBe('success');
      expect(result.applyEmail).toBe('hr@startuphq.co');
      expect(result.requiredSubject).toBe('Frontend Specialist');
      expect(result.type).toBe('email');
    });
  });
});
