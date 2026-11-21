import { chromeStorageClient } from '../storage/chromeStorage';
import { UserProfile, ProjectRecord, ExperienceRecord, EducationRecord, SkillItem } from '../../types/profile';

export interface GeneratedAnswerResult {
  answer: string;
  confidence: number;
  groundedIn: string[];
}

export type CoverLetterTone = 'Confident' | 'Technical' | 'Enthusiastic';

export interface CoverLetterRequest {
  companyName: string;
  jobTitle: string;
  tone: CoverLetterTone;
  profile: UserProfile;
  projects: ProjectRecord[];
  experience: ExperienceRecord[];
  skills?: SkillItem[];
}

export interface GeneratedCoverLetterResult {
  coverLetter: string;
  tone: CoverLetterTone;
  groundedIn: string[];
}

export interface JobAnalysisResult {
  jobTitle?: string;
  company?: string;
  requiredSkills: string[];
  responsibilities: string[];
  matchScore: number;
}

export class AIService {
  async classifyQuestion(question: string): Promise<string> {
    const q = question.toLowerCase();
    if (q.includes('salary') || q.includes('ctc') || q.includes('compensation')) return 'Salary';
    if (q.includes('relocat') || q.includes('move to')) return 'Relocation';
    if (q.includes('sponsor') || q.includes('visa') || q.includes('authorized')) return 'Work Authorization';
    if (q.includes('notice') || q.includes('start date') || q.includes('soon can you join')) return 'Availability';
    if (q.includes('why do you want') || q.includes('about yourself') || q.includes('introduce')) return 'Introduction';
    if (q.includes('project') || q.includes('built') || q.includes('technologies')) return 'Projects';
    if (q.includes('challenge') || q.includes('conflict') || q.includes('failure') || q.includes('strength')) return 'Behavioral';
    return 'Technical';
  }

  async generateAnswer(
    question: string,
    profile: UserProfile,
    projects: ProjectRecord[],
    experience: ExperienceRecord[],
    _education: EducationRecord[]
  ): Promise<GeneratedAnswerResult> {
    const settings = await chromeStorageClient.getSettings();

    // If Groq or Gemini API key is configured, call remote API
    if (settings.aiEnabled && settings.aiApiKey) {
      try {
        const prompt = this.buildPrompt(question, profile, projects, experience);
        if (settings.aiProvider === 'groq') {
          return await this.callGroq(prompt, settings.aiApiKey);
        } else if (settings.aiProvider === 'gemini') {
          return await this.callGemini(prompt, settings.aiApiKey);
        }
      } catch (err) {
        console.warn('[JobMate AI] Remote API failed, falling back to local heuristic synthesis:', err);
      }
    }

    // Default high-quality local heuristic answer synthesizer
    return this.synthesizeLocalAnswer(question, profile, projects, experience);
  }

  async analyzeJobDescription(jobText: string, userSkills: string[]): Promise<JobAnalysisResult> {
    const textLower = jobText.toLowerCase();

    // Detect common skills
    const commonTech = [
      'react', 'typescript', 'javascript', 'python', 'java', 'spring boot', 'node.js',
      'docker', 'kubernetes', 'aws', 'gcp', 'sql', 'postgresql', 'mongodb', 'git',
      'graphql', 'rest api', 'ci/cd', 'tailwind', 'next.js', 'redis'
    ];

    const detectedSkills = commonTech.filter((skill) => textLower.includes(skill));
    const matchedCount = detectedSkills.filter((s) =>
      userSkills.some((us) => us.toLowerCase() === s)
    ).length;

    const matchScore = detectedSkills.length > 0 ? Math.round((matchedCount / detectedSkills.length) * 100) : 75;

    return {
      requiredSkills: detectedSkills,
      responsibilities: [
        'Design and develop high-performance software modules',
        'Collaborate with cross-functional product and engineering teams',
        'Write clean, well-tested, and maintainable code',
      ],
      matchScore,
    };
  }

  private buildPrompt(
    question: string,
    profile: UserProfile,
    projects: ProjectRecord[],
    experience: ExperienceRecord[]
  ): string {
    return `You are JobMate, an expert career copilot. Draft a concise, factual, professional answer for the job application question below.
Rule: Only use facts from the candidate's real profile. Do NOT invent achievements or skills.

Candidate Profile:
Name: ${profile.personal.fullName}
Key Projects: ${projects.map((p) => `${p.name}: ${p.shortDescription} (Tech: ${p.technologies.join(', ')})`).join('; ')}
Experience: ${experience.map((e) => `${e.designation} at ${e.companyName}: ${e.description}`).join('; ')}

Question: "${question}"

Provide a direct, polished answer (2-4 sentences).`;
  }

