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

  it('correctly matches University NOC question to UNIVERSITY_NOC and NOT COLLEGE', () => {
    const res = FieldMatcher.match('', '', 'Are your university will be able to provide an "No Objection Certificate" *');
    expect(res.canonicalField).toBe('UNIVERSITY_NOC');
    expect(res.canonicalField).not.toBe('COLLEGE');
    expect(res.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('matches College when specifically asking for institution name', () => {
    const res = FieldMatcher.match('school', 'college', 'College / University');
    expect(res.canonicalField).toBe('COLLEGE');
    expect(res.confidence).toBeGreaterThanOrEqual(0.8);
  });

  it('returns low confidence for unknown custom question', () => {
    const res = FieldMatcher.match('custom_prompt_xyz', 'q99', 'What is your favorite book?');
    expect(res.confidence).toBeLessThan(0.6);
  });

  it('never matches long narrative essay questions containing "website" to PORTFOLIO_URL', () => {
    const res = FieldMatcher.match(
      '',
      '',
      'Tell us about a product or an app or a website that you built or participated in building as a side project or as a part of an internship? What was the problem that you were solving? What was the result/ impact. Please ensure you share the numerical impact? *'
    );
    expect(res.canonicalField).not.toBe('PORTFOLIO_URL');
  });

  it('correctly matches social fields LinkedIn and Facebook despite casing or spacing variants', () => {
    const r1 = FieldMatcher.match('', '', 'LinkedIn');
    expect(r1.canonicalField).toBe('LINKEDIN_URL');
    expect(r1.confidence).toBeGreaterThanOrEqual(0.85);

    const r2 = FieldMatcher.match('', '', 'Linked In S');
    expect(r2.canonicalField).toBe('LINKEDIN_URL');
    expect(r2.confidence).toBeGreaterThanOrEqual(0.85);

    const r3 = FieldMatcher.match('', '', 'Facebook S');
    expect(r3.canonicalField).toBe('FACEBOOK_URL');
    expect(r3.confidence).toBeGreaterThanOrEqual(0.85);
  });

  it('correctly matches Resume Drive Link and Google Drive URL', () => {
    const r1 = FieldMatcher.match('resume_link', 'resume_url', 'Resume Link');
    expect(r1.canonicalField).toBe('RESUME_URL');
    expect(r1.confidence).toBeGreaterThanOrEqual(0.85);

    const r2 = FieldMatcher.match('', '', 'Google Drive link to resume *');
    expect(r2.canonicalField).toBe('RESUME_URL');
    expect(r2.confidence).toBeGreaterThanOrEqual(0.85);
  });
});
