import { describe, it, expect, beforeEach } from 'vitest';
import { profileService } from '../src/services/profileService';
import { indexedDBClient } from '../src/services/storage/indexedDB';

describe('ProfileService', () => {
  beforeEach(async () => {
    await indexedDBClient.clearAllStores();
  });

  it('initializes default profile if none exists', async () => {
    const profile = await profileService.getProfile();
    expect(profile).toBeDefined();
    expect(profile.id).toBe('default-profile');
  });

  it('updates personal details and calculates full name', async () => {
    const updated = await profileService.updateProfile({
      personal: {
        firstName: 'Jane',
        lastName: 'Doe',
        fullName: 'Jane Doe',
        email: 'jane@example.com',
        phone: '+1-555-0199',
      },
    });

    expect(updated.personal.firstName).toBe('Jane');
    expect(updated.personal.fullName).toBe('Jane Doe');

    const fetched = await profileService.getProfile();
    expect(fetched.personal.email).toBe('jane@example.com');
  });

  it('calculates profile completeness correctly', async () => {
    const profile = await profileService.getProfile();
    const completeness = profileService.calculateCompleteness(profile, [], [], [], 0);
    expect(completeness).toBe(0);

    const filledProfile = await profileService.updateProfile({
      personal: {
        firstName: 'John',
        lastName: 'Smith',
        fullName: 'John Smith',
        email: 'john@example.com',
        phone: '1234567890',
      },
      address: {
        addressLine1: '123 Main St',
        city: 'San Francisco',
        state: 'CA',
        country: 'USA',
        postalCode: '94105',
      },
      links: {
        linkedInUrl: 'https://linkedin.com/in/john',
        githubUrl: 'https://github.com/john',
      },
    });

    const score = profileService.calculateCompleteness(filledProfile, [], [], [], 0);
    expect(score).toBeGreaterThanOrEqual(50);
  });

  it('manages education CRUD records', async () => {
    const record = await profileService.saveEducation({
      id: 'edu-1',
      institution: 'MIT',
      degree: 'B.S.',
      branch: 'Computer Science',
      startYear: '2019',
      graduationYear: '2023',
      cgpa: '3.9',
    });

    expect(record.institution).toBe('MIT');

    const list = await profileService.getEducation();
    expect(list.length).toBe(1);

    await profileService.deleteEducation('edu-1');
    const remaining = await profileService.getEducation();
    expect(remaining.length).toBe(0);
  });
});
