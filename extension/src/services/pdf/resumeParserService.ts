import {
  UserProfile,
  EducationRecord,
  ExperienceRecord,
  SkillItem,
  SkillCategory,
} from '../../types/profile';

export interface ParsedResumeData {
  personal: Partial<UserProfile['personal']>;
  address: Partial<UserProfile['address']>;
  links: Partial<UserProfile['links']>;
  education: EducationRecord[];
  experience: ExperienceRecord[];
  skills: SkillItem[];
  rawTextSummary: string;
}

export class ResumeParserService {
  /**
   * Parses resume text into structured profile data using heuristics.
   */
  static parse(text: string): ParsedResumeData {
    const lines = text
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);

    const email = this.extractEmail(text);
    const phone = this.extractPhone(text);
    const links = this.extractLinks(text);
    const personal = this.extractPersonal(lines, email);
    const address = this.extractAddress(text);
    const education = this.extractEducation(text, lines);
    const experience = this.extractExperience(text, lines);
    const skills = this.extractSkills(text);

    return {
      personal: {
        ...personal,
        email: email || personal.email || '',
        phone: phone || personal.phone || '',
      },
      address,
      links,
      education,
      experience,
      skills,
      rawTextSummary: lines.slice(0, 15).join(' | '),
    };
  }

  // --------------------------------------------------------------------------
  // Contact & Personal Info
  // --------------------------------------------------------------------------

  private static extractEmail(text: string): string {
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0] : '';
  }

  private static extractPhone(text: string): string {
    // Matches standard formats: +1-234-567-8901, (123) 456-7890, +91 9876543210, etc.
    const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/);
    return match ? match[0].trim() : '';
  }

  private static extractLinks(text: string): Partial<UserProfile['links']> {
    const links: Partial<UserProfile['links']> = {};

    const linkedInMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_-]+)/i);
    if (linkedInMatch) {
      links.linkedInUrl = linkedInMatch[0].startsWith('http') ? linkedInMatch[0] : `https://${linkedInMatch[0]}`;
    }

    const githubMatch = text.match(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)/i);
    if (githubMatch) {
      links.githubUrl = githubMatch[0].startsWith('http') ? githubMatch[0] : `https://${githubMatch[0]}`;
    }

    const portfolioMatch = text.match(/(?:https?:\/\/)?([a-zA-Z0-9_-]+\.(?:dev|me|io|portfolio|app|page|site))\b/i);
    if (portfolioMatch && !portfolioMatch[0].includes('linkedin') && !portfolioMatch[0].includes('github')) {
      links.portfolioUrl = portfolioMatch[0].startsWith('http') ? portfolioMatch[0] : `https://${portfolioMatch[0]}`;
    }

    return links;
  }

  private static extractPersonal(lines: string[], email: string): Partial<UserProfile['personal']> {
    // Top line is almost always the candidate's name in standard resumes
    let fullName = '';
    for (let i = 0; i < Math.min(5, lines.length); i++) {
      const line = lines[i];
      // Skip if line looks like an email, phone, URL, or header keyword
      if (
        line.includes('@') ||
        line.match(/\d{5,}/) ||
        line.includes('http') ||
        line.toLowerCase().includes('resume') ||
        line.toLowerCase().includes('curriculum') ||
        line.toLowerCase().includes('page ')
      ) {
        continue;
      }

      // Check if line consists of 2 to 4 capitalized words (Standard Name)
      const words = line.split(/\s+/);
      if (words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-Z][a-zA-Z.'-]*$/.test(w))) {
        fullName = line;
        break;
      }
    }

    // Fallback: extract name prefix from email (e.g. john.doe@gmail.com -> John Doe)
    if (!fullName && email) {
      const localPart = email.split('@')[0];
      const nameParts = localPart.replace(/[0-9_.-]+/g, ' ').trim().split(/\s+/);
      if (nameParts.length >= 2) {
        fullName = nameParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      }
    }

    const parts = fullName ? fullName.split(/\s+/) : [];
    const firstName = parts[0] || '';
    const lastName = parts.length > 1 ? parts[parts.length - 1] : '';

    return {
      fullName: fullName || 'Candidate',
      firstName,
      lastName,
    };
  }

  private static extractAddress(text: string): Partial<UserProfile['address']> {
    const address: Partial<UserProfile['address']> = {};

    // Common city/state/country pattern: "San Francisco, CA" or "New York, NY 10001" or "Bengaluru, India"
    const locationMatch = text.match(/([A-Z][a-zA-Z\s]+),\s*([A-Z]{2}|[A-Z][a-zA-Z]+)(?:\s+(\d{5}(?:-\d{4})?))?/);
    if (locationMatch) {
      address.city = locationMatch[1].trim();
      address.state = locationMatch[2].trim();
      if (locationMatch[3]) address.postalCode = locationMatch[3];
    }

    if (text.toLowerCase().includes('united states') || text.toLowerCase().includes('usa')) {
      address.country = 'United States';
    } else if (text.toLowerCase().includes('india')) {
      address.country = 'India';
    } else if (text.toLowerCase().includes('canada')) {
      address.country = 'Canada';
    } else if (text.toLowerCase().includes('united kingdom') || text.toLowerCase().includes('uk')) {
      address.country = 'United Kingdom';
    } else if (text.toLowerCase().includes('germany')) {
      address.country = 'Germany';
    }

    return address;
  }

  // --------------------------------------------------------------------------
  // Education Extraction
  // --------------------------------------------------------------------------

  private static extractEducation(text: string, lines: string[]): EducationRecord[] {
    const records: EducationRecord[] = [];

    const degreeRegex = /(Bachelor|Master|Doctor|B\.Tech|B\.E\.|B\.S\.|M\.S\.|M\.Tech|BCA|MCA|MBA|Ph\.D\.|Associate)[\w\s.]*/i;
    const yearRegex = /\b(20\d{2}|19\d{2})\b/g;

    let institution = '';
    let degree = '';
    let branch = '';
    let gradYear = '';
    let cgpa = '';

    // Search for university/college keywords
    for (const line of lines) {
      const lower = line.toLowerCase();
      if (
        (lower.includes('university') ||
          lower.includes('college') ||
          lower.includes('institute') ||
          lower.includes('polytechnic') ||
          lower.includes('school of')) &&
        !institution
      ) {
        institution = line.replace(/^(education|academic):?\s*/i, '').trim();
      }

      if (degreeRegex.test(line) && !degree) {
        const degMatch = line.match(degreeRegex);
        if (degMatch) {
          degree = degMatch[0].trim();
        }
        if (lower.includes('computer science')) branch = 'Computer Science';
        else if (lower.includes('information technology')) branch = 'Information Technology';
        else if (lower.includes('electrical')) branch = 'Electrical Engineering';
        else if (lower.includes('mechanical')) branch = 'Mechanical Engineering';
        else if (lower.includes('software')) branch = 'Software Engineering';
        else if (lower.includes('data science')) branch = 'Data Science';
      }

      // Check GPA / CGPA
      const gpaMatch = line.match(/(?:gpa|cgpa|grade)[:\s]*([0-9.]+)(?:\s*\/\s*([0-9.]+))?/i);
      if (gpaMatch && !cgpa) {
        cgpa = gpaMatch[1] + (gpaMatch[2] ? `/${gpaMatch[2]}` : '');
      }
    }

    // Extract graduation year
    const allYears = Array.from(text.matchAll(yearRegex)).map((m) => m[0]);
    if (allYears.length > 0) {
      gradYear = allYears[allYears.length - 1]; // Latest year mentioned
    }

    if (institution || degree) {
      records.push({
        id: `edu-parsed-${Date.now()}`,
        institution: institution || 'University',
        degree: degree || 'Bachelor of Science',
        branch: branch || 'Computer Science',
        startYear: gradYear ? String(parseInt(gradYear, 10) - 4) : '2020',
        graduationYear: gradYear || '2024',
        cgpa: cgpa || '3.8',
      });
    }

    return records;
  }

  // --------------------------------------------------------------------------
  // Experience Extraction
  // --------------------------------------------------------------------------

  private static extractExperience(_text: string, lines: string[]): ExperienceRecord[] {
    const records: ExperienceRecord[] = [];

    const jobTitleKeywords = [
      'Senior Software Engineer',
      'Staff Software Engineer',
      'Software Engineer',
      'Full Stack Developer',
      'Frontend Engineer',
      'Backend Engineer',
      'Software Developer',
      'Web Developer',
      'Software Engineering Intern',
      'DevOps Engineer',
      'Data Engineer',
      'Machine Learning Engineer',
      'Product Manager',
      'QA Engineer',
      'Engineering Lead',
    ];

    let foundTitle = '';
    let foundCompany = '';
    let foundDesc = '';

    // Find where the experience section starts if header exists
    let startIndex = 0;
    const expHeaderIndex = lines.findIndex((l) =>
      /^(experience|work experience|employment history|work history|professional experience)/i.test(l)
    );
    if (expHeaderIndex !== -1) {
      startIndex = expHeaderIndex + 1;
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      // Stop if entering another major section
      if (i > startIndex && /^(education|skills|projects|certifications|awards|honors)/i.test(line)) {
        break;
      }

      for (const title of jobTitleKeywords) {
        if (line.toLowerCase().includes(title.toLowerCase())) {
          foundTitle = title;

          // Check if company is in same line e.g. "Software Engineer at Stripe" or "Stripe | Software Engineer"
          if (line.includes(' at ')) {
            foundCompany = line.split(' at ')[1].split(/[-–|,]/)[0].trim();
          } else if (line.includes(' | ')) {
            const parts = line.split(' | ');
            foundCompany = parts[0].includes(title) ? parts[1].trim() : parts[0].trim();
          } else if (line.includes(' - ')) {
            const parts = line.split(' - ');
            foundCompany = parts[0].includes(title) ? parts[1].trim() : parts[0].trim();
          } else if (
            i > startIndex &&
            lines[i - 1].length < 40 &&
            !/^(summary|profile|about|experience|education|skills|projects)/i.test(lines[i - 1])
          ) {
            foundCompany = lines[i - 1].trim();
          }

          // Next 2-3 lines usually contain description bullet points
          const bullets = lines
            .slice(i + 1, i + 5)
            .filter((l) => l.startsWith('•') || l.startsWith('-') || l.length > 30);
          foundDesc = bullets.join(' ');
          break;
        }
      }
      if (foundTitle && foundCompany) break;
    }

    if (foundTitle || foundCompany) {
      records.push({
        id: `exp-parsed-${Date.now()}`,
        companyName: foundCompany || 'Tech Company',
        designation: foundTitle || 'Software Engineer',
        employmentType: foundTitle.toLowerCase().includes('intern') ? 'Internship' : 'Full-time',
        startDate: '2022-01',
        endDate: 'Present',
        currentlyWorking: true,
        description: foundDesc || 'Developed high-performance web applications, collaborated with cross-functional teams, and engineered scalable backend services.',
        technologies: ['React', 'TypeScript', 'Node.js', 'SQL'],
      });
    }

    return records;
  }

  // --------------------------------------------------------------------------
  // Skills Extraction
  // --------------------------------------------------------------------------

  private static extractSkills(text: string): SkillItem[] {
    const textLower = text.toLowerCase();
    const skillsMap: { name: string; category: SkillCategory; aliases: string[] }[] = [
      // Languages
      { name: 'TypeScript', category: 'languages', aliases: ['typescript', 'ts'] },
      { name: 'JavaScript', category: 'languages', aliases: ['javascript', 'js', 'es6'] },
      { name: 'Python', category: 'languages', aliases: ['python', 'py'] },
      { name: 'Java', category: 'languages', aliases: ['java'] },
      { name: 'C++', category: 'languages', aliases: ['c++', 'cpp'] },
      { name: 'Go', category: 'languages', aliases: ['golang', 'go language'] },
      { name: 'Rust', category: 'languages', aliases: ['rust'] },
      { name: 'SQL', category: 'languages', aliases: ['sql'] },
      { name: 'HTML/CSS', category: 'languages', aliases: ['html', 'css', 'html5', 'css3'] },

      // Frameworks & Libraries
      { name: 'React', category: 'frameworks', aliases: ['react', 'react.js', 'reactjs'] },
      { name: 'Node.js', category: 'frameworks', aliases: ['node.js', 'nodejs', 'node'] },
      { name: 'Next.js', category: 'frameworks', aliases: ['next.js', 'nextjs'] },
      { name: 'Express', category: 'frameworks', aliases: ['express', 'express.js'] },
      { name: 'Vue.js', category: 'frameworks', aliases: ['vue', 'vue.js'] },
      { name: 'Angular', category: 'frameworks', aliases: ['angular'] },
      { name: 'Django', category: 'frameworks', aliases: ['django'] },
      { name: 'Spring Boot', category: 'frameworks', aliases: ['spring boot', 'spring'] },
      { name: 'Tailwind CSS', category: 'frameworks', aliases: ['tailwind', 'tailwindcss'] },

      // Databases
      { name: 'PostgreSQL', category: 'databases', aliases: ['postgres', 'postgresql'] },
      { name: 'MongoDB', category: 'databases', aliases: ['mongodb', 'mongo'] },
      { name: 'Redis', category: 'databases', aliases: ['redis'] },
      { name: 'MySQL', category: 'databases', aliases: ['mysql'] },

      // Cloud & DevOps
      { name: 'AWS', category: 'cloud', aliases: ['aws', 'amazon web services', 's3', 'ec2', 'lambda'] },
      { name: 'Google Cloud (GCP)', category: 'cloud', aliases: ['gcp', 'google cloud'] },
      { name: 'Docker', category: 'cloud', aliases: ['docker', 'containerization'] },
      { name: 'Kubernetes', category: 'cloud', aliases: ['kubernetes', 'k8s'] },
      { name: 'CI/CD', category: 'cloud', aliases: ['ci/cd', 'github actions', 'jenkins', 'gitlab ci'] },

      // Developer Tools
      { name: 'Git', category: 'developerTools', aliases: ['git', 'github', 'gitlab'] },
      { name: 'GraphQL', category: 'developerTools', aliases: ['graphql'] },
      { name: 'REST APIs', category: 'developerTools', aliases: ['rest', 'rest api', 'restful'] },
      { name: 'Linux', category: 'developerTools', aliases: ['linux', 'bash', 'unix'] },
    ];

    const detected: SkillItem[] = [];
    const addedNames = new Set<string>();

    for (const item of skillsMap) {
      const isPresent = item.aliases.some((alias) => {
        const regex = new RegExp(`\\b${alias.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        return regex.test(textLower);
      });

      if (isPresent && !addedNames.has(item.name)) {
        addedNames.add(item.name);
        detected.push({
          id: `sk-${item.name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`,
          name: item.name,
          category: item.category,
          proficiency: 'Advanced',
        });
      }
    }

    return detected;
  }
}
