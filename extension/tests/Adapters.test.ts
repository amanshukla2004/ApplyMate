import { describe, it, expect } from 'vitest';
import { adapterRegistry } from '../src/adapters/adapterRegistry';

describe('AdapterRegistry', () => {
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

  it('falls back to Generic Web Form for unlisted portal domains', () => {
    const adapter = adapterRegistry.getActiveAdapter('https://startup.io/careers/apply', document);
    expect(adapter.name).toBe('Generic Web Form');
  });
});
