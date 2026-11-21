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

  it('scans Agoda Greenhouse form with education dates, relocation, office attendance, and NOC questions', async () => {
    document.body.innerHTML = `
      <form id="application-form">
        <div class="field">
          <label>Location (City) *</label>
          <input id="candidate-location" name="candidate_location" type="text" />
        </div>
        <div class="field">
          <label>Resume/CV *</label>
          <button type="button">Attach</button>
          <input id="resume" type="file" />
        </div>
        <div class="field">
          <label>Cover Letter</label>
          <button type="button">Attach</button>
          <input id="cover_letter" type="file" />
        </div>
        <div class="field">
          <label>End date month *</label>
          <select name="job_application[answers_attributes][0][end_date_month]">
            <option value="">Select...</option>
            <option value="06">June</option>
          </select>
        </div>
        <div class="field">
          <label>End date year *</label>
          <input name="job_application[answers_attributes][0][end_date_year]" type="text" />
        </div>
        <div class="field">
          <label>The internship is going to be based in the Agoda Gurgaon office. Are you willing to be based here and come to the office at least 2 days a week? *</label>
          <select name="job_application[answers][question_1]">
            <option value="">Select...</option>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </div>
        <div class="field">
          <label>If you are not based in Gurgaon, are you willing to relocate yourself for this internship? *</label>
          <select name="job_application[answers][question_2]">
            <option value="">Select...</option>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </div>
        <div class="field">
          <label>Are your university will be able to provide an "No Objection Certificate" *</label>
          <select name="job_application[answers][question_3]">
            <option value="">Select...</option>
            <option value="1">Yes</option>
            <option value="0">No</option>
          </select>
        </div>
      </form>
    `;

    const adapter = adapterRegistry.getActiveAdapter('https://job-boards.greenhouse.io/agoda/jobs/6323041', document);
    const fields = await adapter.scanForm();

    expect(fields.length).toBe(8);
    expect(fields[0].canonicalField).toBe('CITY');
    expect(fields[1].canonicalField).toBe('RESUME');
    expect(fields[2].canonicalField).toBe('COVER_LETTER');
    expect(fields[3].canonicalField).toBe('END_MONTH');
    expect(fields[4].canonicalField).toBe('END_YEAR');
    expect(fields[5].canonicalField).toBe('IN_OFFICE');
    expect(fields[6].canonicalField).toBe('RELOCATION');
    expect(fields[7].canonicalField).toBe('UNIVERSITY_NOC');
    // Ensure NOC question filtered out placeholder 'Select...' and has options
    expect(fields[7].options?.length).toBe(2);
    expect(fields[7].options?.[0].label).toBe('Yes');
    expect(fields[7].options?.[1].label).toBe('No');
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

  it('detects Zoho Recruit adapter on noct.zohorecruit.in and scans candidate form fields', async () => {
    document.body.innerHTML = `
      <form id="rec_form">
        <div class="rec-field-row">
          <div class="rec-field-label">
            <label>Mobile *</label>
          </div>
          <div class="rec-field-value">
            <input id="rec_form_40797000000003149" name="rec_form_40797000000003149" type="text" />
          </div>
        </div>
        <div class="rec-field-row">
          <div class="rec-field-label">
            <label>Portfolio (BD, Web Operator and Founder's office candidates can add their linkedin or professional profiles) * (?)</label>
          </div>
          <div class="rec-field-value">
            <input id="rec_form_40797000000003151" name="rec_form_40797000000003151" type="text" />
          </div>
        </div>
        <div class="rec-field-row">
          <div class="rec-field-label">
            <label>LinkedIn(Duplicate)</label>
          </div>
          <div class="rec-field-value">
            <input id="rec_form_40797000000003155" name="rec_form_40797000000003155" type="text" />
          </div>
        </div>
        <div class="rec-field-row">
          <div class="rec-field-label">
            <label>Why NOCT? *</label>
          </div>
          <div class="rec-field-value">
            <textarea id="rec_form_40797000000003157" name="rec_form_40797000000003157"></textarea>
          </div>
        </div>
        <div class="rec-field-row">
          <div class="rec-field-label">
            <label>About You *</label>
          </div>
          <div class="rec-field-value">
            <textarea id="rec_form_40797000000003159" name="rec_form_40797000000003159"></textarea>
          </div>
        </div>
        <div class="rec-field-row">
          <div class="rec-field-label">
            <label>Are you willing to relocate to Panchgani? *</label>
          </div>
          <div class="rec-field-value">
            <select id="rec_form_40797000000003161" name="rec_form_40797000000003161">
              <option value="">-None-</option>
              <option value="Yes">Yes</option>
              <option value="No">No</option>
            </select>
          </div>
        </div>
      </form>
    `;

    const adapter = adapterRegistry.getActiveAdapter('https://noct.zohorecruit.in/jobs/Careers/40797000006703001', document);
    expect(adapter.name).toBe('Zoho Recruit');

    const fields = await adapter.scanForm();
    expect(fields.length).toBe(6);

    expect(fields[0].label).toBe('Mobile');
    expect(fields[0].canonicalField).toBe('PHONE');
    expect(fields[0].status).toBe('MATCHED');

    expect(fields[1].label).toBe("Portfolio (BD, Web Operator and Founder's office candidates can add their linkedin or professional profiles)");
    expect(fields[1].canonicalField).toBe('PORTFOLIO_URL');
    expect(fields[1].status).toBe('MATCHED');

    expect(fields[2].label).toBe('LinkedIn(Duplicate)');
    expect(fields[2].canonicalField).toBe('LINKEDIN_URL');
    expect(fields[2].status).toBe('MATCHED');

    expect(fields[3].label).toBe('Why NOCT?');
    expect(fields[3].status).toBe('NEEDS_REVIEW');

    expect(fields[4].label).toBe('About You');
    expect(fields[4].status).toBe('NEEDS_REVIEW');

    expect(fields[5].label).toBe('Are you willing to relocate to Panchgani?');
    expect(fields[5].canonicalField).toBe('RELOCATION');
    expect(fields[5].status).toBe('MATCHED');
    expect(fields[5].options?.length).toBe(2); // '-None-' filtered out
  });

  it('scans Vivusoft Zoho Recruit form with title salutation, name, email, phone, street and city', async () => {
    document.body.innerHTML = `
      <form id="rec_form">
        <div class="cw-field-row form-row">
          <div class="col-sm-3">
            <label class="rec-label">First Name *</label>
          </div>
          <div class="col-sm-9">
            <select id="rec_form_54486000000003149" name="rec_form_54486000000003149">
              <option value="">-None-</option>
              <option value="Mr.">Mr.</option>
              <option value="Ms.">Ms.</option>
            </select>
            <input id="rec_form_54486000000003151" name="rec_form_54486000000003151" type="text" />
          </div>
        </div>
        <div class="cw-field-row form-row">
          <div class="col-sm-3">
            <label class="rec-label">Last Name *</label>
          </div>
          <div class="col-sm-9">
            <input id="rec_form_54486000000003155" name="rec_form_54486000000003155" type="text" />
          </div>
        </div>
        <div class="cw-field-row form-row">
          <div class="col-sm-3">
            <label class="rec-label">Email *</label>
          </div>
          <div class="col-sm-9">
            <input id="rec_form_54486000000003157" name="rec_form_54486000000003157" type="email" />
          </div>
        </div>
        <div class="cw-field-row form-row">
          <div class="col-sm-3">
            <label class="rec-label">Mobile *</label>
          </div>
          <div class="col-sm-9">
            <input id="rec_form_dial" placeholder="Search country with dial code" type="text" />
            <input id="rec_form_54486000000003159" name="rec_form_54486000000003159" type="text" />
          </div>
        </div>
        <div class="cw-field-row form-row">
          <div class="col-sm-3">
            <label class="rec-label">Street</label>
          </div>
          <div class="col-sm-9">
            <input id="rec_form_54486000000003163" name="rec_form_54486000000003163" type="text" />
          </div>
        </div>
        <div class="cw-field-row form-row">
          <div class="col-sm-3">
            <label class="rec-label">City *</label>
          </div>
          <div class="col-sm-9">
            <input id="rec_form_54486000000003165" name="rec_form_54486000000003165" type="text" />
          </div>
        </div>
      </form>
    `;

    const adapter = adapterRegistry.getActiveAdapter('https://vivusoft.zohorecruit.in/jobs/Careers/544860000003329001', document);
    expect(adapter.name).toBe('Zoho Recruit');

    const fields = await adapter.scanForm();
    expect(fields.length).toBe(7);

    // Title select
    expect(fields[0].label).toBe('Title');

    // First Name input
    expect(fields[1].label).toBe('First Name');
    expect(fields[1].canonicalField).toBe('FIRST_NAME');
    expect(fields[1].status).toBe('MATCHED');

    // Last Name input
    expect(fields[2].label).toBe('Last Name');
    expect(fields[2].canonicalField).toBe('LAST_NAME');
    expect(fields[2].status).toBe('MATCHED');

    // Email input
    expect(fields[3].label).toBe('Email');
    expect(fields[3].canonicalField).toBe('EMAIL');
    expect(fields[3].status).toBe('MATCHED');

    // Mobile input (dial code search filter is cleanly skipped from candidate fields)
    expect(fields[4].label).toBe('Mobile');
    expect(fields[4].canonicalField).toBe('PHONE');
    expect(fields[4].status).toBe('MATCHED');

    // Street input
    expect(fields[5].label).toBe('Street');
    expect(fields[5].canonicalField).toBe('ADDRESS');
    expect(fields[5].status).toBe('MATCHED');

    // City input
    expect(fields[6].label).toBe('City');
    expect(fields[6].canonicalField).toBe('CITY');
    expect(fields[6].status).toBe('MATCHED');
  });
});
