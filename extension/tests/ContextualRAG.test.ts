import { describe, it, expect } from 'vitest';
import { aiService } from '../src/services/ai/aiService';
import { UserProfile, ProjectRecord, ExperienceRecord, EducationRecord, SavedAnswer } from '../src/types/profile';

describe('Contextual RAG & Intelligent ATS Question Answering', () => {
  const mockProfile: UserProfile = {
    id: 'test-profile',
    personal: {
      firstName: 'Aman',
      lastName: 'Shukla',
      fullName: 'Aman Shukla',
      email: 'work.amanshukla2004@gmail.com',
      phone: '+91 7983163187',
    },
    address: {
      addressLine1: 'Sector 62',
      city: 'Noida',
      state: 'Uttar Pradesh',
      country: 'India',
      postalCode: '201301',
    },
    links: {
      linkedInUrl: 'https://linkedin.com/in/amanshukla',
      githubUrl: 'https://github.com/amanshukla',
    },
    preferences: {
      preferredTitles: ['Software Engineer', 'Full Stack Developer'],
      employmentType: ['Full-time', 'Internship'],
      preferredLocations: ['Noida', 'Bengaluru'],
      workModel: 'Flexible',
      willingToRelocate: true,
      workAuthorizationStatus: 'Authorized to work',
      requiresVisaSponsorship: false,
      noticePeriodDays: 'Immediate',
    },
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockEducation: EducationRecord[] = [
    {
      id: 'edu-1',
      institution: 'JSS Academy of Technical Education',
      degree: 'Bachelor of Technology',
      branch: 'Computer Science and Engineering',
      startYear: '2023',
      graduationYear: '2027',
      cgpa: '8.56',
    },
  ];

  const mockProjects: ProjectRecord[] = [
    {
      id: 'proj-1',
      name: 'Agentic Blog Generation SaaS',
      shortDescription: 'Multi-agent AI writing platform reducing content generation latency by 99%',
      detailedDescription: 'Full-stack platform using LangGraph and Next.js with Redis caching and pessimistic locking.',
      technologies: ['Next.js', 'LangGraph', 'TypeScript', 'Redis', 'PostgreSQL'],
    },
    {
      id: 'proj-2',
      name: 'Graphite AI Copilot',
      shortDescription: 'Real-time code assistant with tree-sitter AST analysis',
      detailedDescription: 'IDE extension with contextual vector retrieval and zero-latency indexing.',
      technologies: ['TypeScript', 'Rust', 'WebAssembly'],
    },
  ];

  const mockExperience: ExperienceRecord[] = [
    {
      id: 'exp-1',
      companyName: 'Tech Innovators Inc',
      designation: 'Software Engineering Intern',
      employmentType: 'Internship',
      startDate: '2024-05',
      endDate: '2024-08',
      currentlyWorking: false,
      description: 'Engineered high-throughput API microservices and optimized PostgreSQL query plans.',
      technologies: ['Node.js', 'TypeScript', 'PostgreSQL'],
    },
  ];

  it('determines College and CGPA deterministically from candidate profile without hallucination', async () => {
    const collegeRes = await aiService.generateAnswer(
      'Which college or school are you currently attending?*',
      mockProfile,
      mockProjects,
      mockExperience,
      mockEducation
    );
    expect(collegeRes.answer).toBe('JSS Academy of Technical Education');
    expect(collegeRes.confidence).toBeGreaterThanOrEqual(0.95);

    const cgpaRes = await aiService.generateAnswer(
      'Cumulative Grade Point Average*',
      mockProfile,
      mockProjects,
      mockExperience,
      mockEducation
    );
    expect(cgpaRes.answer).toBe('8.56');
    expect(cgpaRes.confidence).toBeGreaterThanOrEqual(0.95);
  });

  it('resolves complex Nasdaq screener questions (Backlogs, 6-month internship, In-office days)', async () => {
    const backlogRes = await aiService.generateAnswer(
      'Do you have any active backlogs / academic arrears?*',
      mockProfile,
      mockProjects,
      mockExperience,
      mockEducation,
      [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' },
      ]
    );
    expect(backlogRes.answer).toBe('false');

    const internRes = await aiService.generateAnswer(
      'Are you available for a 6-month internship?*',
      mockProfile,
      mockProjects,
      mockExperience,
      mockEducation,
      [
        { label: 'Yes', value: 'true' },
        { label: 'No', value: 'false' },
      ]
    );
    expect(internRes.answer).toBe('true');

    const officeRes = await aiService.generateAnswer(
      'Are you willing to report to the office at least 3 days a week?*',
      mockProfile,
      mockProjects,
      mockExperience,
      mockEducation
    );
    expect(officeRes.answer).toBe('Yes');
  });

  it('resolves Trade Control Screening and citizenship questions correctly', async () => {
    const usCitizenRes = await aiService.generateAnswer(
      'Are you a U.S. citizen, U.S. national, a U.S. lawful permanent resident alien (“U.S. green card holder”)?*',
      mockProfile,
      mockProjects,
      mockExperience,
      mockEducation,
      [
        { label: 'Yes', value: 'Yes' },
        { label: 'No', value: 'No' },
      ]
    );
    expect(usCitizenRes.answer).toBe('No');

    const citizenshipRes = await aiService.generateAnswer(
      'Please list each country where you hold citizenship, including any dual-citizenship status.*',
      mockProfile,
      mockProjects,
      mockExperience,
      mockEducation,
      [
        { label: 'Select...', value: '' },
        { label: 'India', value: 'India' },
        { label: 'United States', value: 'USA' },
      ]
    );
    expect(citizenshipRes.answer).toBe('India');

    const foreignRes = await aiService.generateAnswer(
      'Please list each country during the past five years where you held permanent resident status but were not a citizen.*',
      mockProfile,
      mockProjects,
      mockExperience,
      mockEducation,
      [
        { label: 'None', value: 'None' },
        { label: 'Canada', value: 'Canada' },
      ]
    );
    expect(foreignRes.answer).toBe('None');
  });

  it('retrieves saved answer from AnswerBank when semantic similarity matches', async () => {
    const savedAnswers: SavedAnswer[] = [
      {
        id: 'ans-1',
        question: 'Why do you want to join Nasdaq as an intern?',
        answer: 'I am excited by Nasdaq’s high-frequency trading infrastructure and mission to modernize capital markets through resilient cloud engineering.',
        category: 'Introduction',
        tags: ['Nasdaq', 'Mission'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];

    const res = await aiService.generateAnswer(
      'Why do you want to work at Nasdaq?',
      mockProfile,
      mockProjects,
      mockExperience,
      mockEducation,
      undefined,
      undefined,
      savedAnswers
    );

    expect(res.answer).toBe(savedAnswers[0].answer);
    expect(res.groundedIn[0]).toContain('AnswerBank');
  });

  it('constructs grounded STAR answer for behavioral questions referencing real candidate projects', async () => {
    const res = await aiService.generateAnswer(
      'Tell me about a challenging technical problem you solved.',
      mockProfile,
      mockProjects,
      mockExperience,
      mockEducation
    );

    expect(res.answer).toContain('Agentic Blog Generation SaaS');
    expect(res.answer).toContain('Next.js');
    expect(res.confidence).toBeGreaterThanOrEqual(0.85);
    expect(res.groundedIn[0]).toContain('Agentic Blog Generation SaaS');
  });
});
