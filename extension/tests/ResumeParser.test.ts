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

  it('correctly extracts projects and links from structured modern resumes', () => {
    const modernResume = `
Aman Shukla
Full-Stack Developer | Java, Spring Boot, React & Agentic AI
+91-7983163187 | work.amanshukla2004@gmail.com | LinkedIn | GitHub

EDUCATION
JSS Academy of Technical Education Noida, India
B.Tech, Computer Science (AI & ML) — CGPA: 8.56/10.0 2023 – 2027

PROJECTS
Roomly — Hotel Booking Platform | Spring Boot, PostgreSQL | GitHub | Demo Feb 2026 – Mar 2026
• Achieved a 99% reduction in transaction errors by eliminating inventory double-booking conflicts through row-level pessimistic locking in PostgreSQL.
• Coordinated secure payment workflows by integrating the Stripe SDK and webhook event handling.

BLOGWHO — AI Blogging Platform | Spring Boot, LangGraph | GitHub | Demo Jun 2026 – Jul 2026
• Achieved strict role-scoped access control across 47 system-critical API endpoints using Spring Security.

TECHNICAL SKILLS
Languages: Java, JavaScript, TypeScript, Python, SQL
Backend: Spring Boot, FastAPI, REST APIs, Microservices
Databases: PostgreSQL, MySQL, Redis

[EMBEDDED_LINKS]
https://linkedin.com/in/amanshukla-dev
https://github.com/amanshukla2004
https://github.com/amanshukla2004/airBnbApp
https://nox-hotelmanagement.vercel.app/
https://github.com/amanshukla2004/Agentic_blog_generation_Saas
https://blogwho.onrender.com/
`;

    const parsed = ResumeParserService.parse(modernResume);

    expect(parsed.personal.fullName).toBe('Aman Shukla');
    expect(parsed.personal.firstName).toBe('Aman');
    expect(parsed.personal.lastName).toBe('Shukla');
    expect(parsed.personal.email).toBe('work.amanshukla2004@gmail.com');
    expect(parsed.personal.phone).toContain('7983163187');
    expect(parsed.address.city).toBe('Noida');
    expect(parsed.address.country).toBe('India');
    expect(parsed.links.linkedInUrl).toContain('linkedin.com/in/amanshukla-dev');
    expect(parsed.links.githubUrl).toContain('github.com/amanshukla2004');

    expect(parsed.education.length).toBeGreaterThan(0);
    expect(parsed.education[0].institution).toContain('JSS Academy of Technical Education');
    expect(parsed.education[0].degree).toBe('B.Tech');
    expect(parsed.education[0].graduationYear).toBe('2027');
    expect(parsed.education[0].cgpa).toBe('8.56/10.0');

    expect(parsed.projects.length).toBe(2);
    expect(parsed.projects[0].name).toBe('Roomly');
    expect(parsed.projects[0].technologies).toContain('Spring Boot');
    expect(parsed.projects[0].technologies).toContain('PostgreSQL');
    expect(parsed.projects[0].githubUrl).toContain('airBnbApp');
    expect(parsed.projects[0].liveUrl).toContain('nox-hotelmanagement.vercel.app');
    expect(parsed.projects[0].shortDescription).toContain('reduction in transaction errors');

    expect(parsed.projects[1].name).toBe('BLOGWHO');
    expect(parsed.projects[1].githubUrl).toContain('Agentic_blog_generation_Saas');
    expect(parsed.projects[1].liveUrl).toContain('blogwho.onrender.com');
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
