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
