import { describe, it, expect, beforeEach } from 'vitest';
import { WorkdayAdapter } from '../src/adapters/workday/WorkdayAdapter';
import { aiService } from '../src/services/ai/aiService';
import { UserProfile, ProjectRecord, ExperienceRecord } from '../src/types/profile';

describe('Feature 2: Workday Multi-Page Form Wizard Automator', () => {
  let adapter: WorkdayAdapter;

  beforeEach(() => {
    document.body.innerHTML = '';
    adapter = new WorkdayAdapter();
  });

  it('detects Workday step title from data-automation-id="pageHeader"', () => {
    document.body.innerHTML = `
      <div data-automation-id="pageHeader">My Experience</div>
      <form data-automation-id="form">
        <input type="text" name="company" />
      </form>
    `;

    const step = adapter.getCurrentStepTitle(document);
    expect(step).toBe('My Experience');

    const meta = adapter.getMetadata();
    expect(meta.adapterName).toBe('Workday (My Experience)');
  });

  it('detects Workday step title from progressBar active step', () => {
    document.body.innerHTML = `
      <div data-automation-id="progressBar">
        <div aria-current="step">Application Questions</div>
      </div>
    `;

    const step = adapter.getCurrentStepTitle(document);
    expect(step).toBe('Application Questions');
  });

  it('falls back to heading detection for Workday step', () => {
    document.body.innerHTML = `
      <h2>Voluntary Disclosures</h2>
      <div>Some content</div>
    `;

    const step = adapter.getCurrentStepTitle(document);
    expect(step).toBe('Voluntary Disclosures');
  });
});

describe('Feature 3: Grounded AI Cover Letter Generator', () => {
  const mockProfile: UserProfile = {
    id: 'test-user',
    personal: {
      firstName: 'Samantha',
      lastName: 'Reed',
      fullName: 'Samantha Reed',
      email: 'samantha@example.com',
      phone: '+1 555-987-6543',
    },
    address: {
      addressLine1: '123 Market St',
      city: 'Seattle',
      state: 'WA',
      country: 'United States',
      postalCode: '98101',
    },
    links: {
      linkedInUrl: 'https://linkedin.com/in/samanthareed',
      githubUrl: 'https://github.com/samanthareed',
    },
    preferences: {
      preferredTitles: ['Senior Frontend Engineer'],
      employmentType: ['Full-time'],
      preferredLocations: ['Seattle', 'Remote'],
      workModel: 'Flexible',
      willingToRelocate: false,
      workAuthorizationStatus: 'Authorized to work',
      requiresVisaSponsorship: false,
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockProjects: ProjectRecord[] = [
    {
      id: 'proj-1',
      name: 'Distributed Event Queue',
      shortDescription: 'High-throughput event streaming system handling 50k events/sec',
      detailedDescription: 'Engineered with TypeScript, Go, and Kafka',
      problemStatement: 'High broker latency under peak loads',
      technologies: ['TypeScript', 'Go', 'Kafka', 'Redis'],
    },
    {
      id: 'proj-2',
      name: 'Cloud Observability Dashboard',
      shortDescription: 'Real-time telemetry monitoring UI built with React',
      detailedDescription: 'Built with React, WebSockets, and Tailwind CSS',
      technologies: ['React', 'WebSockets', 'Tailwind CSS'],
    },
  ];

  const mockExperience: ExperienceRecord[] = [
    {
      id: 'exp-1',
      companyName: 'Acme Cloud',
      designation: 'Senior Frontend Engineer',
      employmentType: 'Full-time',
      startDate: '2022-01',
      endDate: 'Present',
      currentlyWorking: true,
      description: 'Architected reusable micro-frontend design system across 6 product lines.',
      technologies: ['React', 'TypeScript', 'GraphQL'],
    },
  ];

  it('generates a 3-paragraph Confident cover letter grounded in projects and experience', async () => {
    const res = await aiService.generateCoverLetter({
      companyName: 'Uber',
      jobTitle: 'Senior Software Engineer',
      tone: 'Confident',
      profile: mockProfile,
      projects: mockProjects,
      experience: mockExperience,
    });

    expect(res.coverLetter).toBeDefined();
    expect(res.coverLetter).toContain('Uber');
    expect(res.coverLetter).toContain('Senior Software Engineer');
    expect(res.coverLetter).toContain('Samantha Reed');
    expect(res.coverLetter).toContain('Distributed Event Queue');
    expect(res.coverLetter).toContain('Acme Cloud');
    expect(res.tone).toBe('Confident');

    // Verify 3 paragraphs (separated by double newlines before closing)
    const paragraphs = res.coverLetter.split('\n\n').filter((p) => !p.startsWith('Sincerely'));
    expect(paragraphs.length).toBeGreaterThanOrEqual(3);
  });

  it('generates a Technical tone cover letter with architecture focus', async () => {
    const res = await aiService.generateCoverLetter({
      companyName: 'Datadog',
      jobTitle: 'Distributed Systems Engineer',
      tone: 'Technical',
      profile: mockProfile,
      projects: mockProjects,
      experience: mockExperience,
    });

    expect(res.coverLetter).toContain('Datadog');
    expect(res.coverLetter).toContain('systems design');
    expect(res.coverLetter).toContain('Distributed Event Queue');
    expect(res.tone).toBe('Technical');
  });

  it('generates an Enthusiastic tone cover letter with passion focus', async () => {
    const res = await aiService.generateCoverLetter({
      companyName: 'Airbnb',
      jobTitle: 'Staff Frontend Engineer',
      tone: 'Enthusiastic',
      profile: mockProfile,
      projects: mockProjects,
      experience: mockExperience,
    });

    expect(res.coverLetter).toContain('Airbnb');
    expect(res.coverLetter).toContain('thrilled');
    expect(res.tone).toBe('Enthusiastic');
  });
});
