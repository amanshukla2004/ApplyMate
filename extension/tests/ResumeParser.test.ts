import { describe, it, expect } from 'vitest';
import { ResumeParserService } from '../src/services/pdf/resumeParserService';
import { PDFParserService } from '../src/services/pdf/pdfParserService';

describe('ResumeParserService', () => {
  const sampleResumeText = `
Alex Mercer
alex.mercer@gmail.com | (555) 123-4567 | San Francisco, CA
https://linkedin.com/in/alex-mercer | https://github.com/alexmercer | https://alexmercer.dev

SUMMARY
Results-driven Senior Software Engineer with 5+ years of experience designing scalable distributed web architectures.

EXPERIENCE
Senior Software Engineer at Stripe
2021-06 - Present
• Designed and developed resilient payment checkout APIs handling millions of daily transactions.
• Collaborated with product and frontend engineering teams to optimize gateway latency.
• Engineered microservices using TypeScript, Node.js, and PostgreSQL.

Software Engineering Intern at Amazon
2020-05 - 2020-08
• Built internal developer dashboard using React and AWS Lambda.

EDUCATION
Stanford University
Bachelor of Science in Computer Science
2017 - 2021 | GPA: 3.85 / 4.0

SKILLS
Programming Languages: TypeScript, JavaScript, Python, Java, SQL, Go
Frameworks & Libraries: React, Node.js, Express, Next.js, Tailwind CSS
Databases & Cloud: PostgreSQL, MongoDB, Redis, AWS, Docker, Kubernetes
Tools: Git, REST APIs, GraphQL, Linux
  `;

  it('correctly extracts personal contact info', () => {
    const parsed = ResumeParserService.parse(sampleResumeText);

    expect(parsed.personal.fullName).toBe('Alex Mercer');
    expect(parsed.personal.firstName).toBe('Alex');
    expect(parsed.personal.lastName).toBe('Mercer');
    expect(parsed.personal.email).toBe('alex.mercer@gmail.com');
    expect(parsed.personal.phone).toContain('555');
    expect(parsed.links.linkedInUrl).toContain('linkedin.com/in/alex-mercer');
    expect(parsed.links.githubUrl).toContain('github.com/alexmercer');
    expect(parsed.links.portfolioUrl).toContain('alexmercer.dev');
    expect(parsed.address.city).toBe('San Francisco');
    expect(parsed.address.state).toBe('CA');
  });

  it('correctly extracts education history', () => {
    const parsed = ResumeParserService.parse(sampleResumeText);

    expect(parsed.education.length).toBeGreaterThan(0);
    const edu = parsed.education[0];
    expect(edu.institution).toContain('Stanford University');
    expect(edu.degree).toContain('Bachelor of Science');
    expect(edu.branch).toBe('Computer Science');
    expect(edu.graduationYear).toBe('2021');
    expect(edu.cgpa).toBe('3.85/4.0');
  });

  it('correctly extracts experience and roles', () => {
    const parsed = ResumeParserService.parse(sampleResumeText);

    expect(parsed.experience.length).toBeGreaterThan(0);
    const exp = parsed.experience[0];
    expect(exp.companyName).toBe('Stripe');
    expect(exp.designation).toBe('Senior Software Engineer');
  });

  it('accurately categorizes technical skills', () => {
    const parsed = ResumeParserService.parse(sampleResumeText);
    const skillNames = parsed.skills.map((s) => s.name);

    expect(skillNames).toContain('TypeScript');
    expect(skillNames).toContain('React');
    expect(skillNames).toContain('Node.js');
    expect(skillNames).toContain('PostgreSQL');
    expect(skillNames).toContain('AWS');
    expect(skillNames).toContain('Docker');
    expect(skillNames).toContain('Git');
  });
});

describe('PDFParserService', () => {
  it('extracts plain text when given string or text buffer', async () => {
    const encoder = new TextEncoder();
    const bytes = encoder.encode('John Doe\njohn@example.com\nSoftware Engineer');
    const text = await PDFParserService.extractText(bytes);

    expect(text).toContain('John Doe');
    expect(text).toContain('john@example.com');
  });

  it('parses literal PDF text blocks with operators', async () => {
    const rawPdf = `%PDF-1.4
1 0 obj
<< /Length 50 >>
stream
BT
/F1 12 Tf
(Jane Smith) Tj
14 TL
(jane.smith@example.com) '
ET
endstream
endobj
%%EOF`;

    const encoder = new TextEncoder();
    const bytes = encoder.encode(rawPdf);
    const text = await PDFParserService.extractText(bytes);

    expect(text).toContain('Jane Smith');
    expect(text).toContain('jane.smith@example.com');
  });
});
