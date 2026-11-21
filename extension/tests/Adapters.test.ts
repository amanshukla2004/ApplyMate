import { describe, it, expect, beforeEach } from 'vitest';
import { adapterRegistry } from '../src/adapters/adapterRegistry';

describe('AdapterRegistry', () => {
  beforeEach(() => {
    document.body.innerHTML = '';
  });

  it('detects Greenhouse adapter on boards.greenhouse.io', () => {
    const adapter = adapterRegistry.getActiveAdapter('https://boards.greenhouse.io/company/jobs/123', document);
    expect(adapter.name).toBe('Greenhouse Job Board');
  });

  it('scans complex Greenhouse form with education, screener questions, and consents', async () => {
    document.body.innerHTML = `
      <form id="application_form">
        <input id="first_name" name="first_name" type="text" />
        <input id="last_name" name="last_name" type="text" />
        <input id="email" name="email" type="email" />
        <input id="phone" name="phone" type="tel" />
        <input name="job_application[answers_attributes][0][school_name_id]" type="text" />
        <select name="job_application[answers_attributes][0][degree_id]">
          <option value="">Select...</option>
          <option value="btech">Bachelor of Technology</option>
        </select>
        <div class="field">
          <label>In which city, state/province and country are you currently based?*</label>
          <input name="job_application[answers][question_1001]" type="text" />
        </div>
        <div class="field">
          <label>Do you have any active backlogs / academic arrears?*</label>
          <select name="job_application[answers][question_1002]">
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div class="field">
          <label>Are you available for a 6-month internship?*</label>
          <select name="job_application[answers][question_1003]">
            <option value="">Select...</option>
            <option value="true">Yes</option>
            <option value="false">No</option>
          </select>
        </div>
        <div class="field">
          <label>
            <input name="job_application[answers][question_1004]" type="checkbox" />
            Yes, I have read and acknowledge the Job Applicant Data Protection Notice.
          </label>
        </div>
      </form>
    `;

    const adapter = adapterRegistry.getActiveAdapter('https://boards.greenhouse.io/nasdaq/jobs/999', document);
    const fields = await adapter.scanForm();

    expect(fields.length).toBe(10);
    expect(fields[0].canonicalField).toBe('FIRST_NAME');
    expect(fields[1].canonicalField).toBe('LAST_NAME');
    expect(fields[2].canonicalField).toBe('EMAIL');
    expect(fields[3].canonicalField).toBe('PHONE');
    expect(fields[4].canonicalField).toBe('COLLEGE');
    expect(fields[5].canonicalField).toBe('DEGREE');
    expect(fields[6].canonicalField).toBe('FULL_LOCATION');
    expect(fields[7].canonicalField).toBe('BACKLOGS');
    expect(fields[8].canonicalField).toBe('INTERNSHIP_DURATION');
    expect(fields[9].canonicalField).toBe('CONSENT_DATA_PROTECTION');
  });

  it('detects Lever adapter on jobs.lever.co', () => {
    const adapter = adapterRegistry.getActiveAdapter('https://jobs.lever.co/company/abc', document);
    expect(adapter.name).toBe('Lever Application Form');
  });

  it('detects Workday adapter on myworkdayjobs.com', () => {
    const adapter = adapterRegistry.getActiveAdapter('https://company.myworkdayjobs.com/en-US/careers/job/123', document);
    expect(adapter.name).toBe('Workday Career Portal');
  });

  it('detects LinkedIn adapter on linkedin.com/jobs', () => {
    const adapter = adapterRegistry.getActiveAdapter('https://www.linkedin.com/jobs/view/9999', document);
    expect(adapter.name).toBe('LinkedIn Easy Apply');
  });

  it('detects Ashby adapter on jobs.ashbyhq.com', () => {
    const adapter = adapterRegistry.getActiveAdapter('https://jobs.ashbyhq.com/openai/123-abc', document);
    expect(adapter.name).toBe('Ashby Application Portal');
  });

  it('scans Ashby form inputs and maps canonical fields', async () => {
    document.body.innerHTML = `
      <form class="ashby-application-form">
        <input name="name" type="text" placeholder="Full Name" />
        <input name="email" type="email" placeholder="Email" />
        <input name="phoneNumber" type="tel" placeholder="Phone" />
        <input name="linkedInUrl" type="url" placeholder="LinkedIn Profile" />
        <input name="githubUrl" type="url" placeholder="GitHub URL" />
      </form>
    `;
    const adapter = adapterRegistry.getActiveAdapter('https://jobs.ashbyhq.com/notion/456', document);
    const fields = await adapter.scanForm();

    expect(fields.length).toBe(5);
    expect(fields[0].canonicalField).toBe('FULL_NAME');
    expect(fields[1].canonicalField).toBe('EMAIL');
    expect(fields[2].canonicalField).toBe('PHONE');
    expect(fields[3].canonicalField).toBe('LINKEDIN_URL');
    expect(fields[4].canonicalField).toBe('GITHUB_URL');
  });

  it('detects Google Forms adapter on docs.google.com/forms', () => {
    const adapter = adapterRegistry.getActiveAdapter('https://docs.google.com/forms/d/e/1FAIpQLSc0_xyz/viewform', document);
    expect(adapter.name).toBe('Google Forms');
  });

  it('detects Google Forms adapter with /forms/d/e/ URL pattern', () => {
    const adapter = adapterRegistry.getActiveAdapter('https://docs.google.com/forms/d/e/1FAIpQLSc0_buiBdUrJIDbNYwYeUzXM9US9TzAy1PQxMdd1DEU_cJGCA/viewform', document);
    expect(adapter.name).toBe('Google Forms');
  });

  it('scans Google Forms text inputs and custom radio questions', async () => {
    document.body.innerHTML = `
      <div role="listitem" class="Qr7Oae">
        <div role="heading" class="M7eMe">Name *</div>
        <input type="text" id="gf-name" />
      </div>
      <div role="listitem" class="Qr7Oae">
        <div role="heading" class="M7eMe">Which role are you applying for? *</div>
        <div role="radiogroup">
          <div role="radio" aria-label="SDE 1+ (Full-time)" data-value="SDE 1+ (Full-time)"></div>
          <div role="radio" aria-label="SDE Intern (6 Months)" data-value="SDE Intern (6 Months)"></div>
        </div>
      </div>
    `;

    const adapter = adapterRegistry.getActiveAdapter('https://docs.google.com/forms/d/e/123/viewform', document);
    const fields = await adapter.scanForm();

    expect(fields.length).toBe(2);
    expect(fields[0].label).toBe('Name');
    expect(fields[0].canonicalField).toBe('FULL_NAME');

    expect(fields[1].label).toBe('Which role are you applying for?');
    expect(fields[1].fieldType).toBe('radio');
    expect(fields[1].options?.length).toBe(2);
    expect(fields[1].options?.[0].label).toBe('SDE 1+ (Full-time)');
    expect(fields[1].options?.[1].label).toBe('SDE Intern (6 Months)');
  });

  it('falls back to Generic Web Form for unlisted portal domains', () => {
    const adapter = adapterRegistry.getActiveAdapter('https://startup.io/careers/apply', document);
    expect(adapter.name).toBe('Generic Web Form');
  });
});
