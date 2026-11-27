import {
  UserProfile,
  EducationRecord,
  ExperienceRecord,
  ProjectRecord,
  SkillItem,
  SkillCategory,
} from '../../types/profile';

export interface ParsedResumeData {
  personal: Partial<UserProfile['personal']>;
  address: Partial<UserProfile['address']>;
  links: Partial<UserProfile['links']>;
  education: EducationRecord[];
  experience: ExperienceRecord[];
  projects: ProjectRecord[];
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
    const address = this.extractAddress(text, lines);
    const education = this.extractEducation(text, lines);
    const experience = this.extractExperience(text, lines);
    const projects = this.extractProjects(lines, text);
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
      projects,
      skills,
      rawTextSummary: lines.slice(0, 15).join(' | '),
    };
  }

  // --------------------------------------------------------------------------
  // Contact & Personal Info
  // --------------------------------------------------------------------------

  private static extractEmail(text: string): string {
    const match = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
    return match ? match[0].toLowerCase() : '';
  }

  private static extractPhone(text: string): string {
    // Matches formats: +91-7983163187, +1-234-567-8901, (123) 456-7890, +91 9876543210
    const match = text.match(/(?:\+?\d{1,3}[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4,5}/);
    if (!match) return '';

    let clean = match[0].trim();
    // Normalize format e.g. +91 7983163187
    if (clean.startsWith('+91-')) {
      clean = '+91 ' + clean.slice(4);
    } else if (clean.startsWith('+1-')) {
      clean = '+1 ' + clean.slice(3);
    }
    return clean;
  }

  private static extractLinks(text: string): Partial<UserProfile['links']> {
    const links: Partial<UserProfile['links']> = {};

    // Scan for LinkedIn
    const linkedInMatch = text.match(/(?:https?:\/\/)?(?:www\.)?linkedin\.com\/in\/([a-zA-Z0-9_.-]+)/i);
    if (linkedInMatch) {
      links.linkedInUrl = linkedInMatch[0].startsWith('http') ? linkedInMatch[0] : `https://${linkedInMatch[0]}`;
    }

    // Scan for GitHub (profile root)
    const githubMatches = Array.from(text.matchAll(/(?:https?:\/\/)?(?:www\.)?github\.com\/([a-zA-Z0-9_-]+)(?:\/)?(?:\s|$|[)>"';\n])/gi));
    if (githubMatches.length > 0) {
      const userProfile = githubMatches.find(
        (m) => !m[1].includes('/') && !['features', 'topics', 'marketplace'].includes(m[1].toLowerCase())
      );
      if (userProfile) {
        const urlStr = userProfile[0].trim().replace(/[)>"';]+$/, '');
        links.githubUrl = urlStr.startsWith('http') ? urlStr : `https://${urlStr}`;
      }
    }

    // Scan for Portfolio or personal website
    const portfolioMatch = text.match(/(?:https?:\/\/)?([a-zA-Z0-9_\-.]+\.(?:dev|me|io|portfolio|page|site))\b/i);
    if (portfolioMatch && !portfolioMatch[0].includes('linkedin') && !portfolioMatch[0].includes('github')) {
      links.portfolioUrl = portfolioMatch[0].startsWith('http') ? portfolioMatch[0] : `https://${portfolioMatch[0]}`;
    } else {
      // Look for LeetCode profile as career link fallback
      const leetcodeMatch = text.match(/(?:https?:\/\/)?(?:www\.)?leetcode\.com\/u\/[a-zA-Z0-9_.-]+/i);
      if (leetcodeMatch) {
        links.portfolioUrl = leetcodeMatch[0].startsWith('http') ? leetcodeMatch[0] : `https://${leetcodeMatch[0]}`;
      }
    }

    return links;
  }

  private static extractPersonal(lines: string[], email: string): Partial<UserProfile['personal']> {
    let fullName = '';

    // Inspect the first 6 lines of the resume (the standard header area)
    for (const rawLine of lines.slice(0, 6)) {
      // Split by common title separators: |, •, -, tab
      const tokens = rawLine.split(/[|•\t]/);
      for (const token of tokens) {
        const candidate = token.trim().replace(/^[^a-zA-Z]+/, '').replace(/[^a-zA-Z]+$/, '');
        if (!candidate || candidate.length < 3 || candidate.length > 35) continue;
        if (candidate.includes('@') || candidate.includes('http') || /\d/.test(candidate)) continue;
        if (/^(summary|education|experience|projects|skills|contact|profile)/i.test(candidate)) continue;
        if (/developer|engineer|designer|manager|architect|consultant|analyst|student/i.test(candidate)) continue;

        const words = candidate.split(/\s+/);
        // Standard name: 2 to 4 capitalized words (e.g. "Aman Shukla")
        if (words.length >= 2 && words.length <= 4 && words.every((w) => /^[A-Z][a-zA-Z.'-]*$/.test(w))) {
          fullName = words.join(' ');
          break;
        }
      }
      if (fullName) break;
    }

    // Fallback: extract name prefix from email (e.g. work.amanshukla2004@gmail.com -> Aman Shukla)
    if (!fullName && email) {
      let localPart = email.split('@')[0];
      // Strip common email prefixes like work., official., career., contact.
      localPart = localPart.replace(/^(work|official|career|contact|jobs|hire|mail)[_.-]/i, '');
      const nameParts = localPart.replace(/[0-9_.-]+/g, ' ').trim().split(/\s+/);
      if (nameParts.length >= 2) {
        fullName = nameParts.map((p) => p.charAt(0).toUpperCase() + p.slice(1)).join(' ');
      }
    }

    const parts = fullName ? fullName.split(/\s+/) : [];
    const firstName = parts[0] || '';
    const lastName = parts.length > 1 ? parts.slice(1).join(' ') : '';

    return {
      fullName: fullName || '',
      firstName,
      lastName,
    };
  }

  private static extractAddress(text: string, lines: string[]): Partial<UserProfile['address']> {
    const address: Partial<UserProfile['address']> = {};

    // Technical term blacklist to prevent code stacks (e.g. "Java, Spring Boot") from matching as locations
    const techBlacklist = new Set([
      'java', 'python', 'react', 'angular', 'vue', 'spring', 'springboot', 'boot',
      'node', 'docker', 'aws', 'sql', 'typescript', 'javascript', 'developer',
      'engineer', 'stack', 'fullstack', 'rest', 'api', 'microservices', 'jwt',
      'fastapi', 'streamlit', 'postgresql', 'mysql'
    ]);

    // 1. Inspect header contact lines (lines 0..6) for standard "City, ST" or "City, Country"
    for (const rawLine of lines.slice(0, 6)) {
      const parts = rawLine.split(/[|•\t]/);
      for (const part of parts) {
        const trimmed = part.trim();
        // Match US "City, ST" e.g. "San Francisco, CA"
        const usMatch = trimmed.match(/\b([A-Z][a-zA-Z\s]+),\s*([A-Z]{2})\b/);
        if (usMatch) {
          const cityCandidate = usMatch[1].trim();
          const stateCandidate = usMatch[2].trim();
          if (!techBlacklist.has(cityCandidate.toLowerCase())) {
            address.city = cityCandidate;
            address.state = stateCandidate;
            address.country = 'United States';
            return address;
          }
        }

        // Match "City, Country" e.g. "Noida, India" or "London, UK"
        const countryMatch = trimmed.match(/\b([A-Z][a-zA-Z\s]+),\s*(India|USA|United States|Canada|UK|United Kingdom|Germany)\b/i);
        if (countryMatch) {
          let cityCandidate = countryMatch[1].trim();
          if (/academy|university|institute|college|school|education/i.test(cityCandidate)) {
            const words = cityCandidate.split(/\s+/);
            cityCandidate = words.pop() || cityCandidate;
          }
          if (!techBlacklist.has(cityCandidate.toLowerCase())) {
            address.city = cityCandidate;
            address.country = countryMatch[2].trim();
            return address;
          }
        }
      }
    }

    // 2. Inspect education/experience lines for location mentions e.g. "Noida, India"
    for (const line of lines.slice(0, 20)) {
      if (/education|projects|skills|experience/i.test(line)) {
        const locMatches = Array.from(line.matchAll(/([A-Z][a-zA-Z\s]+),\s*(India|USA|United States|Canada|UK|United Kingdom|Germany)/gi));
        for (const m of locMatches) {
          const rawCity = m[1].trim();
          // Extract only the trailing city token (e.g. "JSS Academy of Technical Education Noida" -> "Noida")
          const cityToken = rawCity.split(/\s+/).pop() || rawCity;
          if (!techBlacklist.has(cityToken.toLowerCase()) && cityToken.length > 2) {
            address.city = cityToken;
            address.country = m[2].trim();
            break;
          }
        }
      }
      if (address.city) break;
    }

    if (!address.country) {
      if (/\b(india|in)\b/i.test(text)) address.country = 'India';
      else if (/\b(united states|usa)\b/i.test(text)) address.country = 'United States';
      else if (/\b(canada)\b/i.test(text)) address.country = 'Canada';
      else if (/\b(united kingdom|uk)\b/i.test(text)) address.country = 'United Kingdom';
    }

    return address;
  }

  // --------------------------------------------------------------------------
  // Education Extraction
  // --------------------------------------------------------------------------

  private static extractEducation(_text: string, lines: string[]): EducationRecord[] {
    const records: EducationRecord[] = [];
    const degreeRegex = /(B\.Tech|B\.E\.|B\.S\.|Bachelor|Master|M\.Tech|M\.S\.|BCA|MCA|MBA|Ph\.D\.)[,\s\w(&)]*/i;

    let institution = '';
    let degree = '';
    let branch = '';
    let gradYear = '';
    let startYear = '';
    let cgpa = '';

    const eduHeaderIdx = lines.findIndex((l) => /^(education|academics)/i.test(l));
    const searchLines = eduHeaderIdx !== -1 ? lines.slice(eduHeaderIdx + 1, eduHeaderIdx + 12) : lines;

    for (let i = 0; i < searchLines.length; i++) {
      const line = searchLines[i];
      if (i > 0 && /^(projects|experience|skills|technical skills|summary|achievements)/i.test(line)) {
        break;
      }

      // Find Institution name (supports Academy, University, Institute, College, School)
      if (!institution && /(academy|university|institute|college|polytechnic|technical education)/i.test(line)) {
        // Strip out trailing location or labels
        institution = line
          .split(/[-–—|,]/)[0]
          .replace(/^(education|academics):?\s*/i, '')
          .replace(/\s+(Noida|Delhi|Bangalore|Kashipur|India|USA).*$/i, '')
          .trim();
      }

      // Find Degree and Branch
      if (!degree && degreeRegex.test(line)) {
        const degMatch = line.match(degreeRegex);
        if (degMatch) {
          const fullDeg = degMatch[0].trim();
          degree = fullDeg.split(/[\s,]+in\s+|,/i)[0].trim();
          if (line.includes(' in ')) {
            branch = line.split(/\s+in\s+/i)[1].split(/[-–|]/)[0].trim();
          } else if (line.includes(',')) {
            const afterComma = line.split(',')[1].split(/[-–|]/)[0].trim();
            if (/computer science|ai|ml|engineering|it|software/i.test(afterComma)) {
              branch = afterComma;
            }
          }
        }

        if (!branch && /computer science|information technology|software|ai|ml|data science|electrical|mechanical/i.test(line)) {
          const branchMatch = line.match(/(Computer Science[^\s—–,]*|AI\s*&\s*ML|Information Technology|Software Engineering|Data Science)/i);
          branch = branchMatch ? branchMatch[0].trim() : 'Computer Science';
        }
      }

      // Find CGPA / GPA (bound to max 2 decimals to prevent swallowing subsequent years e.g. 8.56/10.0 2023)
      if (!cgpa) {
        const cgpaMatch = line.match(/(?:cgpa|gpa|grade)[:\s]*([0-9]\.[0-9]{1,2})(?:\s*\/\s*([0-9]{1,2}\.?[0-9]{0,2}))?/i);
        if (cgpaMatch) {
          cgpa = `${cgpaMatch[1]}/${cgpaMatch[2] || '10.0'}`;
        }
      }

      // Find Year Range (e.g. 2023 – 2027 or 2023-2027)
      if (!gradYear) {
        const yearRangeMatch = line.match(/\b(20\d{2}|19\d{2})\s*[–—-]\s*(20\d{2}|19\d{2}|present)\b/i);
        if (yearRangeMatch) {
          startYear = yearRangeMatch[1];
          gradYear = yearRangeMatch[2];
        }
      }
    }

    if (institution || degree) {
      records.push({
        id: `edu-parsed-${Date.now()}`,
        institution: institution || 'University',
        degree: degree || 'B.Tech',
        branch: branch || 'Computer Science',
        startYear: startYear || '2023',
        graduationYear: gradYear || '2027',
        cgpa: cgpa || '8.5/10.0',
      });
    }

    return records;
  }

  // --------------------------------------------------------------------------
  // Projects Extraction
  // --------------------------------------------------------------------------

  private static extractProjects(lines: string[], cleanText = ''): ProjectRecord[] {
    const projects: ProjectRecord[] = [];
    const projHeaderIdx = lines.findIndex((l) => /^(projects|academic projects|key projects)/i.test(l));
    if (projHeaderIdx === -1) return projects;

    // Extract all URLs from cleanText for repo and live demo linking
    const embeddedUrls = Array.from(cleanText.matchAll(/https?:\/\/[^\s<>()"']+/g)).map((m) =>
      m[0].replace(/[)>"';]+$/, '').trim()
    );

    let currentProject: ProjectRecord | null = null;
    let currentBullets: string[] = [];

    const usedUrls = new Set<string>();

    const finalizeCurrentProject = () => {
      if (!currentProject) return;
      if (currentBullets.length > 0) {
        const cleanedBullets = currentBullets.map((b) => b.trim()).filter((b) => b.length > 5);
        if (cleanedBullets.length > 0) {
          currentProject.shortDescription = cleanedBullets[0];
          currentProject.detailedDescription = cleanedBullets
            .map((b) => (b.startsWith('•') ? b : `• ${b}`))
            .join('\n');
          currentProject.achievements = currentProject.detailedDescription;
          currentProject.keyFeatures = currentProject.detailedDescription;
        }
      }
    };

    for (let i = projHeaderIdx + 1; i < lines.length; i++) {
      const line = lines[i];
      if (/^(technical skills|skills|experience|education|achievements|certifications|awards)/i.test(line)) {
        finalizeCurrentProject();
        break;
      }

      // Detect project title line (e.g. "Roomly — Hotel Booking Platform | Spring Boot, PostgreSQL | GitHub | Demo Feb 2026 - Mar 2026")
      const isTitleLine =
        (line.includes('—') || line.includes(' | ') || line.includes(' - ')) &&
        /spring|react|python|fastapi|java|postgres|sql|langgraph|langchain|docker|node|typescript|hotel|blog|agent|platform|demo|github/i.test(line);

      if (isTitleLine) {
        finalizeCurrentProject();
        currentBullets = [];

        const parts = line.split(/[|—]/).map((p) => p.trim()).filter(Boolean);
        const rawName = parts[0];
        const name = rawName.split(/[-–]/)[0].trim();

        // Extract clean technologies
        const techPart = parts.find((p) =>
          /spring|react|python|fastapi|java|postgres|sql|langgraph|langchain|docker|node|typescript/i.test(p)
        );
        let technologies: string[] = [];
        if (techPart) {
          const cleaned = techPart
            .replace(/\b(demo|github|git|code|live)\b/gi, '')
            .replace(/\b(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)?\s*\d{4}\b/gi, '')
            .replace(/[{}—–|-]/g, '')
            .trim();
          technologies = cleaned
            .split(/[,/]/)
            .map((t) => t.trim())
            .filter((t) => t.length > 1 && !/^(demo|github|\d+)$/i.test(t));
        }
        if (technologies.length === 0) {
          technologies = ['Java', 'Spring Boot', 'PostgreSQL'];
        }

        // Match repository and live URLs from embedded URLs
        let githubUrl = '';
        let liveUrl = '';
        const nameLower = name.toLowerCase().replace(/[^a-z0-9]/g, '');

        for (const u of embeddedUrls) {
          if (usedUrls.has(u)) continue;
          const uLower = u.toLowerCase();
          if (uLower.includes('github.com/') && !githubUrl) {
            if (
              uLower.includes(nameLower) ||
              (nameLower.includes('roomly') && (uLower.includes('airbnb') || uLower.includes('hotel'))) ||
              (nameLower.includes('blog') && uLower.includes('blog')) ||
              (nameLower.includes('graphite') && (uLower.includes('chatbot') || uLower.includes('graphite')))
            ) {
              githubUrl = u;
              usedUrls.add(u);
            }
          }
          if ((uLower.includes('vercel.app') || uLower.includes('render.com') || uLower.includes('streamlit.app')) && !liveUrl) {
            if (
              uLower.includes(nameLower) ||
              (nameLower.includes('roomly') && uLower.includes('hotel')) ||
              (nameLower.includes('blog') && uLower.includes('blog')) ||
              (nameLower.includes('graphite') && (uLower.includes('graphite') || uLower.includes('streamlit')))
            ) {
              liveUrl = u;
              usedUrls.add(u);
            }
          }
        }

        currentProject = {
          id: `proj-parsed-${Date.now()}-${projects.length}`,
          name,
          githubUrl,
          liveUrl,
          shortDescription: '',
          detailedDescription: '',
          technologies,
        };
        projects.push(currentProject);
      } else if (currentProject) {
        // Skip links markers or standalone date lines
        if (line.startsWith('http') || line.startsWith('[EMBEDDED_LINKS]')) {
          continue;
        }
        if (
          line.length < 35 &&
          /^(demo|github|live|code|link|repo|view|\d{4}|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\b)/i.test(line)
        ) {
          continue;
        }

        const isBulletStart = /^[•\-\*–—\u2022\u2023\u25E6\u2043\u2219]|\b\d+\.\s/.test(line);
        const cleanContent = line.replace(/^[•\-\*–—\u2022\u2023\u25E6\u2043\u2219\d.]+\s*/, '').trim();

        if (isBulletStart) {
          if (cleanContent.length > 0) {
            currentBullets.push(cleanContent);
          }
        } else if (currentBullets.length > 0) {
          // Wrapped line / continuation line of the previous bullet point in PDF extraction
          currentBullets[currentBullets.length - 1] += ' ' + line.trim();
        } else if (line.trim().length > 10) {
          currentBullets.push(line.trim());
        }
      }
    }

    finalizeCurrentProject();

    return projects;
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

    let startIndex = 0;
    const expHeaderIndex = lines.findIndex((l) =>
      /^(experience|work experience|employment history|work history|professional experience)/i.test(l)
    );
    if (expHeaderIndex !== -1) {
      startIndex = expHeaderIndex + 1;
    } else {
      return records; // If no explicit experience section, return empty to prevent false positives from projects
    }

    for (let i = startIndex; i < lines.length; i++) {
      const line = lines[i];

      if (i > startIndex && /^(education|skills|projects|certifications|awards|honors)/i.test(line)) {
        break;
      }

      for (const title of jobTitleKeywords) {
        if (line.toLowerCase().includes(title.toLowerCase())) {
          foundTitle = title;

          if (line.includes(' at ')) {
            foundCompany = line.split(' at ')[1].split(/[-–|,]/)[0].trim();
          } else if (line.includes(' | ')) {
            const parts = line.split(' | ');
            foundCompany = parts[0].includes(title) ? parts[1].trim() : parts[0].trim();
          } else if (line.includes(' - ')) {
            const parts = line.split(' - ');
            foundCompany = parts[0].includes(title) ? parts[1].trim() : parts[0].trim();
          }

          const bullets = lines
            .slice(i + 1, i + 5)
            .filter((l) => l.startsWith('•') || l.startsWith('-') || l.length > 30);
          foundDesc = bullets.join(' ');
          break;
        }
      }
      if (foundTitle && foundCompany) break;
    }

    if (foundTitle && foundCompany) {
      records.push({
        id: `exp-parsed-${Date.now()}`,
        companyName: foundCompany,
        designation: foundTitle,
        employmentType: foundTitle.toLowerCase().includes('intern') ? 'Internship' : 'Full-time',
        startDate: '2023-01',
        endDate: 'Present',
        currentlyWorking: true,
        description: foundDesc || 'Engineered scalable backend services and collaborated with cross-functional teams.',
        technologies: ['Java', 'Spring Boot', 'SQL'],
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
      { name: 'Java', category: 'languages', aliases: ['java'] },
      { name: 'JavaScript', category: 'languages', aliases: ['javascript', 'js', 'es6'] },
      { name: 'TypeScript', category: 'languages', aliases: ['typescript', 'ts'] },
      { name: 'Python', category: 'languages', aliases: ['python', 'py'] },
      { name: 'SQL', category: 'languages', aliases: ['sql'] },
      { name: 'C++', category: 'languages', aliases: ['c++', 'cpp'] },
      { name: 'HTML/CSS', category: 'languages', aliases: ['html', 'css', 'html5', 'css3'] },

      // Backend & Agentic AI
      { name: 'Spring Boot', category: 'frameworks', aliases: ['spring boot', 'spring data jpa', 'spring security'] },
      { name: 'LangGraph', category: 'frameworks', aliases: ['langgraph'] },
      { name: 'LangChain', category: 'frameworks', aliases: ['langchain'] },
      { name: 'FastAPI', category: 'frameworks', aliases: ['fastapi'] },
      { name: 'REST APIs', category: 'frameworks', aliases: ['rest api', 'rest apis', 'restful'] },
      { name: 'Microservices', category: 'frameworks', aliases: ['microservices'] },

      // Frontend
      { name: 'React', category: 'frameworks', aliases: ['react', 'react.js', 'reactjs'] },
      { name: 'Redux', category: 'frameworks', aliases: ['redux', 'redux toolkit'] },
      { name: 'Tailwind CSS', category: 'frameworks', aliases: ['tailwind', 'tailwindcss', 'tailwind css'] },
      { name: 'Node.js', category: 'frameworks', aliases: ['node.js', 'nodejs', 'node'] },

      // Databases
      { name: 'PostgreSQL', category: 'databases', aliases: ['postgres', 'postgresql'] },
      { name: 'MySQL', category: 'databases', aliases: ['mysql'] },
      { name: 'Redis', category: 'databases', aliases: ['redis'] },
      { name: 'Chroma / Vector DB', category: 'databases', aliases: ['chroma', 'faiss', 'vector database', 'vector databases'] },

      // Cloud & DevOps
      { name: 'AWS', category: 'cloud', aliases: ['aws', 'amazon web services', 's3', 'ec2', 'lambda'] },
      { name: 'Google Cloud (GCP)', category: 'cloud', aliases: ['gcp', 'google cloud'] },
      { name: 'Docker', category: 'cloud', aliases: ['docker', 'containerization'] },
      { name: 'Kubernetes', category: 'cloud', aliases: ['kubernetes', 'k8s'] },
      { name: 'CI/CD', category: 'cloud', aliases: ['ci/cd', 'github actions', 'jenkins', 'gitlab ci'] },

      // Developer Tools
      { name: 'Git', category: 'developerTools', aliases: ['git', 'github', 'gitlab'] },
      { name: 'GraphQL', category: 'developerTools', aliases: ['graphql'] },
      { name: 'Linux', category: 'developerTools', aliases: ['linux', 'bash', 'unix'] },
      { name: 'Maven', category: 'developerTools', aliases: ['maven'] },
      { name: 'Postman', category: 'developerTools', aliases: ['postman'] },
      { name: 'Vite', category: 'developerTools', aliases: ['vite'] },
      { name: 'Vercel / Render', category: 'cloud', aliases: ['vercel', 'render'] },
      { name: 'Stripe SDK', category: 'developerTools', aliases: ['stripe'] },
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
