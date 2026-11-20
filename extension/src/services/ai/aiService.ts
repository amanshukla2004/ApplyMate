import { chromeStorageClient } from '../storage/chromeStorage';
import { UserProfile, ProjectRecord, ExperienceRecord, EducationRecord } from '../../types/profile';

export interface GeneratedAnswerResult {
  answer: string;
  confidence: number;
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
}

export const aiService = new AIService();
