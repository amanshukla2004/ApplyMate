import { describe, it, expect } from 'vitest';
import { FieldMatcher } from '../src/content/fieldMatcher';

describe('FieldMatcher', () => {
  it('correctly matches First Name attributes', () => {
    const res = FieldMatcher.match('first_name', 'candidate_first_name', 'First Name', 'Enter your given name');
    expect(res.canonicalField).toBe('FIRST_NAME');
    expect(res.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('correctly matches Last Name attributes', () => {
    const res = FieldMatcher.match('lastName', 'surname', 'Last Name');
    expect(res.canonicalField).toBe('LAST_NAME');
    expect(res.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('correctly matches Email with autocomplete', () => {
    const res = FieldMatcher.match('user_email', 'email', 'Work Email', '', 'email');
    expect(res.canonicalField).toBe('EMAIL');
    expect(res.confidence).toBeGreaterThanOrEqual(0.9);
  });

  it('correctly matches Phone Number', () => {
    const res = FieldMatcher.match('mobile', 'phone_number', 'Cell Phone / Mobile', '+1 (555) 000-0000');
    expect(res.canonicalField).toBe('PHONE');
    expect(res.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('correctly matches LinkedIn URL', () => {
    const res = FieldMatcher.match('urls[LinkedIn]', 'linkedin_profile', 'LinkedIn URL');
    expect(res.canonicalField).toBe('LINKEDIN_URL');
    expect(res.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('correctly matches Resume upload input', () => {
    const res = FieldMatcher.match('resume', 'attach_resume', 'Upload Resume / CV');
    expect(res.canonicalField).toBe('RESUME');
    expect(res.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('returns low confidence for unknown custom question', () => {
    const res = FieldMatcher.match('custom_prompt_xyz', 'q99', 'What is your favorite book?');
    expect(res.confidence).toBeLessThan(0.6);
  });
});