  private async callGroq(prompt: string, apiKey: string): Promise<GeneratedAnswerResult> {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.3-70b-versatile',
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!res.ok) throw new Error(`Groq API error: ${res.statusText}`);
    const data = await res.json();
    const answer = data.choices[0]?.message?.content?.trim() || '';

    return {
      answer,
      confidence: 0.9,
      groundedIn: ['Groq AI', 'User Profile'],
    };
  }

  private async callGemini(prompt: string, apiKey: string): Promise<GeneratedAnswerResult> {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });

    if (!res.ok) throw new Error(`Gemini API error: ${res.statusText}`);
    const data = await res.json();
    const answer = data.candidates[0]?.content?.parts[0]?.text?.trim() || '';

    return {
      answer,
      confidence: 0.92,
      groundedIn: ['Gemini AI', 'User Profile'],
    };
  }

  private synthesizeLocalAnswer(
    question: string,
    profile: UserProfile,
    projects: ProjectRecord[],
    experience: ExperienceRecord[]
  ): GeneratedAnswerResult {
    const q = question.toLowerCase();
    const topProject = projects[0];
    const topExp = experience[0];

    if (q.includes('challenge') || q.includes('difficult')) {
      if (topProject) {
        return {
          answer: `In my project "${topProject.name}", I tackled the challenge of ${topProject.problemStatement || topProject.shortDescription}. I solved this by leveraging ${topProject.technologies.slice(0, 3).join(', ')}, ensuring high system reliability and clean code modularity.`,
          confidence: 0.85,
          groundedIn: [`Project: ${topProject.name}`],
        };
      }
    }

    if (q.includes('why') && (q.includes('hire') || q.includes('fit'))) {
      const expSnippet = topExp ? `my experience at ${topExp.companyName} where I focused on ${topExp.designation.toLowerCase()} responsibilities, along with ` : '';
      return {
        answer: `I bring a strong engineering foundation grounded in ${expSnippet}hands-on experience building projects like ${topProject?.name || 'scalable web applications'}. I focus on writing robust, maintainable code and solving real user problems efficiently.`,
        confidence: 0.88,
        groundedIn: topExp ? [`Experience: ${topExp.companyName}`] : ['User Profile'],
      };
    }

    if (q.includes('introduce') || q.includes('about yourself')) {
      return {
        answer: `Hello, I'm ${profile.personal.fullName || 'a passionate Software Engineer'}. I have worked with ${topProject ? topProject.technologies.slice(0, 4).join(', ') : 'modern web and backend stacks'}, building performant applications and delivering reliable software solutions.`,
        confidence: 0.85,
        groundedIn: ['User Profile'],
      };
    }

    return {
      answer: `As a developer skilled in modern software engineering, I emphasize clean architecture, proactive problem-solving, and continuous learning to deliver high quality results.`,
      confidence: 0.75,
      groundedIn: ['General Profile'],
    };
  }

  async generateCoverLetter(req: CoverLetterRequest): Promise<GeneratedCoverLetterResult> {
    const settings = await chromeStorageClient.getSettings();

    if (settings.aiEnabled && settings.aiApiKey) {
      try {
        const prompt = this.buildCoverLetterPrompt(req);
        if (settings.aiProvider === 'groq') {
          const res = await this.callGroq(prompt, settings.aiApiKey);
          return {
            coverLetter: res.answer,
            tone: req.tone,
            groundedIn: ['Groq AI', 'User Profile', 'Projects'],
          };
        } else if (settings.aiProvider === 'gemini') {
          const res = await this.callGemini(prompt, settings.aiApiKey);
          return {
            coverLetter: res.answer,
            tone: req.tone,
            groundedIn: ['Gemini AI', 'User Profile', 'Projects'],
          };
        }
      } catch (err) {
        console.warn('[ApplyMate AI] Remote cover letter generation failed, falling back to local synthesis:', err);
      }
    }

    return this.synthesizeLocalCoverLetter(req);
  }

  private buildCoverLetterPrompt(req: CoverLetterRequest): string {
    const { companyName, jobTitle, tone, profile, projects, experience } = req;
    const topProjects = projects.slice(0, 2);
    const topExp = experience[0];

    return `You are ApplyMate, an elite career copilot. Draft a tailored, professional 3-paragraph cover letter for ${profile.personal.fullName || 'the candidate'} applying for the position of "${jobTitle}" at "${companyName}".

Tone: ${tone} (reflect this tone strictly throughout the letter).
Rules:
1. Exactly 3 paragraphs.
2. Grounded strictly in real achievements. Do NOT invent fake companies or false credentials.
3. Paragraph 1: Enthusiastic opening addressing ${companyName}, introducing domain specialization and express interest in the ${jobTitle} role.
4. Paragraph 2: Core technical evidence highlighting candidate projects (${topProjects.map((p) => `${p.name} using ${p.technologies.slice(0, 3).join(', ')}: ${p.shortDescription}`).join('; ')}) and experience${topExp ? ` at ${topExp.companyName} as ${topExp.designation}` : ''}.
5. Paragraph 3: Professional closing expressing eagerness to contribute to ${companyName}'s engineering goals, with a call to discuss further.

Return ONLY the plain text of the 3 paragraphs.`;
  }

  private synthesizeLocalCoverLetter(req: CoverLetterRequest): string & GeneratedCoverLetterResult {
    const { companyName, jobTitle, tone, profile, projects, experience } = req;
    const candidateName = profile.personal.fullName || 'Candidate';
    const topProject = projects[0];
    const secondProject = projects[1];
    const topExp = experience[0];

    // Paragraph 1: Opening
    let p1 = '';
    if (tone === 'Confident') {
      p1 = `I am writing to express my strong interest in the ${jobTitle} role at ${companyName}. With a rigorous foundation in software engineering and hands-on experience building resilient, performant systems, I am eager to bring immediate technical value and high-velocity execution to your engineering team.`;
    } else if (tone === 'Technical') {
      p1 = `I am applying for the ${jobTitle} position at ${companyName}. Having developed high-throughput web applications and scalable architectural modules, I specialize in clean systems design, robust type-safety, and production-grade engineering that aligns directly with ${companyName}'s technical standards.`;
    } else {
      // Enthusiastic
      p1 = `I am thrilled to submit my application for the ${jobTitle} opportunity at ${companyName}. I have long admired ${companyName}'s dedication to product innovation and user experience, and I am excited about the opportunity to contribute my engineering capabilities to your team's mission.`;
    }

    // Paragraph 2: Evidence & Projects
    let p2 = '';
    const expText = topExp
      ? `During my work as a ${topExp.designation} at ${topExp.companyName}, I focused on ${topExp.description.slice(0, 120)}... `
      : '';
    const proj1Text = topProject
      ? `Specifically, through "${topProject.name}", I built a solution utilizing ${topProject.technologies.slice(0, 4).join(', ')}, addressing ${topProject.problemStatement || topProject.shortDescription}. `
      : '';
    const proj2Text = secondProject
      ? `Furthermore, in my project "${secondProject.name}", I engineered scalable features with ${secondProject.technologies.slice(0, 3).join(', ')}, demonstrating strong problem-solving and modular code architecture.`
      : '';

    p2 = `${expText}${proj1Text}${proj2Text}`.trim() ||
      `Throughout my software engineering background, I have developed full-stack applications with modern frameworks like React, TypeScript, and cloud technologies, always prioritizing high reliability, test coverage, and end-user performance.`;

    // Paragraph 3: Closing
    let p3 = '';
    if (tone === 'Confident') {
      p3 = `I am confident that my technical proficiency, proactive problem solving, and commitment to engineering excellence make me a natural fit for ${companyName}. I welcome the opportunity to discuss how my skill set will drive success for the ${jobTitle} team. Thank you for your time and consideration.`;
    } else if (tone === 'Technical') {
      p3 = `I look forward to discussing the technical challenges and architectural roadmap at ${companyName}, and sharing how my background in modern stacks and distributed systems can accelerate your goals. Thank you for considering my application.`;
    } else {
      p3 = `I would love the opportunity to connect with your team to share how my passion, technical foundation, and collaborative energy can help ${companyName} continue to thrive. Thank you for considering my application, and I look forward to hearing from you.`;
    }

    const fullLetter = `${p1}\n\n${p2}\n\n${p3}\n\nSincerely,\n${candidateName}`;

    return {
      coverLetter: fullLetter,
      tone,
      groundedIn: [
        topProject ? `Project: ${topProject.name}` : 'Profile Projects',
        topExp ? `Experience: ${topExp.companyName}` : 'Work Experience',
        'Local Heuristic Engine',
      ],
    } as any;
  }
}

export const aiService = new AIService();
