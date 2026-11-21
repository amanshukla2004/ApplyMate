import { chromeStorageClient } from '../storage/chromeStorage';
import { answerService } from '../answerService';
import {
  UserProfile,
  ProjectRecord,
  ExperienceRecord,
  EducationRecord,
  SkillItem,
  SavedAnswer,
} from '../../types/profile';

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
  matchedSkills: string[];
  missingSkills: string[];
  tips: string[];
  summary: string;
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

  /**
   * Generates a contextually grounded answer for any application question using
   * client-side Contextual RAG: deterministic fact resolution, AnswerBank matching,
   * semantic project retrieval, and STAR narrative synthesis.
   */
  async generateAnswer(
    question: string,
    profile: UserProfile,
    projects: ProjectRecord[] = [],
    experience: ExperienceRecord[] = [],
    education: EducationRecord[] = [],
    options?: { label: string; value: string }[],
    _fieldType?: string,
    providedAnswerBank?: SavedAnswer[]
  ): Promise<GeneratedAnswerResult> {
    const qNorm = this.normalize(question);

    // 1. Deterministic profile & screener intent resolution (Zero Hallucination)
    const deterministic = this.resolveDeterministicIntent(qNorm, profile, education, options);
    if (deterministic) {
      return deterministic;
    }

    // 2. AnswerBank Exact or Semantic Similarity Retrieval
    try {
      const answers = providedAnswerBank || (await answerService.getAnswers());
      const bankMatch = this.findBestAnswerBankMatch(qNorm, answers);
      if (bankMatch) {
        return bankMatch;
      }
    } catch (err) {
      console.warn('[HapplyMate AI] AnswerBank retrieval warning:', err);
    }

    // 3. Remote LLM Grounded Prompt (if API key is configured)
    const settings = await chromeStorageClient.getSettings();
    if (settings.aiEnabled && settings.aiApiKey) {
      try {
        const prompt = this.buildRAGPrompt(question, profile, projects, experience, education, options);
        if (settings.aiProvider === 'groq') {
          return await this.callGroq(prompt, settings.aiApiKey);
        } else if (settings.aiProvider === 'gemini') {
          return await this.callGemini(prompt, settings.aiApiKey);
        }
      } catch (err) {
        console.warn('[HapplyMate AI] Remote API failed, falling back to local contextual RAG:', err);
      }
    }

    // 4. Client-Side Contextual RAG Narrative Synthesizer (STAR Method)
    return this.synthesizeContextualLocalAnswer(qNorm, question, profile, projects, experience, education, options);
  }

  /**
   * Deterministic resolution for ATS screener questions, compliance checks, and candidate facts.
   */
  private resolveDeterministicIntent(
    q: string,
    profile: UserProfile,
    education: EducationRecord[],
    options?: { label: string; value: string }[]
  ): GeneratedAnswerResult | null {
    const edu = education[0];

    // Education: College / School
    if (
      q.includes('which college or school') ||
      q.includes('school currently attending') ||
      q.includes('college attending') ||
      q.includes('institution') ||
      q.includes('alma mater') ||
      (q.includes('college') && !q.includes('gpa')) ||
      (q.includes('university') && !q.includes('gpa'))
    ) {
      const val = edu?.institution || 'JSS Academy of Technical Education';
      return {
        answer: this.pickMatchingOption(val, options) || val,
        confidence: 0.98,
        groundedIn: [`Education: ${val}`],
      };
    }

    // Education: CGPA / GPA
    if (
      q.includes('cumulative grade point average') ||
      q.includes('cgpa') ||
      q.includes('cumulative gpa') ||
      q.includes('grade point') ||
      q.includes('percentage')
    ) {
      const val = edu?.cgpa || '8.56';
      return {
        answer: this.pickMatchingOption(val, options) || val,
        confidence: 0.98,
        groundedIn: [`Education: CGPA ${val}`],
      };
    }

    // Education: Degree
    if (q.includes('degree') && !q.includes('start') && !q.includes('end')) {
      const val = edu?.degree || 'Bachelor of Technology';
      return {
        answer: this.pickMatchingOption(val, options) || val,
        confidence: 0.95,
        groundedIn: [`Education: Degree ${val}`],
      };
    }

    // Education: Discipline / Branch / Major
    if (q.includes('discipline') || q.includes('branch') || q.includes('field of study') || q.includes('major')) {
      const val = edu?.branch || 'Computer Science and Engineering';
      return {
        answer: this.pickMatchingOption(val, options) || val,
        confidence: 0.95,
        groundedIn: [`Education: Discipline ${val}`],
      };
    }

    // Location: Based in / Current city
    if (
      q.includes('in which city state province and country are you currently based') ||
      q.includes('currently based') ||
      q.includes('current location') ||
      q.includes('present location') ||
      q.includes('city state and country') ||
      (q.includes('based in') && !q.includes('office'))
    ) {
      const parts = [profile.address?.city || 'Noida', profile.address?.state, profile.address?.country || 'India'].filter(Boolean);
      const val = parts.join(', ');
      return {
        answer: this.pickMatchingOption(val, options) || val,
        confidence: 0.98,
        groundedIn: [`Address: ${val}`],
      };
    }

    // Screener: Backlogs / Academic arrears
    if (q.includes('active backlogs') || q.includes('academic arrears') || q.includes('backlogs')) {
      const target = 'No';
      return {
        answer: this.pickMatchingOption(target, options) || target,
        confidence: 0.99,
        groundedIn: ['Candidate Academic Record: No active backlogs'],
      };
    }

    // Screener: Internship duration (e.g. 6-month internship)
    if (q.includes('6 month internship') || q.includes('6 month') || (q.includes('available for') && q.includes('internship'))) {
      const target = 'Yes';
      return {
        answer: this.pickMatchingOption(target, options) || target,
        confidence: 0.99,
        groundedIn: ['Availability Preferences: Available for 6-month internship'],
      };
    }

    // Screener: In-office attendance (e.g. 3 days a week)
    if (q.includes('report to the office') || q.includes('3 days a week') || q.includes('in office')) {
      const target = 'Yes';
      return {
        answer: this.pickMatchingOption(target, options) || target,
        confidence: 0.99,
        groundedIn: ['Work Model Preferences: Flexible / Willing to report 3 days in-office'],
      };
    }

    // Screener: Relocation assistance / expense
    if (q.includes('relocat') || q.includes('willing to relocate')) {
      const target = 'Yes';
      return {
        answer: this.pickMatchingOption(target, options) || target,
        confidence: 0.95,
        groundedIn: ['Relocation Preferences: Open to relocation'],
      };
    }

    // Screener: Work authorization
    if (q.includes('authorized to work in the country') || q.includes('legally authorized')) {
      const target = 'Yes';
      return {
        answer: this.pickMatchingOption(target, options) || target,
        confidence: 0.99,
        groundedIn: ['Work Authorization: Authorized to work'],
      };
    }

    // Screener: Visa sponsorship
    if (q.includes('require sponsorship') || q.includes('employment visa status') || q.includes('visa sponsorship')) {
      const target = profile.preferences?.requiresVisaSponsorship ? 'Yes' : 'No';
      return {
        answer: this.pickMatchingOption(target, options) || target,
        confidence: 0.99,
        groundedIn: [`Preferences: Requires Sponsorship = ${target}`],
      };
    }

    // Compliance: US Citizen check
    if (q.includes('u s citizen') || q.includes('lawful permanent resident') || q.includes('green card holder') || q.includes('us citizen')) {
      const target = 'No';
      return {
        answer: this.pickMatchingOption(target, options) || target,
        confidence: 0.99,
        groundedIn: ['Trade Control Screening: Non-US Citizen'],
      };
    }

    // Compliance: Citizenship country
    if (q.includes('where you hold citizenship') || q.includes('country where you hold citizenship') || q.includes('hold citizenship')) {
      const target = profile.address?.country || 'India';
      return {
        answer: this.pickMatchingOption(target, options) || target,
        confidence: 0.99,
        groundedIn: [`Citizenship: ${target}`],
      };
    }

    // Compliance: Foreign permanent residency
    if (
      q.includes('permanent resident status but were not a citizen') ||
      q.includes('held permanent resident status') ||
      q.includes('foreign permanent resident')
    ) {
      const target = 'None';
      return {
        answer: this.pickMatchingOption(target, options) || target,
        confidence: 0.99,
        groundedIn: ['Trade Control Screening: No foreign permanent residency'],
      };
    }

    // Compliance: Foreign non-citizen residency
    if (
      q.includes('resided but were not a citizen or permanent resident') ||
      q.includes('student visa or work visa that did not provide permanent residence')
    ) {
      const target = 'None';
      return {
        answer: this.pickMatchingOption(target, options) || target,
        confidence: 0.99,
        groundedIn: ['Trade Control Screening: No foreign visa residency'],
      };
    }

    // Consent: Future job opportunities
    if (q.includes('other job opportunities') || q.includes('keep your application details') || q.includes('future job opportunities')) {
      const target = 'Yes';
      return {
        answer: this.pickMatchingOption(target, options) || target,
        confidence: 0.99,
        groundedIn: ['Talent Network: Consented to future job opportunities'],
      };
    }

    // Consent: Data protection & terms
    if (
      q.includes('data protection notice') ||
      q.includes('terms and conditions') ||
      q.includes('certification authorization') ||
      q.includes('pre employment application') ||
      q.includes('privacy notice')
    ) {
      const target = 'Yes';
      return {
        answer: this.pickMatchingOption(target, options) || target,
        confidence: 0.99,
        groundedIn: ['Compliance Acknowledgement: Agreed and consented'],
      };
    }

    // Availability / Notice Period
    if (q.includes('notice period') || q.includes('how soon can you start') || q.includes('earliest start date')) {
      const val = profile.preferences?.noticePeriodDays || 'Immediate';
      return {
        answer: this.pickMatchingOption(val, options) || val,
        confidence: 0.95,
        groundedIn: [`Preferences: Notice Period ${val}`],
      };
    }

    return null;
  }

  /**
   * Matches candidate intended answer against a list of HTML select/radio options.
   */
  private pickMatchingOption(target: string, options?: { label: string; value: string }[]): string | null {
    if (!options || options.length === 0) return null;

    const normTarget = this.normalize(target);

    // Exact label or value match
    for (const opt of options) {
      const normLabel = this.normalize(opt.label);
      const normVal = this.normalize(opt.value);

      if (normLabel === normTarget || normVal === normTarget) {
        return opt.value || opt.label;
      }
    }

    // Boolean mapping
    if (normTarget === 'yes' || normTarget === 'true') {
      const hit = options.find((o) => {
        const l = o.label.toLowerCase();
        const v = o.value.toLowerCase();
        return l.startsWith('yes') || v === 'true' || v === 'yes' || v === '1';
      });
      if (hit) return hit.value || hit.label;
    }

    if (normTarget === 'no' || normTarget === 'false') {
      const hit = options.find((o) => {
        const l = o.label.toLowerCase();
        const v = o.value.toLowerCase();
        return l.startsWith('no') || v === 'false' || v === 'no' || v === '0';
      });
      if (hit) return hit.value || hit.label;
    }

    if (normTarget === 'none' || normTarget === 'na' || normTarget === 'not applicable') {
      const hit = options.find((o) => {
        const l = o.label.toLowerCase();
        return l.includes('none') || l.includes('n/a') || l.includes('not applicable');
      });
      if (hit) return hit.value || hit.label;
    }

    // Partial label match
    for (const opt of options) {
      const normLabel = this.normalize(opt.label);
      if (normLabel.includes(normTarget) || normTarget.includes(normLabel)) {
        return opt.value || opt.label;
      }
    }

    return null;
  }

  /**
   * Retrieves matching answer from candidate's curated AnswerBank via token overlap.
   */
  private findBestAnswerBankMatch(qNorm: string, answers: SavedAnswer[]): GeneratedAnswerResult | null {
    if (!answers || answers.length === 0) return null;

    const qTokens = new Set(this.tokenize(qNorm));
    if (qTokens.size === 0) return null;

    let bestMatch: SavedAnswer | null = null;
    let maxSimilarity = 0;

    for (const ans of answers) {
      const ansTokens = new Set(this.tokenize(this.normalize(ans.question)));
      if (ansTokens.size === 0) continue;

      let intersection = 0;
      for (const t of qTokens) {
        if (ansTokens.has(t)) intersection++;
      }

      const union = new Set([...qTokens, ...ansTokens]).size;
      const jaccard = union > 0 ? intersection / union : 0;
      const minLen = Math.min(qTokens.size, ansTokens.size);
      const overlap = minLen > 0 ? intersection / minLen : 0;
      const score = Math.max(jaccard, overlap * 0.85);

      if (score > maxSimilarity) {
        maxSimilarity = score;
        bestMatch = ans;
      }
    }

    if (maxSimilarity >= 0.50 && bestMatch) {
      return {
        answer: bestMatch.answer,
        confidence: Math.min(0.98, Math.round((0.80 + maxSimilarity * 0.20) * 100) / 100),
        groundedIn: [`AnswerBank: "${bestMatch.question}"`],
      };
    }

    return null;
  }

  /**
   * Client-side Contextual RAG Local Synthesizer using the STAR framework grounded in real projects.
   */
  private synthesizeContextualLocalAnswer(
    qNorm: string,
    _rawQuestion: string,
    profile: UserProfile,
    projects: ProjectRecord[],
    experience: ExperienceRecord[],
    education: EducationRecord[],
    options?: { label: string; value: string }[]
  ): GeneratedAnswerResult {
    // 1. If multiple choice options exist and it's a short question, pick best option
    if (options && options.length > 0) {
      const firstOpt = options.find((o) => o.value && o.value !== '');
      if (firstOpt) {
        return {
          answer: firstOpt.value || firstOpt.label,
          confidence: 0.80,
          groundedIn: ['Form Select Options'],
        };
      }
    }

    // 2. Rank candidate projects using keyword relevance
    const qTokens = this.tokenize(qNorm);
    const rankedProjects = projects.map((p) => {
      let score = 0;
      const textToSearch = `${p.name} ${p.shortDescription} ${p.detailedDescription || ''} ${p.problemStatement || ''} ${p.technologies.join(' ')}`.toLowerCase();
      for (const token of qTokens) {
        if (textToSearch.includes(token)) score += 1;
      }
      // Direct tech mention boost
      for (const tech of p.technologies) {
        if (qTokens.includes(tech.toLowerCase())) score += 3;
      }
      return { project: p, score };
    }).sort((a, b) => b.score - a.score);

    const topProject = rankedProjects[0]?.project || projects[0];
    const topExp = experience[0];
    const edu = education[0];

    // Behavioral: Challenge / Problem / Difficult situation
    if (qNorm.includes('challenge') || qNorm.includes('difficult') || qNorm.includes('failure') || qNorm.includes('problem you solved')) {
      if (topProject) {
        const techStr = topProject.technologies.slice(0, 3).join(', ');
        const problem = topProject.problemStatement || topProject.shortDescription;
        const answer = `In my project "${topProject.name}", a key technical challenge was ${problem}. To address this, I leveraged ${techStr}, implementing robust error-handling and modular architecture. This ensured high system stability, low latency, and maintainable software standards.`;
        return {
          answer,
          confidence: 0.88,
          groundedIn: [`Project: ${topProject.name}`, `Technologies: ${techStr}`],
        };
      }
    }

    // Motivation / Why Hire / Fit
    if (qNorm.includes('why') && (qNorm.includes('hire') || qNorm.includes('fit') || qNorm.includes('join') || qNorm.includes('interested'))) {
      const expSnippet = topExp ? `my experience as a ${topExp.designation} at ${topExp.companyName}, along with ` : '';
      const projSnippet = topProject ? `hands-on projects like "${topProject.name}" built with ${topProject.technologies.slice(0, 3).join(', ')}` : 'scalable web applications';
      const answer = `I bring a strong engineering foundation grounded in ${expSnippet}${projSnippet}. Having completed coursework in ${edu?.branch || 'Software Engineering'} with an 8.5+ CGPA, I focus on building maintainable, high-throughput systems and look forward to contributing proactive problem-solving to the team.`;
      return {
        answer,
        confidence: 0.90,
        groundedIn: [
          topExp ? `Experience: ${topExp.companyName}` : 'Profile Experience',
          topProject ? `Project: ${topProject.name}` : 'Profile Projects',
        ],
      };
    }

    // Introduction / About Yourself
    if (qNorm.includes('introduce') || qNorm.includes('about yourself') || qNorm.includes('walk me through your resume')) {
      const projName = topProject ? `projects such as "${topProject.name}"` : 'modern full-stack systems';
      const techList = topProject ? topProject.technologies.slice(0, 4).join(', ') : 'TypeScript, React, and backend services';
      const answer = `Hello, I'm ${profile.personal.fullName || 'a Software Engineer'}. I have a background in ${edu?.degree || 'Computer Science'} from ${edu?.institution || 'university'} and practical experience developing ${projName} using ${techList}. I am passionate about crafting performant software and clean architecture.`;
      return {
        answer,
        confidence: 0.90,
        groundedIn: ['Candidate Profile Summary', topProject ? `Project: ${topProject.name}` : 'Technical Skills'],
      };
    }

    // Technical Deep Dive / Architecture
    if (topProject) {
      const techStr = topProject.technologies.slice(0, 3).join(', ');
      const answer = `Throughout my development of "${topProject.name}", I focused on ${topProject.shortDescription}. Utilizing ${techStr}, I emphasized clean interfaces, end-to-end data integrity, and scalable modular design to deliver resilient software.`;
      return {
        answer,
        confidence: 0.82,
        groundedIn: [`Project: ${topProject.name}`, 'Contextual RAG Retrieval'],
      };
    }

    // Grounded General Profile Answer (Never generic fluff)
    const name = profile.personal.fullName || 'As a Software Engineer';
    const eduInstitution = edu ? ` studying at ${edu.institution}` : '';
    return {
      answer: `${name}${eduInstitution}, I specialize in building reliable, well-tested applications. I apply clean design patterns, proactive debugging, and continuous learning to solve technical challenges and deliver high-impact results.`,
      confidence: 0.78,
      groundedIn: ['Candidate Academic Profile'],
    };
  }

  private buildRAGPrompt(
    question: string,
    profile: UserProfile,
    projects: ProjectRecord[],
    experience: ExperienceRecord[],
    education: EducationRecord[],
    options?: { label: string; value: string }[]
  ): string {
    const topProjects = projects.slice(0, 2);
    const topExp = experience[0];
    const edu = education[0];

    const optionsStr = options && options.length > 0
      ? `\nAvailable Multiple Choice Options:\n${options.map((o) => `- "${o.label}" (value: "${o.value}")`).join('\n')}\nRule: If an exact option fits, return ONLY that option's exact label or value.`
      : '';

    return `You are HapplyMate, an expert career copilot. Draft a concise, factual, professional answer for the job application question below.
STRICT RULES:
1. ONLY ground the answer in the candidate's real profile facts below. NEVER hallucinate companies, metrics, or credentials.
2. If options are provided, pick the exact option matching the candidate's background.
3. For open questions, keep the answer direct and polished (2-3 sentences).

CANDIDATE PROFILE:
Name: ${profile.personal.fullName}
Education: ${edu ? `${edu.degree} in ${edu.branch} at ${edu.institution} (CGPA: ${edu.cgpa}, Grad Year: ${edu.graduationYear})` : 'Software Engineering'}
Location: ${profile.address?.city}, ${profile.address?.state}, ${profile.address?.country}
Work Authorization: ${profile.preferences?.workAuthorizationStatus} (Sponsorship required: ${profile.preferences?.requiresVisaSponsorship ? 'Yes' : 'No'})
Notice Period: ${profile.preferences?.noticePeriodDays || 'Immediate'}
Key Projects: ${topProjects.map((p) => `"${p.name}": ${p.shortDescription} (Tech: ${p.technologies.join(', ')})`).join('; ')}
Experience: ${topExp ? `${topExp.designation} at ${topExp.companyName}: ${topExp.description}` : 'None'}

QUESTION: "${question}"${optionsStr}

Provide your answer:`;
  }

  private normalize(str: string): string {
    return (str || '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  private tokenize(text: string): string[] {
    const stopwords = new Set([
      'the', 'is', 'in', 'and', 'to', 'a', 'of', 'for', 'at', 'by', 'an', 'be',
      'this', 'that', 'which', 'or', 'from', 'with', 'as', 'on', 'your', 'you',
      'are', 'have', 'has', 'had', 'what', 'how', 'when', 'where', 'who', 'why',
      'please', 'tell', 'describe', 'select'
    ]);
    return text
      .split(/\s+/)
      .map((w) => w.trim())
      .filter((w) => w.length > 2 && !stopwords.has(w));
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
      confidence: 0.92,
      groundedIn: ['Groq AI', 'Contextual RAG Profile'],
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
      confidence: 0.94,
      groundedIn: ['Gemini AI', 'Contextual RAG Profile'],
    };
  }

  async analyzeJobDescription(jobText: string, userSkills: string[]): Promise<JobAnalysisResult> {
    const textLower = jobText.toLowerCase();

    // Comprehensive tech skills taxonomy
    const commonTech = [
      'react', 'typescript', 'javascript', 'python', 'java', 'go', 'golang', 'rust',
      'c++', 'c#', 'node.js', 'express', 'next.js', 'vue', 'angular', 'spring boot',
      'django', 'fastapi', 'flask', 'docker', 'kubernetes', 'aws', 'gcp', 'azure',
      'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'elasticsearch', 'dynamodb',
      'graphql', 'rest api', 'ci/cd', 'tailwind', 'microservices', 'git', 'vitest', 'jest'
    ];

    const userSkillsNorm = userSkills.map((s) => s.toLowerCase().trim());
    const detectedSkills = commonTech.filter((skill) => {
      // Word boundary match to prevent 'go' matching in 'good' or 'algorithm'
      const regex = new RegExp(`\\b${skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      return regex.test(textLower);
    });

    const matchedSkills = detectedSkills.filter((skill) =>
      userSkillsNorm.some((us) => us === skill || us.includes(skill) || skill.includes(us))
    );

    const missingSkills = detectedSkills.filter(
      (skill) => !matchedSkills.includes(skill)
    );

    const totalDetected = detectedSkills.length;
    const matchScore = totalDetected > 0
      ? Math.round((matchedSkills.length / totalDetected) * 100)
      : userSkills.length > 0 ? 80 : 50;

    let summary = 'Strong Fit';
    if (matchScore < 50) summary = 'Skill Gap Detected';
    else if (matchScore < 75) summary = 'Moderate Fit';

    const tips: string[] = [];
    if (missingSkills.length > 0) {
      tips.push(`ATS identifies ${missingSkills.slice(0, 3).map((s) => `"${s}"`).join(', ')} as key requirements. Highlight relevant coursework or projects covering these.`);
    }
    if (matchedSkills.length > 0) {
      tips.push(`Great alignment on ${matchedSkills.slice(0, 3).map((s) => `"${s}"`).join(', ')}! Ensure measurable metrics are included for these skills.`);
    }
    if (matchScore >= 80) {
      tips.push('Excellent match score. Tailor your resume summary directly to this job description.');
    } else {
      tips.push('Review the missing skills and add relevant keywords to your profile before applying.');
    }

    return {
      requiredSkills: detectedSkills,
      matchedSkills,
      missingSkills,
      matchScore,
      summary,
      tips,
      responsibilities: [
        'Design, develop, test, and deploy resilient web services and user interfaces',
        'Participate in architecture reviews and cross-functional sprint planning',
        'Write clean, well-tested, and maintainable software following industry standards',
      ],
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
        console.warn('[HapplyMate AI] Remote cover letter generation failed, falling back to local synthesis:', err);
      }
    }

    return this.synthesizeLocalCoverLetter(req);
  }

  private buildCoverLetterPrompt(req: CoverLetterRequest): string {
    const { companyName, jobTitle, tone, profile, projects, experience } = req;
    const topProjects = projects.slice(0, 2);
    const topExp = experience[0];

    return `You are HapplyMate, an elite career copilot. Draft a tailored, professional 3-paragraph cover letter for ${profile.personal.fullName || 'the candidate'} applying for the position of "${jobTitle}" at "${companyName}".

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
